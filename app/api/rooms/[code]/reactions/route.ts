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
  addRoomReaction,
  isReactionEmoji,
  listRoomReactions,
} from "@/lib/server/reactions-repository";
import {
  authenticatePlayer,
  RoomRepositoryError,
} from "@/lib/server/room-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reactions are only interesting for a few seconds. */
const MAX_LOOKBACK_MS = 30_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    enforceRateLimit(request, RATE_LIMITS.reactionsRead);
    const { code } = await params;
    const now = Date.now();
    const since = Number(new URL(request.url).searchParams.get("since"));
    const from = Number.isFinite(since)
      ? Math.max(since, now - MAX_LOOKBACK_MS)
      : now - MAX_LOOKBACK_MS;

    return jsonNoStore({
      reactions: await listRoomReactions(normalizeRoomCode(code), from),
      serverNow: now,
    });
  } catch (error) {
    return handleRouteError("api.rooms.reactions.list", error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeRoomCode(rawCode);
    const body = await readJsonBody<{ actor?: unknown; emoji?: unknown }>(request);
    const actor = parseActor(body.actor);
    enforceRateLimit(request, RATE_LIMITS.reactionsWrite, actor.id);

    if (!isReactionEmoji(body.emoji)) {
      throw new RoomRepositoryError("Esta reacção não é válida.", 400);
    }

    await authenticatePlayer(code, actor.id, actor.token);
    const reaction = await addRoomReaction({
      roomCode: code,
      playerId: actor.id,
      emoji: body.emoji,
      createdAt: Date.now(),
    });

    return jsonNoStore({ reaction }, { status: 201 });
  } catch (error) {
    return handleRouteError("api.rooms.reactions.create", error);
  }
}
