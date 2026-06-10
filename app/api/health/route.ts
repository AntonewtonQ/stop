import { getDatabase } from "@/lib/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    const result = getDatabase()
      .prepare("SELECT 1 AS healthy")
      .get() as { healthy: number } | undefined;

    if (result?.healthy !== 1) {
      throw new Error("Database health check failed.");
    }

    return Response.json(
      {
        status: "ok",
        service: "stop.ao",
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
