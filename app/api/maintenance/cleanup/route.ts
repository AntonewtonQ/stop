import { isAuthorizedMaintenanceRequest } from "@/lib/server/admin-auth";
import { cleanupExpiredRooms } from "@/lib/server/room-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function cleanup(request: Request) {
  if (!isAuthorizedMaintenanceRequest(request)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const deletedRooms = await cleanupExpiredRooms();
  return Response.json(
    {
      status: "ok",
      deletedRooms,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = cleanup;
export const POST = cleanup;
