import {
  enforceRateLimit,
  handleRouteError,
  jsonNoStore,
  parseDailyPlayerKey,
  parsePlayerName,
  readJsonBody,
} from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { startDaily } from "@/lib/server/daily-service";

export const runtime = "nodejs";

/** Starts (or resumes) today's single attempt and reveals the letter. */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{ playerKey?: unknown; name?: unknown }>(request);
    const playerKey = parseDailyPlayerKey(body.playerKey);
    enforceRateLimit(request, RATE_LIMITS.dailyPlay, playerKey);

    return jsonNoStore(await startDaily(playerKey, parsePlayerName(body.name)));
  } catch (error) {
    return handleRouteError("api.daily.start", error);
  }
}
