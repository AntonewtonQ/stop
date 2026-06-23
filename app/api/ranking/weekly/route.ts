import { recordServerError } from "@/lib/server/admin-events";
import { getWeeklyRanking } from "@/lib/server/room-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getWeeklyRanking();
    return Response.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    recordServerError("api.ranking.weekly", error);
    console.error(error);
    return Response.json(
      { error: "Não conseguimos carregar o ranking semanal." },
      { status: 500 },
    );
  }
}
