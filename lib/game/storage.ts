"use client";

import {
  createPlayerSession,
  makeRoomCode,
  normalizeRoomCode,
} from "./engine";
import { DEFAULT_AVATAR_ID, isAvatarId } from "./avatars";
import { DEFAULT_PROFILE_COLOR, isProfileColor } from "./profile-colors";
import type {
  AnswerVote,
  PlayerSession,
  Room,
  RoomSettings,
  RoundAnswers,
} from "./types";

const SESSION_PREFIX = "jogastop:player:";
const LAST_ROOM_KEY = "jogastop:last-room";

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
  settings: Partial<
    Pick<RoomSettings, "categories" | "roundDuration" | "roundsToPlay">
  >,
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

export function startRematch(code: string) {
  return sendAction(code, "rematch");
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

export function signalPlayerDisconnect(code: string) {
  const normalizedCode = normalizeRoomCode(code);
  const session = readPlayerSession(normalizedCode);
  if (!session || typeof navigator === "undefined" || !navigator.sendBeacon) {
    return false;
  }

  return navigator.sendBeacon(
    `/api/rooms/${normalizedCode}/presence`,
    new Blob(
      [
        JSON.stringify({
          actor: { id: session.id, token: session.token },
          online: false,
        }),
      ],
      { type: "application/json" },
    ),
  );
}

export function savePlayerSession(session: PlayerSession) {
  const key = `${SESSION_PREFIX}${session.roomCode}`;
  const value = JSON.stringify(session);
  window.localStorage.setItem(key, value);
  window.localStorage.setItem(LAST_ROOM_KEY, session.roomCode);
  window.sessionStorage.setItem(key, value);
}

export function readPlayerSession(code: string): PlayerSession | null {
  if (typeof window === "undefined") return null;

  const key = `${SESSION_PREFIX}${normalizeRoomCode(code)}`;
  const rawSession =
    window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession) as PlayerSession;
    if (!session.token) return null;
    session.avatarId = isAvatarId(session.avatarId)
      ? session.avatarId
      : DEFAULT_AVATAR_ID;
    session.color = isProfileColor(session.color)
      ? session.color
      : DEFAULT_PROFILE_COLOR;

    const normalizedSession = JSON.stringify(session);
    window.localStorage.setItem(key, normalizedSession);
    window.sessionStorage.setItem(key, normalizedSession);
    window.localStorage.setItem(LAST_ROOM_KEY, session.roomCode);
    return session;
  } catch {
    return null;
  }
}

export function readLastPlayerSession() {
  if (typeof window === "undefined") return null;
  const code = window.localStorage.getItem(LAST_ROOM_KEY);
  return code ? readPlayerSession(code) : null;
}
