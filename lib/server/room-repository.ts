import "server-only";

import { createHash } from "node:crypto";

import {
  normalizeRoom,
  reconcileRoomPresence,
} from "@/lib/game/engine";
import { PRESENCE_DISCONNECT_GRACE } from "@/lib/game/constants";
import { DEFAULT_AVATAR_ID, isAvatarId } from "@/lib/game/avatars";
import {
  DEFAULT_PROFILE_COLOR,
  isProfileColor,
} from "@/lib/game/profile-colors";
import type { PlayerSession, Room, RoundState } from "@/lib/game/types";
import { getDatabase } from "./database";

type RoomRow = {
  code: string;
  host_id: string;
  status: Room["status"];
  categories_json: string;
  round_duration: number;
  rounds_to_play: number;
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

export class RoomRepositoryError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function withTransaction<T>(operation: () => T) {
  const database = getDatabase();
  database.exec("BEGIN IMMEDIATE");

  try {
    const result = operation();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function getRoom(code: string): Room | null {
  const database = getDatabase();
  const roomRow = database
    .prepare("SELECT * FROM rooms WHERE code = ?")
    .get(code) as RoomRow | undefined;

  if (!roomRow) return null;

  const players = database
    .prepare("SELECT * FROM players WHERE room_code = ? ORDER BY position")
    .all(code) as PlayerRow[];
  const roundRows = database
    .prepare("SELECT * FROM rounds WHERE room_code = ? ORDER BY number")
    .all(code) as RoundRow[];
  const answerRows = database
    .prepare(
      "SELECT round_number, player_id, category, answer FROM answers WHERE room_code = ?",
    )
    .all(code) as AnswerRow[];

  const rounds = roundRows.map((roundRow) => {
    const answers: RoundState["answers"] = {};

    for (const answerRow of answerRows) {
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
      startedAt: roundRow.started_at,
      duration: roundRow.duration,
      stoppedAt: roundRow.stopped_at,
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
      isHost: Boolean(player.is_host),
      isOnline: Boolean(player.is_online),
      lastSeenAt: player.last_seen_at,
      joinedAt: player.joined_at,
    })),
    commanderOrder: parseJson<string[]>(roomRow.commander_order_json),
    settings: {
      categories: parseJson<string[]>(roomRow.categories_json),
      roundDuration: roomRow.round_duration,
      roundsToPlay: roomRow.rounds_to_play,
    },
    round:
      rounds.find((round) => round.number === roomRow.current_round_number) ?? null,
    history: rounds.filter((round) => round.result !== null),
    updatedAt: roomRow.updated_at,
  });
}

function persistRoom(room: Room, sessionTokens: Record<string, string> = {}) {
  const database = getDatabase();
  const persistedRoom = { ...room, updatedAt: Date.now() };
  const existingTokens = Object.fromEntries(
    (
      database
        .prepare("SELECT id, session_token FROM players WHERE room_code = ?")
        .all(room.code) as Array<{ id: string; session_token: string }>
    ).map((row) => [row.id, row.session_token]),
  );

  database
    .prepare(`
      INSERT INTO rooms (
        code, host_id, status, categories_json, round_duration, rounds_to_play,
        commander_order_json, current_round_number, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        host_id = excluded.host_id,
        status = excluded.status,
        categories_json = excluded.categories_json,
        round_duration = excluded.round_duration,
        rounds_to_play = excluded.rounds_to_play,
        commander_order_json = excluded.commander_order_json,
        current_round_number = excluded.current_round_number,
        updated_at = excluded.updated_at
    `)
    .run(
      persistedRoom.code,
      persistedRoom.hostId,
      persistedRoom.status,
      JSON.stringify(persistedRoom.settings.categories),
      persistedRoom.settings.roundDuration,
      persistedRoom.settings.roundsToPlay,
      JSON.stringify(persistedRoom.commanderOrder),
      persistedRoom.round?.number ?? null,
      persistedRoom.updatedAt,
    );

  database.prepare("DELETE FROM players WHERE room_code = ?").run(room.code);
  const insertPlayer = database.prepare(`
    INSERT INTO players (
      id, room_code, session_token, name, initials, color, avatar_id, is_host,
      is_online, last_seen_at, joined_at, position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  persistedRoom.players.forEach((player, position) => {
    const token = sessionTokens[player.id]
      ? hashToken(sessionTokens[player.id])
      : existingTokens[player.id];
    if (!token) {
      throw new RoomRepositoryError(
        "A tua sessão expirou. Volta a entrar na sala.",
        401,
      );
    }

    insertPlayer.run(
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
    );
  });

  database.prepare("DELETE FROM rounds WHERE room_code = ?").run(room.code);

  const roundMap = new Map<number, RoundState>();
  for (const round of persistedRoom.history) roundMap.set(round.number, round);
  if (persistedRoom.round) {
    roundMap.set(persistedRoom.round.number, persistedRoom.round);
  }

  const insertRound = database.prepare(`
    INSERT INTO rounds (
      room_code, number, commander_id, letter, started_at, duration,
      stopped_at, stopped_by, result_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAnswer = database.prepare(`
    INSERT INTO answers (
      room_code, round_number, player_id, category, answer, points,
      score_status, validation_status, challenge_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertChallenge = database.prepare(`
    INSERT INTO challenges (
      room_code, round_number, id, category, answer, normalized_answer,
      status, player_ids_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertVote = database.prepare(`
    INSERT INTO votes (
      room_code, round_number, challenge_id, player_id, vote
    ) VALUES (?, ?, ?, ?, ?)
  `);

  for (const round of [...roundMap.values()].sort((a, b) => a.number - b.number)) {
    insertRound.run(
      persistedRoom.code,
      round.number,
      round.commanderId,
      round.letter,
      round.startedAt,
      round.duration,
      round.stoppedAt,
      round.stoppedBy,
      round.result ? JSON.stringify(round.result) : null,
    );

    for (const [playerId, playerAnswers] of Object.entries(round.answers)) {
      for (const [category, answer] of Object.entries(playerAnswers)) {
        const score = round.result?.players[playerId]?.answers[category];
        insertAnswer.run(
          persistedRoom.code,
          round.number,
          playerId,
          category,
          answer,
          score?.points ?? null,
          score?.status ?? null,
          score?.validation ?? null,
          score?.challengeId ?? null,
        );
      }
    }

    for (const challenge of Object.values(round.result?.challenges ?? {})) {
      insertChallenge.run(
        persistedRoom.code,
        round.number,
        challenge.id,
        challenge.category,
        challenge.answer,
        challenge.normalizedAnswer,
        challenge.status,
        JSON.stringify(challenge.playerIds),
      );

      for (const [playerId, vote] of Object.entries(challenge.votes)) {
        insertVote.run(
          persistedRoom.code,
          round.number,
          challenge.id,
          playerId,
          vote,
        );
      }
    }
  }

  return persistedRoom;
}

export function createStoredRoom(room: Room, hostToken: string) {
  return withTransaction(() => {
    if (getRoom(room.code)) {
      throw new RoomRepositoryError(
        "Este código já pertence a outra sala. Tenta novamente.",
        409,
      );
    }

    return persistRoom(room, { [room.hostId]: hostToken });
  });
}

export function joinStoredRoom(
  code: string,
  session: PlayerSession,
  join: (room: Room, session: PlayerSession) => Room,
) {
  return withTransaction(() => {
    const room = getRoom(code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const existingPlayer = room.players.find((player) => player.id === session.id);
    if (existingPlayer) {
      authenticatePlayer(code, session.id, session.token);
      return room;
    }

    const nextRoom = join(room, session);
    if (nextRoom === room) {
      throw new RoomRepositoryError("Não podes entrar nesta sala agora.", 409);
    }

    return persistRoom(nextRoom, { [session.id]: session.token });
  });
}

export function mutateStoredRoom(
  code: string,
  playerId: string,
  token: string,
  mutate: (room: Room, playerId: string) => Room,
) {
  return withTransaction(() => {
    authenticatePlayer(code, playerId, token);
    const room = getRoom(code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const nextRoom = mutate(room, playerId);
    if (nextRoom === room) {
      throw new RoomRepositoryError("Esta acção já não está disponível.", 409);
    }

    return persistRoom(nextRoom);
  });
}

export function authenticatePlayer(code: string, playerId: string, token: string) {
  const player = getDatabase()
    .prepare(
      "SELECT id FROM players WHERE room_code = ? AND id = ? AND session_token = ?",
    )
    .get(code, playerId, hashToken(token));

  if (!player) {
    throw new RoomRepositoryError(
      "A tua sessão expirou. Volta a entrar na sala.",
      401,
    );
  }

  return true;
}

export function updateStoredPresence(
  code: string,
  playerId: string,
  token: string,
  isOnline: boolean,
) {
  return withTransaction(() => {
    authenticatePlayer(code, playerId, token);

    const database = getDatabase();
    const previous = database
      .prepare(
        "SELECT is_online FROM players WHERE room_code = ? AND id = ?",
      )
      .get(code, playerId) as { is_online: number } | undefined;
    const now = Date.now();

    if (isOnline) {
      database
        .prepare(
          "UPDATE players SET is_online = 1, last_seen_at = ? WHERE room_code = ? AND id = ?",
        )
        .run(now, code, playerId);
    } else {
      database
        .prepare(
          "UPDATE players SET last_seen_at = ? WHERE room_code = ? AND id = ?",
        )
        .run(now, code, playerId);
    }

    const stalePlayers = database
      .prepare(
        `UPDATE players
         SET is_online = 0
         WHERE room_code = ? AND is_online = 1 AND last_seen_at < ?`,
      )
      .run(code, now - PRESENCE_DISCONNECT_GRACE);

    const room = getRoom(code);
    if (!room) throw new RoomRepositoryError("Não encontramos esta sala.", 404);

    const reconciledRoom = reconcileRoomPresence(room);
    const leadershipChanged = reconciledRoom !== room;
    const nextRoom = leadershipChanged ? persistRoom(reconciledRoom) : room;

    return {
      room: nextRoom,
      changed:
        (isOnline && !Boolean(previous?.is_online)) ||
        stalePlayers.changes > 0 ||
        leadershipChanged,
    };
  });
}
