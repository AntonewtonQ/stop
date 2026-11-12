import { normalizeRoomCode } from "@/lib/game/engine";
import {
  handleRouteError,
  jsonNoStore,
  parseActor,
  readJsonBody,
} from "@/lib/server/http";
import { publishRoomUpdate } from "@/lib/server/realtime";
import {
  updateStoredPresence,
  updateStoredPresenceLight,
} from "@/lib/server/room-repository";
import { getRoomView } from "@/lib/server/room-view";

export const runtime = "nodejs";

type PresenceBody = {
  actor?: unknown;
  online?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeRoomCode(rawCode);
    const body = await readJsonBody<PresenceBody>(request);
    const actor = parseActor(body.actor);
    const isLightRequest = isLightPresenceRequest(request);

    if (isLightRequest) {
      const result = await updateStoredPresenceLight(
        code,
        actor.id,
        actor.token,
        body.online !== false,
      );

      if (result.changed) publishRoomUpdate(result.code, result.updatedAt);

      return jsonNoStore({ ok: true, changed: result.changed });
    }

    const { room, changed } = await updateStoredPresence(
      code,
      actor.id,
      actor.token,
      body.online !== false,
    );

    if (changed) publishRoomUpdate(room.code, room.updatedAt);

    return jsonNoStore({ room: getRoomView(room, actor.id) });
  } catch (error) {
    return handleRouteError("api.rooms.presence", error);
  }
}

function isLightPresenceRequest(request: Request) {
  const url = new URL(request.url);
  return (
    url.searchParams.get("light") === "1" ||
    request.headers.get("x-stop-presence-mode") === "light" ||
    request.headers.get("x-jogastop-presence-mode") === "light"
  );
}
