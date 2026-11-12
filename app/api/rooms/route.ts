import { createRoom, normalizeRoomCode } from "@/lib/game/engine";
import {
  enforceRateLimit,
  handleRouteError,
  jsonNoStore,
  parsePlayerSession,
  readJsonBody,
} from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { publishRoomUpdate } from "@/lib/server/realtime";
import { createStoredRoom } from "@/lib/server/room-repository";
import { getRoomView } from "@/lib/server/room-view";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.createRoom);

    const body = await readJsonBody<{ code?: unknown; host?: unknown }>(
      request,
    );
    const code = normalizeRoomCode(String(body.code ?? ""));

    if (code.length !== 5) {
      return jsonNoStore(
        { error: "Este código de sala não é válido." },
        { status: 400 },
      );
    }

    const host = parsePlayerSession(body.host, code);
    const room = await createStoredRoom(createRoom(code, host), host.token);
    publishRoomUpdate(room.code, room.updatedAt);

    return jsonNoStore({ room: getRoomView(room, host.id) }, { status: 201 });
  } catch (error) {
    return handleRouteError("api.rooms.create", error);
  }
}
