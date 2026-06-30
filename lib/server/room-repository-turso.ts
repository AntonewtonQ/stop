import "server-only";

import { createHash } from "node:crypto";
import type { Client, InArgs, ResultSet, Transaction } from "@libsql/client";

import { DEFAULT_AVATAR_ID, isAvatarId } from "@/lib/game/avatars";
import { PRESENCE_DISCONNECT_GRACE } from "@/lib/game/constants";
import {
  normalizeRoom,
  reconcileRoomPresence,
} from "@/lib/game/engine";
import {
  DEFAULT_PROFILE_COLOR,
  isProfileColor,
} from "@/lib/game/profile-colors";
import type { PlayerSession, Room, RoundState } from "@/lib/game/types";
import { ensureTursoSchema, getTursoClient } from "./database-turso";
import { RoomRepositoryError } from "./room-repository-error";

type TursoQueryable = Pick<Client | Transaction, "execute">;

type RoomRow = {
  code: string;
  host_id: string;
  status: Room["status"];
  categories_json: string;
  round_duration: number;
  rounds_to_play: number;
  rounds_customized: number;
  commander_order_json: string;
  current_round_number: number | null;
  updated_at: number;
};

type PlayerRow = {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar_id: string;
  is_host: number;
  is_online: number;
  last_seen_at: number;
  joined_at: number;
};

type RoundRow = {
  number: number;
  commander_id: string;
  letter: string;
  started_at: number;
  duration: number;
  stopped_at: number | null;
  stopped_by: string | null;
  result_json: string | null;
};

type AnswerRow = {
  round_number: number;
  player_id: string;
  category: string;
  answer: string;
};

type ListRoomsOptions = {
  since?: number;
  limit?: number;
};

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function number(value: string | number | bigint | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

function boolean(value: string | number | bigint | null | undefined) {
  return Boolean(number(value));
}

async function query<T>(
  database: TursoQueryable,
  sql: string,
  args: InArgs = [],
) {
  const result = await database.execute({ sql, args });
  return result.rows as unknown as T[];
}

async function queryOne<T>(
  database: TursoQueryable,
  sql: string,
  args: InArgs = [],
) {
  return (await query<T>(database, sql, args))[0];
}

async function execute(
  database: TursoQueryable,
  sql: string,
  args: InArgs = [],
): Promise<ResultSet> {
  return database.execute({ sql, args });
}

async function withTransaction<T>(
  operation: (database: Transaction) => Promise<T>,
) {
  await ensureTursoSchema();
  const transaction = await getTursoClient().transaction("write");

  try {
    const result = await operation(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    if (!transaction.closed) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Turso rollback failed.", rollbackError);
      }
    }
    throw error;
  } finally {
    if (!transaction.closed) transaction.close();
  }
}

