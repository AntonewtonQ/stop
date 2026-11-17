import {
  enforceRateLimit,
  handleRouteError,
  jsonNoStore,
  parseAnswers,
  parseDailyPlayerKey,
  readJsonBody,
} from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { RoomRepositoryError } from "@/lib/server/room-repository-error";
import { finishDaily } from "@/lib/server/daily-service";

export const runtime = "nodejs";

/** Scores the attempt on the server, using the server clock. */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{
      playerKey?: unknown;
      attemptId?: unknown;
      answers?: unknown;
    }>(request);
    const playerKey = parseDailyPlayerKey(body.playerKey);
    enforceRateLimit(request, RATE_LIMITS.dailyPlay, playerKey);

    if (typeof body.attemptId !== "string" || body.attemptId.length > 64) {
      throw new RoomRepositoryError("Não encontramos esta tentativa.", 404);
    }

    const me = await finishDaily(
      playerKey,
      body.attemptId,
      parseAnswers(body.answers ?? {}),
    );
    return jsonNoStore({ me });
  } catch (error) {
    return handleRouteError("api.daily.finish", error);
  }
}
