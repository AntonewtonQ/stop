import {
  checkDatabaseHealth,
  getConfiguredDatabaseDriver,
} from "@/lib/server/database";
import { recordServerError } from "@/lib/server/admin-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await checkDatabaseHealth())) {
      throw new Error("Database health check failed.");
    }

    return Response.json(
      {
        status: "ok",
        service: "jogastop",
        database: getConfiguredDatabaseDriver(),
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    recordServerError("api.health", error);
    console.error(error);
    return Response.json(
      { status: "error", service: "jogastop" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
