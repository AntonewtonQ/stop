import { normalizeRoomCode } from "@/lib/game/engine";
import {
  enforceRateLimit,
  handleRouteError,
  jsonNoStore,
  parseActor,
  readJsonBody,
} from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import {
  authenticatePlayer,
  getRoom,
  RoomRepositoryError,
} from "@/lib/server/room-repository";
import { createVoiceAccess, isVoiceConfigured } from "@/lib/server/voice";

export const runtime = "nodejs";

/** Issues a LiveKit token so an authenticated player can join the room's voice chat. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    if (!isVoiceConfigured()) {
      return jsonNoStore(
        { error: "O chat de voz não está disponível." },
        { status: 503 },
      );
    }

    const { code: rawCode } = await params;
    const code = normalizeRoomCode(rawCode);
    const body = await readJsonBody<{ actor?: unknown }>(request);
    const actor = parseActor(body.actor);
    enforceRateLimit(request, RATE_LIMITS.voiceToken, actor.id);

    await authenticatePlayer(code, actor.id, actor.token);
    const room = await getRoom(code);
    const player = room?.players.find((candidate) => candidate.id === actor.id);
    if (!room || !player) {
      throw new RoomRepositoryError("Não encontramos esta sala.", 404);
    }

    const access = await createVoiceAccess({
      roomCode: room.code,
      playerId: player.id,
      playerName: player.name,
    });
    if (!access) {
      throw new RoomRepositoryError("O chat de voz não está disponível.", 503);
    }

    return jsonNoStore(access);
  } catch (error) {
    return handleRouteError("api.rooms.voice", error);
  }
}
