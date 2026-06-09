import {
  DEFAULT_CATEGORIES,
  PLAYABLE_LETTERS,
  PLAYER_COLORS,
} from "./constants";
import { scoreRound } from "./scoring";
import type {
  Player,
  PlayerSession,
  Room,
  RoomSettings,
  RoundAnswers,
  RoundState,
} from "./types";

const ROOM_PREFIX = "stop.ao:room:";
const SESSION_PREFIX = "stop.ao:player:";

function randomFrom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function makeRound(room: Room, number: number): RoundState {
  const usedLetters = room.history.map((round) => round.letter);
  const availableLetters = PLAYABLE_LETTERS.filter(
    (letter) => !usedLetters.includes(letter),
  );

  return {
    number,
    letter: randomFrom(availableLetters.length ? availableLetters : PLAYABLE_LETTERS),
    startedAt: Date.now(),
    duration: room.settings.roundDuration,
    stoppedAt: null,
    stoppedBy: null,
    answers: {},
    result: null,
  };
}

function normalizeRoom(room: Room): Room {
  return {
    ...room,
    status: room.status ?? "lobby",
    settings: {
      categories: room.settings?.categories ?? DEFAULT_CATEGORIES,
      roundDuration: room.settings?.roundDuration ?? 60,
      roundsToPlay: room.settings?.roundsToPlay ?? 3,
    },
    history: room.history ?? [],
    round: room.round
      ? {
          ...room.round,
          stoppedAt: room.round.stoppedAt ?? null,
          stoppedBy: room.round.stoppedBy ?? null,
          answers: room.round.answers ?? {},
          result: room.round.result ?? null,
        }
      : null,
  };
}

export function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
  ).join("");
}

export function makePlayerId() {
  return crypto.randomUUID();
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function createPlayerSession(name: string, roomCode: string): PlayerSession {
  return {
    id: makePlayerId(),
    name: name.trim(),
    initials: getInitials(name),
    color: randomFrom(PLAYER_COLORS),
    roomCode,
  };
}

export function asRoomPlayer(session: PlayerSession, isHost: boolean): Player {
  return {
    id: session.id,
    name: session.name,
    initials: session.initials,
    color: session.color,
    isHost,
    joinedAt: Date.now(),
  };
}

export function createRoom(
  code: string,
  host: PlayerSession,
  settings?: Partial<RoomSettings>,
): Room {
  return {
    code,
    hostId: host.id,
    status: "lobby",
    players: [asRoomPlayer(host, true)],
    settings: {
      categories: settings?.categories ?? DEFAULT_CATEGORIES,
      roundDuration: settings?.roundDuration ?? 60,
      roundsToPlay: settings?.roundsToPlay ?? 3,
    },
    round: null,
    history: [],
    updatedAt: Date.now(),
  };
}

export function readRoom(code: string): Room | null {
  if (typeof window === "undefined") return null;

  const rawRoom = window.localStorage.getItem(`${ROOM_PREFIX}${normalizeRoomCode(code)}`);
  if (!rawRoom) return null;

  try {
    return normalizeRoom(JSON.parse(rawRoom) as Room);
  } catch {
    return null;
  }
}

export function saveRoom(room: Room) {
  const nextRoom = { ...room, updatedAt: Date.now() };
  window.localStorage.setItem(`${ROOM_PREFIX}${room.code}`, JSON.stringify(nextRoom));
  window.dispatchEvent(
    new CustomEvent<Room>("stop-room-update", { detail: nextRoom }),
  );
  return nextRoom;
}

export function updateRoom(code: string, updater: (room: Room) => Room) {
  const room = readRoom(code);
  if (!room) return null;
  return saveRoom(updater(room));
}

export function joinRoom(room: Room, session: PlayerSession) {
  const playerExists = room.players.some((player) => player.id === session.id);
  if (playerExists) return room;

  return saveRoom({
    ...room,
    players: [...room.players, asRoomPlayer(session, false)],
  });
}

export function startFirstRound(room: Room) {
  return saveRoom({
    ...room,
    status: "round",
    round: makeRound(room, 1),
  });
}

export function saveRoundAnswers(
  code: string,
  playerId: string,
  answers: RoundAnswers,
) {
  return updateRoom(code, (room) => {
    if (room.status !== "round" || !room.round) return room;

    return {
      ...room,
      round: {
        ...room.round,
        answers: { ...room.round.answers, [playerId]: answers },
      },
    };
  });
}

export function finishRound(code: string, stoppedBy: string | null) {
  return updateRoom(code, (room) => {
    if (room.status !== "round" || !room.round || room.round.result) return room;

    const result = scoreRound({
      players: room.players,
      categories: room.settings.categories,
      letter: room.round.letter,
      answers: room.round.answers,
      stoppedBy,
    });
    const completedRound: RoundState = {
      ...room.round,
      stoppedAt: result.endedAt,
      stoppedBy,
      result,
    };

    return {
      ...room,
      status: "results",
      round: completedRound,
      history: [...room.history, completedRound],
    };
  });
}

export function startNextRound(code: string) {
  return updateRoom(code, (room) => {
    if (room.status !== "results" || !room.round) return room;

    return {
      ...room,
      status: "round",
      round: makeRound(room, room.round.number + 1),
    };
  });
}

export function finishGame(code: string) {
  return updateRoom(code, (room) => ({
    ...room,
    status: "finished",
  }));
}

export function restartGame(code: string) {
  return updateRoom(code, (room) => ({
    ...room,
    status: "lobby",
    round: null,
    history: [],
  }));
}

export function savePlayerSession(session: PlayerSession) {
  window.sessionStorage.setItem(
    `${SESSION_PREFIX}${session.roomCode}`,
    JSON.stringify(session),
  );
}

export function readPlayerSession(code: string): PlayerSession | null {
  if (typeof window === "undefined") return null;

  const rawSession = window.sessionStorage.getItem(
    `${SESSION_PREFIX}${normalizeRoomCode(code)}`,
  );
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as PlayerSession;
  } catch {
    return null;
  }
}

export function isRoomStorageKey(key: string | null, code: string) {
  return key === `${ROOM_PREFIX}${normalizeRoomCode(code)}`;
}
