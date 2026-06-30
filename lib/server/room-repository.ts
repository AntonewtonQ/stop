import "server-only";

import { saveRoundAnswers as saveRoundAnswersInMemory } from "@/lib/game/engine";
import type { PlayerSession, Room, RoundAnswers } from "@/lib/game/types";
import { PRESENCE_DISCONNECT_GRACE } from "@/lib/game/constants";
import {
  buildAdminDashboardStats,
  buildWeeklyRankingSnapshot,
  weeklyWindowStart,
} from "@/lib/server/admin-insights";
import { getRecentServerErrors } from "@/lib/server/admin-events";
import {
  assertProductionDatabaseConfigured,
  getConfiguredDatabaseDriver,
} from "./database";

export { RoomRepositoryError } from "./room-repository-error";

type RoomMutation = (room: Room, playerId: string) => Room;
type RoomJoin = (room: Room, session: PlayerSession) => Room;
type PresenceLightResult = {
  code: string;
  changed: boolean;
  updatedAt: number;
};
type PresenceLightAdapter = {
  updateStoredPresenceLight: (
    code: string,
    playerId: string,
    token: string,
    isOnline: boolean,
  ) => Promise<PresenceLightResult> | PresenceLightResult;
};
type SaveAnswersAdapter = {
  saveStoredRoundAnswers: (
    code: string,
    playerId: string,
    token: string,
    answers: RoundAnswers,
  ) => Promise<Room> | Room;
};

const HOUR = 60 * 60 * 1000;
const DEFAULT_ACTIVE_RETENTION_HOURS = 24;
const DEFAULT_FINISHED_RETENTION_HOURS = 24 * 7;
const DEFAULT_CLEANUP_INTERVAL_MINUTES = 15;

let lastCleanupAt = 0;

function getAdapter() {
  assertProductionDatabaseConfigured();

  switch (getConfiguredDatabaseDriver()) {
    case "turso":
      return import("./room-repository-turso");
    case "postgresql":
      return import("./room-repository-postgres");
    case "sqlite":
      return import("./room-repository-sqlite");
  }
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasLightPresenceAdapter(adapter: unknown): adapter is PresenceLightAdapter {
  return (
    typeof (adapter as PresenceLightAdapter).updateStoredPresenceLight ===
    "function"
  );
}

function hasSaveAnswersAdapter(adapter: unknown): adapter is SaveAnswersAdapter {
  return (
    typeof (adapter as SaveAnswersAdapter).saveStoredRoundAnswers ===
    "function"
  );
}

export async function getRoom(code: string) {
  const adapter = await getAdapter();
  return adapter.getRoom(code);
}

export async function createStoredRoom(room: Room, hostToken: string) {
  return withAutomaticCleanup(async () => {
    const adapter = await getAdapter();
    return adapter.createStoredRoom(room, hostToken);
  });
}

export async function joinStoredRoom(
  code: string,
  session: PlayerSession,
  join: RoomJoin,
) {
  return withAutomaticCleanup(async () => {
    const adapter = await getAdapter();
    return adapter.joinStoredRoom(code, session, join);
  });
}

export async function mutateStoredRoom(
  code: string,
  playerId: string,
  token: string,
  mutate: RoomMutation,
) {
  return withAutomaticCleanup(async () => {
    const adapter = await getAdapter();
    return adapter.mutateStoredRoom(code, playerId, token, mutate);
  });
}

export async function saveStoredRoundAnswers(
  code: string,
  playerId: string,
  token: string,
  answers: RoundAnswers,
) {
  return withAutomaticCleanup(async () => {
    const adapter = await getAdapter();
    if (hasSaveAnswersAdapter(adapter)) {
      return adapter.saveStoredRoundAnswers(code, playerId, token, answers);
    }

    return adapter.mutateStoredRoom(code, playerId, token, (room, actorId) =>
      saveRoundAnswersInMemory(room, actorId, answers),
    );
  });
}

export async function authenticatePlayer(
  code: string,
  playerId: string,
  token: string,
) {
  const adapter = await getAdapter();
  return adapter.authenticatePlayer(code, playerId, token);
}

export async function updateStoredPresence(
  code: string,
  playerId: string,
  token: string,
  isOnline: boolean,
) {
  return withAutomaticCleanup(async () => {
    const adapter = await getAdapter();
    return adapter.updateStoredPresence(code, playerId, token, isOnline);
  });
}

export async function updateStoredPresenceLight(
  code: string,
  playerId: string,
  token: string,
  isOnline: boolean,
) {
  return withAutomaticCleanup(async () => {
    const adapter = await getAdapter();
    if (hasLightPresenceAdapter(adapter)) {
      return adapter.updateStoredPresenceLight(code, playerId, token, isOnline);
    }

    const { room, changed } = await adapter.updateStoredPresence(
      code,
      playerId,
      token,
      isOnline,
    );
    return { code: room.code, changed, updatedAt: room.updatedAt };
  });
}

export async function getWeeklyRanking(now = Date.now()) {
  const adapter = await getAdapter();
  const rooms = await adapter.listRoomsForInsights({
    since: weeklyWindowStart(now),
    limit: 1000,
  });

  return buildWeeklyRankingSnapshot(rooms, now);
}

export async function getAdminDashboardStats(now = Date.now()) {
  const adapter = await getAdapter();
  const rooms = await adapter.listRoomsForInsights({ limit: 1000 });

  return buildAdminDashboardStats({
    rooms,
    database: getConfiguredDatabaseDriver(),
    recentErrors: getRecentServerErrors(),
    now,
  });
}

export async function cleanupExpiredRooms(now = Date.now()) {
  const activeRetention =
    positiveNumber(
      process.env.ROOM_RETENTION_ACTIVE_HOURS,
      DEFAULT_ACTIVE_RETENTION_HOURS,
    ) * HOUR;
  const finishedRetention =
    positiveNumber(
      process.env.ROOM_RETENTION_FINISHED_HOURS,
      DEFAULT_FINISHED_RETENTION_HOURS,
    ) * HOUR;
  const args = [
    now - activeRetention,
    now - finishedRetention,
    now - PRESENCE_DISCONNECT_GRACE,
  ] as const;

  const adapter = await getAdapter();
  return adapter.deleteExpiredRooms(...args);
}

async function withAutomaticCleanup<T>(operation: () => Promise<T> | T) {
  const result = await operation();
  const interval =
    positiveNumber(
      process.env.ROOM_CLEANUP_INTERVAL_MINUTES,
      DEFAULT_CLEANUP_INTERVAL_MINUTES,
    ) *
    60 *
    1000;
  const now = Date.now();

  if (now - lastCleanupAt >= interval) {
    lastCleanupAt = now;
    void cleanupExpiredRooms(now).catch((error) => {
      console.error("Automatic room cleanup failed.", error);
    });
  }

  return result;
}
