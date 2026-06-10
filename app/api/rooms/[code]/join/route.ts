import { joinRoom, normalizeRoomCode } from "@/lib/game/engine";
import type { PlayerSession } from "@/lib/game/types";
import {
  joinStoredRoom,
  RoomRepositoryError,
} from "@/lib/server/room-repository";
import { getRoomView } from "@/lib/server/room-view";
import { publishRoomUpdate } from "@/lib/server/realtime";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeRoomCode(rawCode);
    const body = (await request.json()) as { session?: unknown };
    const session = parseSession(body.session, code);
    const room = joinStoredRoom(code, session, joinRoom);
    publishRoomUpdate(room.code, room.updatedAt);

    return Response.json({ room: getRoomView(room, session.id) });
  } catch (error) {
    if (error instanceof RoomRepositoryError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return Response.json(
      { error: "Algo correu mal. Tenta novamente." },
      { status: 500 },
    );
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
