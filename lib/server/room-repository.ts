import "server-only";

import type { PlayerSession, Room } from "@/lib/game/types";
import { PRESENCE_DISCONNECT_GRACE } from "@/lib/game/constants";
import { assertProductionDatabaseConfigured } from "./database";

export { RoomRepositoryError } from "./room-repository-error";

type RoomMutation = (room: Room, playerId: string) => Room;
type RoomJoin = (room: Room, session: PlayerSession) => Room;

const HOUR = 60 * 60 * 1000;
const DEFAULT_ACTIVE_RETENTION_HOURS = 24;
const DEFAULT_FINISHED_RETENTION_HOURS = 24 * 7;
const DEFAULT_CLEANUP_INTERVAL_MINUTES = 15;

let lastCleanupAt = 0;

function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getAdapter() {
  assertProductionDatabaseConfigured();

  return isPostgresConfigured()
    ? import("./room-repository-postgres")
    : import("./room-repository-sqlite");
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
