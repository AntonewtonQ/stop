import "server-only";

import { DEFAULT_AVATAR_ID, isAvatarId } from "@/lib/game/avatars";
import { MAX_CATEGORIES } from "@/lib/game/constants";
import { isProfileColor } from "@/lib/game/profile-colors";
import type { PlayerSession, RoundAnswers } from "@/lib/game/types";
import { recordServerError } from "./admin-events";
import { checkRateLimit, type RateLimitRule } from "./rate-limit";
import { RoomRepositoryError } from "./room-repository-error";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

const MAX_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 24;
const MAX_INITIALS_LENGTH = 3;
const MAX_ANSWER_LENGTH = 80;
const MAX_CATEGORY_KEY_LENGTH = 48;

export type Actor = { id: string; token: string };

export function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { ...NO_STORE_HEADERS, ...init.headers },
  });
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new RoomRepositoryError("O pedido enviado não é válido.", 400);
  }
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength
  );
}

export function parseActor(value: unknown): Actor {
  const actor = value as { id?: unknown; token?: unknown } | null | undefined;

  if (
    !actor ||
    !isBoundedString(actor.id, MAX_ID_LENGTH) ||
    !isBoundedString(actor.token, MAX_ID_LENGTH)
  ) {
    throw new RoomRepositoryError(
      "A tua sessão expirou. Volta a entrar na sala.",
      401,
    );
  }

  return { id: actor.id, token: actor.token };
}

export function parsePlayerSession(
  value: unknown,
  roomCode: string,
): PlayerSession {
  const session = value as Partial<PlayerSession> | null;
  const avatarId =
    session?.avatarId === undefined
      ? DEFAULT_AVATAR_ID
      : isAvatarId(session.avatarId)
        ? session.avatarId
        : null;
  const name = typeof session?.name === "string" ? session.name.trim() : "";

  if (
    !session ||
    !isBoundedString(session.id, MAX_ID_LENGTH) ||
    !isBoundedString(session.token, MAX_ID_LENGTH) ||
    !isBoundedString(session.initials, MAX_INITIALS_LENGTH) ||
    !isProfileColor(session.color) ||
    !avatarId ||
    name.length < 2 ||
    Array.from(name).length > MAX_NAME_LENGTH
  ) {
    throw new RoomRepositoryError(
      "Confirma o teu nome e tenta novamente.",
      400,
    );
  }

  return { ...session, name, avatarId, roomCode } as PlayerSession;
}

export function parseAnswers(value: unknown): RoundAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RoomRepositoryError("Não conseguimos guardar as respostas.", 400);
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" &&
      entry[0].length <= MAX_CATEGORY_KEY_LENGTH,
  );

  if (entries.length > MAX_CATEGORIES) {
    throw new RoomRepositoryError("Não conseguimos guardar as respostas.", 400);
  }

  return Object.fromEntries(
    entries.map(([category, answer]) => [
      category,
      Array.from(answer).slice(0, MAX_ANSWER_LENGTH).join(""),
    ]),
  );
}

export function getClientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();

  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Throws a 429 RoomRepositoryError when the caller exceeded the rule. */
export function enforceRateLimit(
  request: Request,
  rule: RateLimitRule,
  subject = getClientAddress(request),
) {
  const result = checkRateLimit(`${rule.name}:${subject}`, rule);
  if (!result.allowed) {
    throw new RoomRepositoryError(
      "Estás a fazer pedidos demasiado depressa. Espera um momento.",
      429,
      { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) },
    );
  }
}

export function handleRouteError(scope: string, error: unknown) {
  if (error instanceof RoomRepositoryError) {
    return jsonNoStore(
      { error: error.message },
      { status: error.status, headers: error.headers },
    );
  }

  recordServerError(scope, error);
  console.error(error);
  return jsonNoStore(
    { error: "Algo correu mal. Tenta novamente." },
    { status: 500 },
  );
}
