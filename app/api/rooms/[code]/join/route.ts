import { joinRoom, normalizeRoomCode } from "@/lib/game/engine";
import {
  enforceRateLimit,
  handleRouteError,
  jsonNoStore,
  parsePlayerSession,
  readJsonBody,
} from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { publishRoomUpdate } from "@/lib/server/realtime";
import { joinStoredRoom } from "@/lib/server/room-repository";
import { getRoomView } from "@/lib/server/room-view";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    enforceRateLimit(request, RATE_LIMITS.joinRoom);

    const { code: rawCode } = await params;
    const code = normalizeRoomCode(rawCode);
    const body = await readJsonBody<{ session?: unknown }>(request);
    const session = parsePlayerSession(body.session, code);
    const room = await joinStoredRoom(code, session, joinRoom);
    publishRoomUpdate(room.code, room.updatedAt);

    return jsonNoStore({ room: getRoomView(room, session.id) });
  } catch (error) {
    return handleRouteError("api.rooms.join", error);
  }
}
