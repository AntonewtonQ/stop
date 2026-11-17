import { isAuthorizedMaintenanceRequest } from "@/lib/server/admin-auth";
import { cleanupDailyAttempts } from "@/lib/server/daily-service";
import { deleteReactionsBefore } from "@/lib/server/reactions-repository";
import { cleanupExpiredRooms } from "@/lib/server/room-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function cleanup(request: Request) {
  if (!isAuthorizedMaintenanceRequest(request)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [deletedRooms, deletedDailyAttempts, deletedReactions] = await Promise.all([
    cleanupExpiredRooms(),
    cleanupDailyAttempts(),
    deleteReactionsBefore(Date.now() - 24 * 60 * 60 * 1000),
  ]);
  return Response.json(
    {
      status: "ok",
      deletedRooms,
      deletedDailyAttempts,
      deletedReactions,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = cleanup;
export const POST = cleanup;
