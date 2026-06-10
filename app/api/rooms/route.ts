import { createRoom, normalizeRoomCode } from "@/lib/game/engine";
import type { PlayerSession } from "@/lib/game/types";
import {
  createStoredRoom,
  RoomRepositoryError,
} from "@/lib/server/room-repository";
import { getRoomView } from "@/lib/server/room-view";
import { publishRoomUpdate } from "@/lib/server/realtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: unknown;
      host?: unknown;
    };
    const code = normalizeRoomCode(String(body.code ?? ""));
    const host = parseSession(body.host, code);

    if (code.length !== 5) {
      return Response.json(
        { error: "Este código de sala não é válido." },
        { status: 400 },
      );
    }

    const room = createStoredRoom(createRoom(code, host), host.token);
    publishRoomUpdate(room.code, room.updatedAt);
    return Response.json({ room: getRoomView(room, host.id) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

function parseSession(value: unknown, roomCode: string): PlayerSession {
  const session = value as Partial<PlayerSession> | null;
  if (
    !session ||
    typeof session.id !== "string" ||
    typeof session.token !== "string" ||
    typeof session.name !== "string" ||
    typeof session.initials !== "string" ||
    typeof session.color !== "string" ||
    session.name.trim().length < 2
  ) {
    throw new RoomRepositoryError(
      "Confirma o teu nome e tenta novamente.",
      400,
    );
  }

  return { ...session, roomCode } as PlayerSession;
}

function handleError(error: unknown) {
  if (error instanceof RoomRepositoryError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json(
    { error: "Algo correu mal. Tenta novamente." },
    { status: 500 },
  );
}