async function getRoomFrom(database: TursoQueryable, code: string) {
  const roomRow = await queryOne<RoomRow>(
    database,
    "SELECT * FROM rooms WHERE code = ?",
    [code],
  );

  if (!roomRow) return null;

  const players = await query<PlayerRow>(
    database,
    "SELECT * FROM players WHERE room_code = ? ORDER BY position",
    [code],
  );
  const roundRows = await query<RoundRow>(
    database,
    "SELECT * FROM rounds WHERE room_code = ? ORDER BY number",
    [code],
  );
  const answerRows = await query<AnswerRow>(
    database,
    `SELECT round_number, player_id, category, answer
     FROM answers WHERE room_code = ?`,
    [code],
  );

  const rounds = roundRows.map((roundRow) => {
    const answers: RoundState["answers"] = {};

    for (const answerRow of answerRows) {
      if (Number(answerRow.round_number) !== Number(roundRow.number)) continue;
      answers[answerRow.player_id] = {
        ...(answers[answerRow.player_id] ?? {}),
        [answerRow.category]: answerRow.answer,
      };
    }

    return {
      number: Number(roundRow.number),
      commanderId: roundRow.commander_id,
      letter: roundRow.letter,
      startedAt: Number(roundRow.started_at),
      duration: Number(roundRow.duration),
      stoppedAt: number(roundRow.stopped_at),
      stoppedBy: roundRow.stopped_by,
      answers,
      result: roundRow.result_json
        ? parseJson<RoundState["result"]>(roundRow.result_json)
        : null,
    } satisfies RoundState;
  });

  return normalizeRoom({
    code: roomRow.code,
    hostId: roomRow.host_id,
    status: roomRow.status,
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      initials: player.initials,
      color: isProfileColor(player.color)
        ? player.color
        : DEFAULT_PROFILE_COLOR,
      avatarId: isAvatarId(player.avatar_id)
        ? player.avatar_id
        : DEFAULT_AVATAR_ID,
      isHost: boolean(player.is_host),
      isOnline: boolean(player.is_online),
      lastSeenAt: Number(player.last_seen_at),
      joinedAt: Number(player.joined_at),
    })),
    commanderOrder: parseJson<string[]>(roomRow.commander_order_json),
    settings: {
      categories: parseJson<string[]>(roomRow.categories_json),
      roundDuration: Number(roomRow.round_duration),
      roundsToPlay: Number(roomRow.rounds_to_play),
      roundsCustomized: boolean(roomRow.rounds_customized),
    },
    round:
      rounds.find(
        (round) => round.number === Number(roomRow.current_round_number),
      ) ?? null,
    history: rounds.filter((round) => round.result !== null),
    updatedAt: Number(roomRow.updated_at),
  });
}

export async function getRoom(code: string) {
  await ensureTursoSchema();
  return getRoomFrom(getTursoClient(), code);
}

export async function listRoomsForInsights({
  since,
  limit = 1000,
}: ListRoomsOptions = {}) {
  await ensureTursoSchema();
  const database = getTursoClient();
  const safeLimit = Math.max(1, Math.min(limit, 5000));
  const rows =
    since === undefined
      ? await query<{ code: string }>(
          database,
          "SELECT code FROM rooms ORDER BY updated_at DESC LIMIT ?",
          [safeLimit],
        )
      : await query<{ code: string }>(
          database,
          `SELECT code FROM rooms
           WHERE updated_at >= ?
           ORDER BY updated_at DESC
           LIMIT ?`,
          [since, safeLimit],
        );
  const rooms: Room[] = [];

  for (const row of rows) {
    const room = await getRoomFrom(database, row.code);
    if (room) rooms.push(room);
  }

  return rooms;
}

