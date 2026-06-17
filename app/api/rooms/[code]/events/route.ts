import { normalizeRoomCode } from "@/lib/game/engine";
import { getRoom } from "@/lib/server/room-repository";
import {
  subscribeToRoom,
  type RoomRealtimeEvent,
} from "@/lib/server/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEARTBEAT_INTERVAL = 15_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);
  const room = await getRoom(code);

  if (!room) {
    return Response.json(
      { error: "Não encontramos esta sala." },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      function send(message: string) {
        if (closed) return;

        try {
          controller.enqueue(encoder.encode(message));
        } catch {
          close();
        }
      }

      function close() {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();

        try {
          controller.close();
        } catch {
          // The client may have already closed the stream.
        }
      }

      function sendEvent(event: RoomRealtimeEvent) {
        send(
          `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify({
            code: event.code,
            updatedAt: event.updatedAt,
          })}\n\n`,
        );
      }

      send(`retry: 2000\nevent: connected\ndata: {"code":"${code}"}\n\n`);
      unsubscribe = subscribeToRoom(code, sendEvent);
      heartbeat = setInterval(
        () =>
          send(
            `event: heartbeat\ndata: ${JSON.stringify({
              code,
              at: Date.now(),
            })}\n\n`,
          ),
        HEARTBEAT_INTERVAL,
      );
      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
