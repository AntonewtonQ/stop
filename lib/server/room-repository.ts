import "server-only";

import type { PlayerSession, Room } from "@/lib/game/types";
import { PRESENCE_DISCONNECT_GRACE } from "@/lib/game/constants";
import * as postgres from "./room-repository-postgres";
import * as sqlite from "./room-repository-sqlite";

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

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getRoom(code: string) {
  return isPostgresConfigured() ? postgres.getRoom(code) : sqlite.getRoom(code);
}

export async function createStoredRoom(room: Room, hostToken: string) {
  return withAutomaticCleanup(() =>
    isPostgresConfigured()
      ? postgres.createStoredRoom(room, hostToken)
      : sqlite.createStoredRoom(room, hostToken),
  );
}

export async function joinStoredRoom(
  code: string,
  session: PlayerSession,
  join: RoomJoin,
) {
  return withAutomaticCleanup(() =>
    isPostgresConfigured()
      ? postgres.joinStoredRoom(code, session, join)
      : sqlite.joinStoredRoom(code, session, join),
  );
}

export async function mutateStoredRoom(
  code: string,
  playerId: string,
  token: string,
  mutate: RoomMutation,
) {
  return withAutomaticCleanup(() =>
    isPostgresConfigured()
      ? postgres.mutateStoredRoom(code, playerId, token, mutate)
      : sqlite.mutateStoredRoom(code, playerId, token, mutate),
  );
}

export async function authenticatePlayer(
  code: string,
  playerId: string,
  token: string,
) {
  return isPostgresConfigured()
    ? postgres.authenticatePlayer(code, playerId, token)
    : sqlite.authenticatePlayer(code, playerId, token);
}

export async function updateStoredPresence(
  code: string,
  playerId: string,
  token: string,
  isOnline: boolean,
) {
  return withAutomaticCleanup(() =>
    isPostgresConfigured()
      ? postgres.updateStoredPresence(code, playerId, token, isOnline)
      : sqlite.updateStoredPresence(code, playerId, token, isOnline),
  );
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

  return isPostgresConfigured()
    ? postgres.deleteExpiredRooms(...args)
    : sqlite.deleteExpiredRooms(...args);
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
