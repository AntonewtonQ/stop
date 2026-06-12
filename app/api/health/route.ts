import { checkDatabaseHealth } from "@/lib/server/database";

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
        service: "stop.ao",
        database: process.env.DATABASE_URL ? "postgresql" : "sqlite",
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { status: "error", service: "stop.ao" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
