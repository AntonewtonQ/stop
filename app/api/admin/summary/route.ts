import { isAuthorizedAdminRequest } from "@/lib/server/admin-auth";
import { recordServerError } from "@/lib/server/admin-events";
import { getAdminDashboardStats } from "@/lib/server/room-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const stats = await getAdminDashboardStats();
    return Response.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    recordServerError("api.admin.summary", error);
    console.error(error);
    return Response.json(
      { error: "Não conseguimos carregar o painel interno." },
      { status: 500 },
    );
  }
}
