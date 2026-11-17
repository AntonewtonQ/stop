import {
  enforceRateLimit,
  handleRouteError,
  jsonNoStore,
  parseDailyPlayerKey,
} from "@/lib/server/http";
import { RATE_LIMITS } from "@/lib/server/rate-limit";
import { getDailyOverview } from "@/lib/server/daily-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Today's challenge (without the letter), leaderboard and, if known, the player's state. */
export async function GET(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.dailyRead);
    const rawKey = request.headers.get("x-jogastop-daily-key");
    const playerKey = rawKey ? parseDailyPlayerKey(rawKey) : null;

    return jsonNoStore(await getDailyOverview(playerKey));
  } catch (error) {
    return handleRouteError("api.daily.overview", error);
  }
}
