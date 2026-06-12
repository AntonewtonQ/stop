import { normalizeRoomCode } from "@/lib/game/engine";
import {
  authenticatePlayer,
  getRoom,
} from "@/lib/server/room-repository";
import { getRoomView } from "@/lib/server/room-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = await getRoom(normalizeRoomCode(code));

  if (!room) {
    return Response.json(
      { error: "Não encontramos esta sala." },
      { status: 404 },
    );
  }

  const playerId = request.headers.get("x-stop-player-id");
  const token = request.headers.get("x-stop-player-token");
  let viewerId: string | undefined;

  if (playerId && token) {
    try {
      await authenticatePlayer(room.code, playerId, token);
      viewerId = playerId;
    } catch {
      viewerId = undefined;
    }
  }

  return Response.json({ room: getRoomView(room, viewerId) }, {
    headers: { "Cache-Control": "no-store" },
  });
}
