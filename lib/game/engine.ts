import {
  CATEGORY_OPTIONS,
  DEFAULT_CATEGORIES,
  PLAYABLE_LETTERS,
  PLAYER_COLORS,
  ROUND_DURATION_OPTIONS,
} from "./constants";
import { scoreRound } from "./scoring";
import type {
  AnswerScore,
  AnswerVote,
  Player,
  PlayerSession,
  Room,
  RoomSettings,
  RoundAnswers,
  RoundResult,
  RoundState,
} from "./types";

function randomFrom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function makeRound(room: Room, number: number): RoundState {
  return {
    number,
    commanderId: room.commanderOrder[number - 1] ?? room.hostId,
    letter: "",
    startedAt: 0,
    duration: room.settings.roundDuration,
    stoppedAt: null,
    stoppedBy: null,
    answers: {},
    result: null,
  };
}

function normalizeResult(result: RoundResult | null): RoundResult | null {
  if (!result) return null;

  return {
    ...result,
    players: Object.fromEntries(
      Object.entries(result.players).map(([playerId, score]) => [
        playerId,
        {
          ...score,
          answers: Object.fromEntries(
            Object.entries(score.answers).map(([category, answer]) => [
              category,
              {
                ...answer,
                validation:
                  answer.validation ??
                  (answer.status === "invalid" ? "invalid" : "automatic"),
                challengeId: answer.challengeId ?? null,
              } satisfies AnswerScore,
            ]),
          ),
        },
      ]),
    ),
    challenges: result.challenges ?? {},
    votingComplete: result.votingComplete ?? true,
  };
}

function normalizeRound(
  round: RoundState,
  commanderOrder: string[],
  hostId: string,
): RoundState {
  return {
    ...round,
    commanderId:
      round.commanderId ?? commanderOrder[round.number - 1] ?? hostId,
    stoppedAt: round.stoppedAt ?? null,
    stoppedBy: round.stoppedBy ?? null,
    answers: round.answers ?? {},
    result: normalizeResult(round.result ?? null),
  };
}

export function normalizeRoom(room: Room): Room {
  const commanderOrder =
    room.commanderOrder?.length > 0
      ? room.commanderOrder
      : room.players.map((player) => player.id);

  return {
    ...room,
    status: room.status ?? "lobby",
    commanderOrder,
    settings: {
      categories: room.settings?.categories ?? DEFAULT_CATEGORIES,
      roundDuration: room.settings?.roundDuration ?? 60,
      roundsToPlay:
        room.status === "lobby"
          ? (room.settings?.roundsToPlay ?? room.players.length)
          : commanderOrder.length,
    },
    history: (room.history ?? []).map((round) =>
      normalizeRound(round, commanderOrder, room.hostId),
    ),
    round: room.round
      ? normalizeRound(room.round, commanderOrder, room.hostId)
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
    id: crypto.randomUUID(),
    name: name.trim(),
    initials: getInitials(name),
    color: randomFrom(PLAYER_COLORS),
    roomCode,
    token: crypto.randomUUID(),
  };
}

function asRoomPlayer(session: PlayerSession, isHost: boolean): Player {
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
    commanderOrder: [],
    settings: {
      categories: settings?.categories ?? DEFAULT_CATEGORIES,
      roundDuration: settings?.roundDuration ?? 60,
      roundsToPlay: 1,
    },
    round: null,
    history: [],
    updatedAt: Date.now(),
  };
}

export function joinRoom(room: Room, session: PlayerSession) {
  const playerExists = room.players.some((player) => player.id === session.id);
  if (playerExists) return room;
  if (room.status !== "lobby") return room;
  if (room.players.length >= PLAYABLE_LETTERS.length) return room;

  return {
    ...room,
    players: [...room.players, asRoomPlayer(session, false)],
    settings: {
      ...room.settings,
      roundsToPlay: room.players.length + 1,
    },
  };
}

export function updateRoomSettings(
  room: Room,
  requesterId: string,
  settings: Partial<Pick<RoomSettings, "categories" | "roundDuration">>,
) {
  if (room.status !== "lobby" || room.hostId !== requesterId) return room;

  const categories = settings.categories ?? room.settings.categories;
  const roundDuration = settings.roundDuration ?? room.settings.roundDuration;
  const validCategories =
    categories.length >= 3 &&
    categories.every((category) =>
      CATEGORY_OPTIONS.includes(category as (typeof CATEGORY_OPTIONS)[number]),
    );
  const validDuration = ROUND_DURATION_OPTIONS.includes(
    roundDuration as (typeof ROUND_DURATION_OPTIONS)[number],
  );

  if (!validCategories || !validDuration) return room;

  return {
    ...room,
    settings: { ...room.settings, categories, roundDuration },
  };
}

