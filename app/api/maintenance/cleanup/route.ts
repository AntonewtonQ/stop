import { timingSafeEqual } from "node:crypto";

import { cleanupExpiredRooms } from "@/lib/server/room-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.MAINTENANCE_SECRET;
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!secret || !supplied) return false;

  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
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
