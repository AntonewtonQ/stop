import { normalizeRoomCode } from "@/lib/game/engine";
import {
  RoomRepositoryError,
  updateStoredPresence,
} from "@/lib/server/room-repository";
import { recordServerError } from "@/lib/server/admin-events";
import { publishRoomUpdate } from "@/lib/server/realtime";
import { getRoomView } from "@/lib/server/room-view";

export const runtime = "nodejs";

type PresenceBody = {
  actor?: { id?: unknown; token?: unknown };
  online?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeRoomCode(rawCode);
    const body = await parseBody(request);
    const actor = parseActor(body.actor);
    const { room, changed } = await updateStoredPresence(
      code,
      actor.id,
      actor.token,
      body.online !== false,
    );

    if (changed) publishRoomUpdate(room.code, room.updatedAt);

    return Response.json({ room: getRoomView(room, actor.id) });
  } catch (error) {
    if (error instanceof RoomRepositoryError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    recordServerError("api.rooms.presence", error);
    console.error(error);
    return Response.json(
      { error: "Algo correu mal. Tenta novamente." },
      { status: 500 },
    );
  }
}

async function parseBody(request: Request) {
  try {
    return (await request.json()) as PresenceBody;
  } catch {
    throw new RoomRepositoryError(
      "Não conseguimos actualizar a tua presença.",
      400,
    );
  }
}

function parseActor(actor: PresenceBody["actor"]) {
  if (
    !actor ||
    typeof actor.id !== "string" ||
    typeof actor.token !== "string"
  ) {
    throw new RoomRepositoryError(
      "A tua sessão expirou. Volta a entrar na sala.",
      401,
    );
  }

  return { id: actor.id, token: actor.token };
}