export function startFirstRound(room: Room, requesterId: string) {
  if (room.hostId !== requesterId || room.status !== "lobby") return room;

  const commanderOrder = room.players.map((player) => player.id);
  const preparedRoom = {
    ...room,
    commanderOrder,
    settings: {
      ...room.settings,
      roundsToPlay: commanderOrder.length,
    },
  };

  return {
    ...preparedRoom,
    status: "letter-selection" as const,
    round: makeRound(preparedRoom, 1),
  };
}

export function chooseRoundLetter(
  room: Room,
  commanderId: string,
  letter: string,
) {
  const normalizedLetter = letter.trim().toUpperCase();
  const usedLetters = room.history.map((round) => round.letter);
  const canChoose =
    room.status === "letter-selection" &&
    room.round?.commanderId === commanderId &&
    PLAYABLE_LETTERS.includes(
      normalizedLetter as (typeof PLAYABLE_LETTERS)[number],
    ) &&
    !usedLetters.includes(normalizedLetter);

  if (!canChoose || !room.round) return room;

  return {
    ...room,
    status: "round" as const,
    round: {
      ...room.round,
      letter: normalizedLetter,
      startedAt: Date.now(),
    },
  };
}

export function saveRoundAnswers(
  room: Room,
  playerId: string,
  answers: RoundAnswers,
) {
  if (
    room.status !== "round" ||
    !room.round ||
    !room.players.some((player) => player.id === playerId)
  ) {
    return room;
  }

  return {
    ...room,
    round: {
      ...room.round,
      answers: { ...room.round.answers, [playerId]: answers },
    },
  };
}

export function finishRound(
  room: Room,
  stoppedBy: string | null,
  now = Date.now(),
) {
  if (room.status !== "round" || !room.round || room.round.result) return room;
  if (stoppedBy !== null && stoppedBy !== room.round.commanderId) return room;

  const deadline = room.round.startedAt + room.round.duration * 1000;
  if (stoppedBy === null && now < deadline) return room;

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
    status: "results" as const,
    round: completedRound,
    history: [...room.history, completedRound],
  };
}

export function castAnswerVote(
  room: Room,
  voterId: string,
  challengeId: string,
  vote: AnswerVote,
) {
  if (room.status !== "results" || !room.round?.result) return room;

  const challenge = room.round.result.challenges[challengeId];
  const canVote =
    challenge?.status === "pending" &&
    room.players.some((player) => player.id === voterId) &&
    !challenge.playerIds.includes(voterId);

  if (!canVote) return room;

  const result = scoreRound({
    players: room.players,
    categories: room.settings.categories,
    letter: room.round.letter,
    answers: room.round.answers,
    stoppedBy: room.round.result.stoppedBy,
    endedAt: room.round.result.endedAt,
    existingChallenges: {
      ...room.round.result.challenges,
      [challengeId]: {
        ...challenge,
        votes: { ...challenge.votes, [voterId]: vote },
      },
    },
  });
  const updatedRound = { ...room.round, result };

  return {
    ...room,
    round: updatedRound,
    history: room.history.map((round) =>
      round.number === updatedRound.number ? updatedRound : round,
    ),
  };
}

export function prepareNextRound(room: Room, requesterId: string) {
  const nextCommanderId = room.commanderOrder[room.history.length];

  if (
    room.status !== "results" ||
    !room.round ||
    !room.round.result?.votingComplete ||
    requesterId !== nextCommanderId
  ) {
    return room;
  }

  return {
    ...room,
    status: "letter-selection" as const,
    round: makeRound(room, room.round.number + 1),
  };
}

export function finishGame(room: Room, requesterId: string) {
  if (
    room.status !== "results" ||
    !room.round?.result?.votingComplete ||
    room.round.commanderId !== requesterId
  ) {
    return room;
  }

  return { ...room, status: "finished" as const };
}

export function restartGame(room: Room, requesterId: string) {
  if (room.hostId !== requesterId || room.status !== "finished") return room;

  return {
    ...room,
    status: "lobby" as const,
    round: null,
    history: [],
    commanderOrder: [],
    settings: { ...room.settings, roundsToPlay: room.players.length },
  };
}
