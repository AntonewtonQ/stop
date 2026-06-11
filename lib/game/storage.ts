"use client";

import {
  createPlayerSession,
  makeRoomCode,
  normalizeRoomCode,
} from "./engine";
import type {
  AnswerVote,
  PlayerSession,
  Room,
  RoomSettings,
  RoundAnswers,
} from "./types";

const SESSION_PREFIX = "stop.ao:player:";

export { createPlayerSession, makeRoomCode, normalizeRoomCode };

export class GameApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function requestRoom(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = (await response.json()) as { room?: Room; error?: string };

  if (!response.ok || !data.room) {
    throw new GameApiError(
      data.error ?? "A ligação à sala falhou. Tenta novamente.",
      response.status,
    );
  }

  window.dispatchEvent(
    new CustomEvent<Room>("stop-room-update", { detail: data.room }),
  );
  return data.room;
}

function getActor(code: string) {
  const session = readPlayerSession(code);
  if (!session) {
    throw new GameApiError("A tua sessão expirou. Volta a entrar na sala.", 401);
  }
  return { id: session.id, token: session.token };
}

function sendAction(
  code: string,
  type: string,
  payload: Record<string, unknown> = {},
) {
  const normalizedCode = normalizeRoomCode(code);
  return requestRoom(`/api/rooms/${normalizedCode}/actions`, {
    method: "POST",
    body: JSON.stringify({
      actor: getActor(normalizedCode),
      type,
      payload,
    }),
  });
}

export async function readRoom(code: string) {
  const normalizedCode = normalizeRoomCode(code);
  const session = readPlayerSession(normalizedCode);
  const response = await fetch(`/api/rooms/${normalizedCode}`, {
    cache: "no-store",
    headers: session
      ? {
          "x-stop-player-id": session.id,
          "x-stop-player-token": session.token,
        }
      : undefined,
  });

  if (response.status === 404) return null;

  const data = (await response.json()) as { room?: Room; error?: string };
  if (!response.ok || !data.room) {
    throw new GameApiError(
      data.error ?? "Não conseguimos carregar a sala. Tenta novamente.",
      response.status,
    );
  }

  return data.room;
}

export function createRoom(code: string, host: PlayerSession) {
  return requestRoom("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ code, host }),
  });
}

export function joinRoom(code: string, session: PlayerSession) {
  return requestRoom(`/api/rooms/${normalizeRoomCode(code)}/join`, {
    method: "POST",
    body: JSON.stringify({ session }),
  });
}

export function updateRoomSettings(
  code: string,
  settings: Partial<Pick<RoomSettings, "categories" | "roundDuration">>,
) {
  return sendAction(code, "update-settings", settings);
}

export function startFirstRound(code: string) {
  return sendAction(code, "start-game");
}

export function chooseRoundLetter(code: string, letter: string) {
  return sendAction(code, "choose-letter", { letter });
}

export function saveRoundAnswers(code: string, answers: RoundAnswers) {
  return sendAction(code, "save-answers", { answers });
}

export function finishRound(
  code: string,
  timedOut = false,
  answers?: RoundAnswers,
) {
  return sendAction(code, "finish-round", { timedOut, answers });
}

export function castAnswerVote(
  code: string,
  challengeId: string,
  vote: AnswerVote,
) {
  return sendAction(code, "vote", { challengeId, vote });
}

export function prepareNextRound(code: string) {
  return sendAction(code, "prepare-next-round");
}

export function finishGame(code: string) {
  return sendAction(code, "finish-game");
}

export function restartGame(code: string) {
  return sendAction(code, "restart-game");
}

export function syncPlayerPresence(
  code: string,
  online = true,
) {
  const normalizedCode = normalizeRoomCode(code);
  return requestRoom(`/api/rooms/${normalizedCode}/presence`, {
    method: "POST",
    body: JSON.stringify({
      actor: getActor(normalizedCode),
      online,
    }),
  });
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
    const session = JSON.parse(rawSession) as PlayerSession;
    return session.token ? session : null;
  } catch {
    return null;
  }
}
