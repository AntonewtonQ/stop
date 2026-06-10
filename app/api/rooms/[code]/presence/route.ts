import { normalizeRoomCode } from "@/lib/game/engine";
import {
  RoomRepositoryError,
  updateStoredPresence,
} from "@/lib/server/room-repository";
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
    const body = (await request.json()) as PresenceBody;
    const actor = parseActor(body.actor);
    const { room, changed } = updateStoredPresence(
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

    console.error(error);
    return Response.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

function parseActor(actor: PresenceBody["actor"]) {
  if (
    !actor ||
    typeof actor.id !== "string" ||
    typeof actor.token !== "string"
  ) {
    throw new RoomRepositoryError("Sessão do jogador inválida.", 401);
  }

  return { id: actor.id, token: actor.token };
}
