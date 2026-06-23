import "server-only";

import { createHash } from "node:crypto";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

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
import {
  connectPostgres,
  ensurePostgresSchema,
  getPostgresPool,
  withPostgresRetry,
} from "./database-postgres";
import { RoomRepositoryError } from "./room-repository-error";

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
};

type RoomRow = {
  code: string;
  host_id: string;
  status: Room["status"];
  categories_json: string[] | string;
  round_duration: number;
  rounds_to_play: number;
  rounds_customized: boolean;
  commander_order_json: string[] | string;
  current_round_number: number | null;
  updated_at: string | number;
};

type PlayerRow = {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar_id: string;
  is_host: boolean;
  is_online: boolean;
  last_seen_at: string | number;
  joined_at: string | number;
};

type RoundRow = {
  number: number;
  commander_id: string;
  letter: string;
  started_at: string | number;
  duration: number;
  stopped_at: string | number | null;
  stopped_by: string | null;
  result_json: RoundState["result"] | string | null;
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

function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function number(value: string | number | null) {
  return value === null ? null : Number(value);
}

async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
) {
  await ensurePostgresSchema();
  const client = await connectPostgres();

  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("PostgreSQL rollback failed.", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function getRoomFrom(database: Queryable, code: string) {
  const roomResult = await database.query<RoomRow>(
    "SELECT * FROM rooms WHERE code = $1",
    [code],
  );
  const roomRow = roomResult.rows[0];
  if (!roomRow) return null;

  // PoolClient only supports one active query at a time, so these must remain
  // sequential while getRoomFrom is used inside a transaction.
  const playerResult = await database.query<PlayerRow>(
    "SELECT * FROM players WHERE room_code = $1 ORDER BY position",
    [code],
  );
  const roundResult = await database.query<RoundRow>(
    "SELECT * FROM rounds WHERE room_code = $1 ORDER BY number",
    [code],
  );
  const answerResult = await database.query<AnswerRow>(
    `SELECT round_number, player_id, category, answer
     FROM answers WHERE room_code = $1`,
    [code],
  );

  const rounds = roundResult.rows.map((roundRow) => {
    const answers: RoundState["answers"] = {};

    for (const answerRow of answerResult.rows) {
      if (answerRow.round_number !== roundRow.number) continue;
      answers[answerRow.player_id] = {
        ...(answers[answerRow.player_id] ?? {}),
        [answerRow.category]: answerRow.answer,
      };
    }

    return {
      number: roundRow.number,
      commanderId: roundRow.commander_id,
      letter: roundRow.letter,
      startedAt: Number(roundRow.started_at),
      duration: roundRow.duration,
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
    players: playerResult.rows.map((player) => ({
      id: player.id,
      name: player.name,
      initials: player.initials,
      color: isProfileColor(player.color)
        ? player.color
        : DEFAULT_PROFILE_COLOR,
      avatarId: isAvatarId(player.avatar_id)
        ? player.avatar_id
        : DEFAULT_AVATAR_ID,
      isHost: player.is_host,
      isOnline: player.is_online,
      lastSeenAt: Number(player.last_seen_at),
      joinedAt: Number(player.joined_at),
    })),
    commanderOrder: parseJson<string[]>(roomRow.commander_order_json),
    settings: {
      categories: parseJson<string[]>(roomRow.categories_json),
      roundDuration: roomRow.round_duration,
      roundsToPlay: roomRow.rounds_to_play,
      roundsCustomized: roomRow.rounds_customized,
    },
    round:
      rounds.find((round) => round.number === roomRow.current_round_number) ??
      null,
    history: rounds.filter((round) => round.result !== null),
    updatedAt: Number(roomRow.updated_at),
  });
}

export async function getRoom(code: string) {
  await ensurePostgresSchema();
  return withPostgresRetry(() => getRoomFrom(getPostgresPool(), code));
}

export async function listRoomsForInsights({
  since,
  limit = 1000,
}: ListRoomsOptions = {}) {
  await ensurePostgresSchema();
  const safeLimit = Math.max(1, Math.min(limit, 5000));

  return withPostgresRetry(async () => {
    const database = getPostgresPool();
    const result =
      since === undefined
        ? await database.query<{ code: string }>(
            "SELECT code FROM rooms ORDER BY updated_at DESC LIMIT $1",
            [safeLimit],
          )
        : await database.query<{ code: string }>(
            `SELECT code FROM rooms
             WHERE updated_at >= $1
             ORDER BY updated_at DESC
             LIMIT $2`,
            [since, safeLimit],
          );
    const rooms: Room[] = [];

    for (const row of result.rows) {
      const room = await getRoomFrom(database, row.code);
      if (room) rooms.push(room);
    }

    return rooms;
  });
}

async function persistRoom(
  client: PoolClient,
  room: Room,
  sessionTokens: Record<string, string> = {},
) {
  const persistedRoom = { ...room, updatedAt: Date.now() };
  const tokenResult = await client.query<{ id: string; session_token: string }>(
    "SELECT id, session_token FROM players WHERE room_code = $1",
    [room.code],
  );
  const existingTokens = Object.fromEntries(
    tokenResult.rows.map((row) => [row.id, row.session_token]),
  );

  await client.query(
    `INSERT INTO rooms (
      code, host_id, status, categories_json, round_duration, rounds_to_play,
      rounds_customized, commander_order_json, current_round_number, updated_at
    ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9, $10)
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
      persistedRoom.settings.roundsCustomized,
      JSON.stringify(persistedRoom.commanderOrder),
      persistedRoom.round?.number ?? null,
      persistedRoom.updatedAt,
    ],
  );

  await client.query("DELETE FROM players WHERE room_code = $1", [room.code]);
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

    await client.query(
      `INSERT INTO players (
        id, room_code, session_token, name, initials, color, avatar_id, is_host,
        is_online, last_seen_at, joined_at, position
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        player.id,
        persistedRoom.code,
        token,
        player.name,
        player.initials,
        player.color,
        player.avatarId,
        player.isHost,
        player.isOnline,
        player.lastSeenAt,
        player.joinedAt,
        position,
      ],
    );
  }

  await client.query("DELETE FROM rounds WHERE room_code = $1", [room.code]);
  const roundMap = new Map<number, RoundState>();
  for (const round of persistedRoom.history) roundMap.set(round.number, round);
  if (persistedRoom.round) {
    roundMap.set(persistedRoom.round.number, persistedRoom.round);
  }

  for (const round of [...roundMap.values()].sort((a, b) => a.number - b.number)) {
    await client.query(
      `INSERT INTO rounds (
        room_code, number, commander_id, letter, started_at, duration,
        stopped_at, stopped_by, result_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
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
        await client.query(
          `INSERT INTO answers (
            room_code, round_number, player_id, category, answer, points,
            score_status, validation_status, challenge_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
      await client.query(
        `INSERT INTO challenges (
          room_code, round_number, id, category, answer, normalized_answer,
          status, player_ids_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
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
        await client.query(
          `INSERT INTO votes (
            room_code, round_number, challenge_id, player_id, vote
          ) VALUES ($1, $2, $3, $4, $5)`,
          [persistedRoom.code, round.number, challenge.id, playerId, vote],
        );
      }
    }
  }

  return persistedRoom;
}

async function authenticateWith(
  database: Queryable,
  code: string,
  playerId: string,
  token: string,
) {
  const result = await database.query(
    `SELECT id FROM players
     WHERE room_code = $1 AND id = $2 AND session_token = $3`,
    [code, playerId, hashToken(token)],
  );
  if (result.rowCount === 0) {
    throw new RoomRepositoryError(
      "A tua sessão expirou. Volta a entrar na sala.",
      401,
    );
  }
}

async function lockRoom(client: PoolClient, code: string) {
  await client.query("SELECT code FROM rooms WHERE code = $1 FOR UPDATE", [code]);
}

export function createStoredRoom(room: Room, hostToken: string) {
  return withTransaction(async (client) => {
    const existing = await getRoomFrom(client, room.code);
    if (existing) {
      throw new RoomRepositoryError(
        "Este código já pertence a outra sala. Tenta novamente.",
        409,
      );
    }

    try {
      return await persistRoom(client, room, { [room.hostId]: hostToken });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new RoomRepositoryError(
          "Este código já pertence a outra sala. Tenta novamente.",
          409,
        );
      }
      throw error;
    }
  });
}

export function joinStoredRoom(
  code: string,
  session: PlayerSession,
  join: (room: Room, session: PlayerSession) => Room,
) {
  return withTransaction(async (client) => {
    await lockRoom(client, code);
    const room = await getRoomFrom(client, code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const existingPlayer = room.players.find((player) => player.id === session.id);
    if (existingPlayer) {
      await authenticateWith(client, code, session.id, session.token);
      return room;
    }

    const nextRoom = join(room, session);
    if (nextRoom === room) {
      throw new RoomRepositoryError("Não podes entrar nesta sala agora.", 409);
    }
    return persistRoom(client, nextRoom, { [session.id]: session.token });
  });
}

export function mutateStoredRoom(
  code: string,
  playerId: string,
  token: string,
  mutate: (room: Room, playerId: string) => Room,
) {
  return withTransaction(async (client) => {
    await lockRoom(client, code);
    await authenticateWith(client, code, playerId, token);
    const room = await getRoomFrom(client, code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const nextRoom = mutate(room, playerId);
    if (nextRoom === room) {
      throw new RoomRepositoryError("Esta acção já não está disponível.", 409);
    }
    return persistRoom(client, nextRoom);
  });
}

export async function authenticatePlayer(
  code: string,
  playerId: string,
  token: string,
) {
  await ensurePostgresSchema();
  await withPostgresRetry(() =>
    authenticateWith(getPostgresPool(), code, playerId, token),
  );
  return true;
}

export function updateStoredPresence(
  code: string,
  playerId: string,
  token: string,
  isOnline: boolean,
) {
  return withTransaction(async (client) => {
    await lockRoom(client, code);
    await authenticateWith(client, code, playerId, token);

    const previous = await client.query<{ is_online: boolean }>(
      "SELECT is_online FROM players WHERE room_code = $1 AND id = $2",
      [code, playerId],
    );
    const now = Date.now();

    if (isOnline) {
      await client.query(
        `UPDATE players SET is_online = TRUE, last_seen_at = $1
         WHERE room_code = $2 AND id = $3`,
        [now, code, playerId],
      );
    } else {
      await client.query(
        `UPDATE players SET last_seen_at = $1
         WHERE room_code = $2 AND id = $3`,
        [now, code, playerId],
      );
    }

    const stalePlayers = await client.query(
      `UPDATE players SET is_online = FALSE
       WHERE room_code = $1 AND is_online = TRUE AND last_seen_at < $2`,
      [code, now - PRESENCE_DISCONNECT_GRACE],
    );
    const room = await getRoomFrom(client, code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const reconciledRoom = reconcileRoomPresence(room);
    const leadershipChanged = reconciledRoom !== room;
    const nextRoom = leadershipChanged
      ? await persistRoom(client, reconciledRoom)
      : room;

    return {
      room: nextRoom,
      changed:
        (isOnline && !previous.rows[0]?.is_online) ||
        Boolean(stalePlayers.rowCount) ||
        leadershipChanged,
    };
  });
}

export async function deleteExpiredRooms(
  activeCutoff: number,
  finishedCutoff: number,
  onlineCutoff: number,
) {
  await ensurePostgresSchema();
  const result = await withPostgresRetry(() =>
    getPostgresPool().query(
      `DELETE FROM rooms
       WHERE (
         (status = 'finished' AND updated_at < $1)
         OR (status <> 'finished' AND updated_at < $2)
       )
       AND NOT EXISTS (
         SELECT 1
         FROM players
         WHERE players.room_code = rooms.code
           AND players.is_online = TRUE
           AND players.last_seen_at >= $3
       )`,
      [finishedCutoff, activeCutoff, onlineCutoff],
    ),
  );
  return result.rowCount ?? 0;
}
