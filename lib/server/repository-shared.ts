import "server-only";

import { createHash } from "node:crypto";

import type { Room } from "@/lib/game/types";

/** Helpers shared by the SQLite, PostgreSQL and Turso room repositories. */

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

export function nullableNumber(
  value: string | number | bigint | null | undefined,
) {
  return value === null || value === undefined ? null : Number(value);
}

/**
 * Cheap snapshot of a room used by realtime watchers to detect changes made
 * by other server instances without loading the whole room.
 */
export type RoomSignature = {
  status: Room["status"];
  roundNumber: number | null;
  updatedAt: number;
};

export type RoomSignatureRow = {
  status: Room["status"];
  current_round_number: string | number | bigint | null;
  updated_at: string | number | bigint;
};

export const ROOM_SIGNATURE_SQL =
  "SELECT status, current_round_number, updated_at FROM rooms WHERE code = ";

export function toRoomSignature(
  row: RoomSignatureRow | null | undefined,
): RoomSignature | null {
  if (!row) return null;

  return {
    status: row.status,
    roundNumber: nullableNumber(row.current_round_number),
    updatedAt: Number(row.updated_at),
  };
}