async function persistRoom(
  database: TursoQueryable,
  room: Room,
  sessionTokens: Record<string, string> = {},
) {
  const persistedRoom = { ...room, updatedAt: Date.now() };
  const existingTokenRows = await query<{ id: string; session_token: string }>(
    database,
    "SELECT id, session_token FROM players WHERE room_code = ?",
    [room.code],
  );
  const existingTokens = Object.fromEntries(
    existingTokenRows.map((row) => [row.id, row.session_token]),
  );

  await execute(
    database,
    `INSERT INTO rooms (
      code, host_id, status, categories_json, round_duration, rounds_to_play,
      rounds_customized, commander_order_json, current_round_number, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      host_id = excluded.host_id,
      status = excluded.status,
      categories_json = excluded.categories_json,
      round_duration = excluded.round_duration,
      rounds_to_play = excluded.rounds_to_play,
      rounds_customized = excluded.rounds_customized,
      commander_order_json = excluded.commander_order_json,
      current_round_number = excluded.current_round_number,
      updated_at = excluded.updated_at`,
    [
      persistedRoom.code,
      persistedRoom.hostId,
      persistedRoom.status,
      JSON.stringify(persistedRoom.settings.categories),
      persistedRoom.settings.roundDuration,
      persistedRoom.settings.roundsToPlay,
      persistedRoom.settings.roundsCustomized ? 1 : 0,
      JSON.stringify(persistedRoom.commanderOrder),
      persistedRoom.round?.number ?? null,
      persistedRoom.updatedAt,
    ],
  );

  await execute(database, "DELETE FROM players WHERE room_code = ?", [room.code]);

  for (const [position, player] of persistedRoom.players.entries()) {
    const token = sessionTokens[player.id]
      ? hashToken(sessionTokens[player.id])
      : existingTokens[player.id];
    if (!token) {
      throw new RoomRepositoryError(
        "A tua sessão expirou. Volta a entrar na sala.",
        401,
      );
    }

    await execute(
      database,
      `INSERT INTO players (
        id, room_code, session_token, name, initials, color, avatar_id, is_host,
        is_online, last_seen_at, joined_at, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        player.id,
        persistedRoom.code,
        token,
        player.name,
        player.initials,
        player.color,
        player.avatarId,
        player.isHost ? 1 : 0,
        player.isOnline ? 1 : 0,
        player.lastSeenAt,
        player.joinedAt,
        position,
      ],
    );
  }

  await execute(database, "DELETE FROM rounds WHERE room_code = ?", [room.code]);

  const roundMap = new Map<number, RoundState>();
  for (const round of persistedRoom.history) roundMap.set(round.number, round);
  if (persistedRoom.round) {
    roundMap.set(persistedRoom.round.number, persistedRoom.round);
  }

  for (const round of [...roundMap.values()].sort((a, b) => a.number - b.number)) {
    await execute(
      database,
      `INSERT INTO rounds (
        room_code, number, commander_id, letter, started_at, duration,
        stopped_at, stopped_by, result_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        persistedRoom.code,
        round.number,
        round.commanderId,
        round.letter,
        round.startedAt,
        round.duration,
        round.stoppedAt,
        round.stoppedBy,
        round.result ? JSON.stringify(round.result) : null,
      ],
    );

    for (const [playerId, playerAnswers] of Object.entries(round.answers)) {
      for (const [category, answer] of Object.entries(playerAnswers)) {
        const score = round.result?.players[playerId]?.answers[category];
        await execute(
          database,
          `INSERT INTO answers (
            room_code, round_number, player_id, category, answer, points,
            score_status, validation_status, challenge_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            persistedRoom.code,
            round.number,
            playerId,
            category,
            answer,
            score?.points ?? null,
            score?.status ?? null,
            score?.validation ?? null,
            score?.challengeId ?? null,
          ],
        );
      }
    }

    for (const challenge of Object.values(round.result?.challenges ?? {})) {
      await execute(
        database,
        `INSERT INTO challenges (
          room_code, round_number, id, category, answer, normalized_answer,
          status, player_ids_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          persistedRoom.code,
          round.number,
          challenge.id,
          challenge.category,
          challenge.answer,
          challenge.normalizedAnswer,
          challenge.status,
          JSON.stringify(challenge.playerIds),
        ],
      );

      for (const [playerId, vote] of Object.entries(challenge.votes)) {
        await execute(
          database,
          `INSERT INTO votes (
            room_code, round_number, challenge_id, player_id, vote
          ) VALUES (?, ?, ?, ?, ?)`,
          [persistedRoom.code, round.number, challenge.id, playerId, vote],
        );
      }
    }
  }

  return persistedRoom;
}

async function authenticateWith(
  database: TursoQueryable,
  code: string,
  playerId: string,
  token: string,
) {
  const player = await queryOne<{ id: string }>(
    database,
    `SELECT id FROM players
     WHERE room_code = ? AND id = ? AND session_token = ?`,
    [code, playerId, hashToken(token)],
  );

  if (!player) {
    throw new RoomRepositoryError(
      "A tua sessão expirou. Volta a entrar na sala.",
      401,
    );
  }
}

export function createStoredRoom(room: Room, hostToken: string) {
  return withTransaction(async (database) => {
    if (await getRoomFrom(database, room.code)) {
      throw new RoomRepositoryError(
        "Este código já pertence a outra sala. Tenta novamente.",
        409,
      );
    }

    return persistRoom(database, room, { [room.hostId]: hostToken });
  });
}

export function joinStoredRoom(
  code: string,
  session: PlayerSession,
  join: (room: Room, session: PlayerSession) => Room,
) {
  return withTransaction(async (database) => {
    const room = await getRoomFrom(database, code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const existingPlayer = room.players.find((player) => player.id === session.id);
    if (existingPlayer) {
      await authenticateWith(database, code, session.id, session.token);
      return room;
    }

    const nextRoom = join(room, session);
    if (nextRoom === room) {
      throw new RoomRepositoryError("Não podes entrar nesta sala agora.", 409);
    }

    return persistRoom(database, nextRoom, { [session.id]: session.token });
  });
}

export function mutateStoredRoom(
  code: string,
  playerId: string,
  token: string,
  mutate: (room: Room, playerId: string) => Room,
) {
  return withTransaction(async (database) => {
    await authenticateWith(database, code, playerId, token);
    const room = await getRoomFrom(database, code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const nextRoom = mutate(room, playerId);
    if (nextRoom === room) {
      throw new RoomRepositoryError("Esta acção já não está disponível.", 409);
    }

    return persistRoom(database, nextRoom);
  });
}

export async function authenticatePlayer(
  code: string,
  playerId: string,
  token: string,
) {
  await ensureTursoSchema();
  await authenticateWith(getTursoClient(), code, playerId, token);
  return true;
}

export function updateStoredPresence(
  code: string,
  playerId: string,
  token: string,
  isOnline: boolean,
) {
  return withTransaction(async (database) => {
    await authenticateWith(database, code, playerId, token);

    const previous = await queryOne<{ is_online: number }>(
      database,
      "SELECT is_online FROM players WHERE room_code = ? AND id = ?",
      [code, playerId],
    );
    const now = Date.now();

    if (isOnline) {
      await execute(
        database,
        `UPDATE players SET is_online = 1, last_seen_at = ?
         WHERE room_code = ? AND id = ?`,
        [now, code, playerId],
      );
    } else {
      await execute(
        database,
        `UPDATE players SET last_seen_at = ?
         WHERE room_code = ? AND id = ?`,
        [now, code, playerId],
      );
    }

    const stalePlayers = await execute(
      database,
      `UPDATE players
       SET is_online = 0
       WHERE room_code = ? AND is_online = 1 AND last_seen_at < ?`,
      [code, now - PRESENCE_DISCONNECT_GRACE],
    );

    const room = await getRoomFrom(database, code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const reconciledRoom = reconcileRoomPresence(room);
    const leadershipChanged = reconciledRoom !== room;
    const nextRoom = leadershipChanged
      ? await persistRoom(database, reconciledRoom)
      : room;

    return {
      room: nextRoom,
      changed:
        (isOnline && !boolean(previous?.is_online)) ||
        stalePlayers.rowsAffected > 0 ||
        leadershipChanged,
    };
  });
}

export async function deleteExpiredRooms(
  activeCutoff: number,
  finishedCutoff: number,
  onlineCutoff: number,
) {
  await ensureTursoSchema();
  const result = await execute(
    getTursoClient(),
    `DELETE FROM rooms
     WHERE (
       (status = 'finished' AND updated_at < ?)
       OR (status <> 'finished' AND updated_at < ?)
     )
     AND NOT EXISTS (
       SELECT 1
       FROM players
       WHERE players.room_code = rooms.code
         AND players.is_online = 1
         AND players.last_seen_at >= ?
     )`,
    [finishedCutoff, activeCutoff, onlineCutoff],
  );
  return result.rowsAffected;
}
