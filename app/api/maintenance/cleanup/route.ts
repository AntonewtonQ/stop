import { timingSafeEqual } from "node:crypto";

import { cleanupExpiredRooms } from "@/lib/server/room-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const secrets = [
    process.env.MAINTENANCE_SECRET,
    process.env.CRON_SECRET,
  ].filter((secret): secret is string => Boolean(secret));

  if (!supplied || secrets.length === 0) return false;

  const suppliedBuffer = Buffer.from(supplied);
  return secrets.some((secret) => {
    const expectedBuffer = Buffer.from(secret);
    return (
      expectedBuffer.length === suppliedBuffer.length &&
      timingSafeEqual(expectedBuffer, suppliedBuffer)
    );
  });
}

async function cleanup(request: Request) {
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

export const GET = cleanup;
export const POST = cleanup;
