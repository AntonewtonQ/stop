import "server-only";

import { getPortableExecutor } from "./portable-sql";

/** Short-lived emoji reactions shown on the results screen. */

export const REACTION_EMOJIS = ["🔥", "😂", "👏", "😮", "💀", "🤯"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type RoomReaction = {
  id: string;
  playerId: string;
  emoji: string;
  createdAt: number;
};

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS room_reactions (
    id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL,
    player_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS room_reactions_room_idx ON room_reactions (room_code, created_at)",
];

const getExecutor = () => getPortableExecutor("reactions", SCHEMA);

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return REACTION_EMOJIS.includes(value as ReactionEmoji);
}

export async function addRoomReaction(input: {
  roomCode: string;
  playerId: string;
  emoji: ReactionEmoji;
  createdAt: number;
}) {
  const executor = await getExecutor();
  const id = crypto.randomUUID();
  await executor.run(
    `INSERT INTO room_reactions (id, room_code, player_id, emoji, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.roomCode, input.playerId, input.emoji, input.createdAt],
  );
  return { id, playerId: input.playerId, emoji: input.emoji, createdAt: input.createdAt };
}

export async function listRoomReactions(roomCode: string, since: number, limit = 30) {
  const executor = await getExecutor();
  const rows = await executor.all(
    `SELECT id, player_id, emoji, created_at FROM room_reactions
     WHERE room_code = ? AND created_at > ?
     ORDER BY created_at ASC LIMIT ?`,
    [roomCode, since, limit],
  );
  return rows.map<RoomReaction>((row) => ({
    id: String(row.id),
    playerId: String(row.player_id),
    emoji: String(row.emoji),
    createdAt: Number(row.created_at),
  }));
}

export async function deleteReactionsBefore(timestamp: number) {
  const executor = await getExecutor();
  return executor.run("DELETE FROM room_reactions WHERE created_at < ?", [timestamp]);
}
