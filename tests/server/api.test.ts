import { beforeEach, describe, expect, it } from "vitest";

import { GET as getRoomRoute } from "@/app/api/rooms/[code]/route";
import { POST as actionRoute } from "@/app/api/rooms/[code]/actions/route";
import { GET as eventsRoute } from "@/app/api/rooms/[code]/events/route";
import { POST as joinRoute } from "@/app/api/rooms/[code]/join/route";
import { POST as presenceRoute } from "@/app/api/rooms/[code]/presence/route";
import { POST as createRoute } from "@/app/api/rooms/route";
import { GET as healthRoute } from "@/app/api/health/route";
import {
  GET as cleanupCronRoute,
  POST as cleanupRoute,
} from "@/app/api/maintenance/cleanup/route";
import type { PlayerSession, Room } from "@/lib/game/types";
import { getDatabase } from "@/lib/server/database-sqlite";
import { clearTestDatabase, makeSession } from "../helpers/game";

type RouteResponse = { room?: Room; error?: string };

function jsonRequest(url: string, body: unknown, headers?: HeadersInit) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function context(code: string) {
  return { params: Promise.resolve({ code }) };
}

async function json(response: Response) {
  return (await response.json()) as RouteResponse;
}

function actor(session: PlayerSession) {
  return { id: session.id, token: session.token };
}

describe("Route Handlers", () => {
  beforeEach(clearTestDatabase);

  it("expõe um health check que valida a base de dados", async () => {
    const response = await healthRoute();
    const data = (await response.json()) as {
      status: string;
      service: string;
      database: string;
    };

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: "ok",
      service: "jogastop",
      database: "sqlite",
      timestamp: expect.any(String),
    });
  });

  it("protege a limpeza de salas antigas com um segredo", async () => {
    const code = "OLD01";
    const host = makeSession("Ana", code);
    await createRoute(jsonRequest("http://jogastop.test/api/rooms", { code, host }));
    await new Promise((resolve) => setImmediate(resolve));
    getDatabase()
      .prepare("UPDATE rooms SET updated_at = 0 WHERE code = ?")
      .run(code);
    getDatabase()
      .prepare("UPDATE players SET is_online = 0 WHERE room_code = ?")
      .run(code);
    process.env.MAINTENANCE_SECRET = "maintenance-test-secret";

    const unauthorized = await cleanupRoute(
      new Request("http://jogastop.test/api/maintenance/cleanup", {
        method: "POST",
      }),
    );
    const authorized = await cleanupRoute(
      new Request("http://jogastop.test/api/maintenance/cleanup", {
        method: "POST",
        headers: { authorization: "Bearer maintenance-test-secret" },
      }),
    );
    const result = (await authorized.json()) as { deletedRooms: number };

    expect(unauthorized.status).toBe(401);
    expect(result.deletedRooms).toBe(1);
  });

  it("aceita o segredo enviado pelo Vercel Cron", async () => {
    process.env.CRON_SECRET = "vercel-cron-test-secret";

    const response = await cleanupCronRoute(
      new Request("http://jogastop.test/api/maintenance/cleanup", {
        headers: { authorization: "Bearer vercel-cron-test-secret" },
      }),
    );

    expect(response.status).toBe(200);
    delete process.env.CRON_SECRET;
  });

  it("executa criação, entrada e acções autenticadas", async () => {
    const code = "API01";
    const host = makeSession("Ana", code);
    const guest = makeSession("Beto", code);

    const created = await createRoute(
      jsonRequest("http://jogastop.test/api/rooms", { code, host }),
    );
    const joined = await joinRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/join`, {
        session: guest,
      }),
      context(code),
    );
    const configured = await actionRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
        actor: actor(host),
        type: "update-settings",
        payload: { roundsToPlay: 4 },
      }),
      context(code),
    );
    const started = await actionRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
        actor: actor(host),
        type: "start-game",
        payload: {},
      }),
      context(code),
    );

    expect(created.status).toBe(201);
    expect((await json(joined)).room?.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: host.id, avatarId: "spark" }),
        expect.objectContaining({ id: guest.id, avatarId: "spark" }),
      ]),
    );
    expect((await json(configured)).room?.settings).toMatchObject({
      roundsToPlay: 4,
      roundsCustomized: true,
    });
    expect((await json(started)).room?.status).toBe("letter-selection");

    const unauthorized = await actionRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
        actor: { id: host.id, token: "errado" },
        type: "choose-letter",
        payload: { letter: "A" },
      }),
      context(code),
    );
    expect(unauthorized.status).toBe(401);
  });

  it("recusa um avatar que não pertence ao catálogo", async () => {
    const code = "AVT01";
    const host = { ...makeSession("Ana", code), avatarId: "desconhecido" };
    const response = await createRoute(
      jsonRequest("http://jogastop.test/api/rooms", { code, host }),
    );

    expect(response.status).toBe(400);
  });

  it("recusa uma cor de perfil fora da paleta", async () => {
    const code = "CLR01";
    const host = { ...makeSession("Ana", code), color: "red" };
    const response = await createRoute(
      jsonRequest("http://jogastop.test/api/rooms", { code, host }),
    );

    expect(response.status).toBe(400);
  });

  it("esconde respostas durante a rodada para público e outros jogadores", async () => {
    const code = "API02";
    const host = makeSession("Ana", code);
    const guest = makeSession("Beto", code);

    await createRoute(jsonRequest("http://jogastop.test/api/rooms", { code, host }));
    await joinRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/join`, { session: guest }),
      context(code),
    );
    for (const [session, type, payload] of [
      [host, "start-game", {}],
      [host, "choose-letter", { letter: "A" }],
      [host, "save-answers", { answers: { Nome: "Ana" } }],
      [guest, "save-answers", { answers: { Nome: "Abel" } }],
    ] as const) {
      await actionRoute(
        jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
          actor: actor(session),
          type,
          payload,
        }),
        context(code),
      );
    }

    const publicRoom = await json(
      await getRoomRoute(
        new Request(`http://jogastop.test/api/rooms/${code}`),
        context(code),
      ),
    );
    const hostRoom = await json(
      await getRoomRoute(
        new Request(`http://jogastop.test/api/rooms/${code}`, {
          headers: {
            "x-stop-player-id": host.id,
            "x-stop-player-token": host.token,
          },
        }),
        context(code),
      ),
    );

    expect(publicRoom.room?.round?.answers).toEqual({});
    expect(hostRoom.room?.round?.answers).toEqual({
      [host.id]: { Nome: "Ana" },
    });
  });

  it("guarda as respostas finais e aceita o primeiro STOP de qualquer jogador", async () => {
    const code = "STOP1";
    const host = makeSession("Ana", code);
    const guest = makeSession("Beto", code);

    await createRoute(jsonRequest("http://jogastop.test/api/rooms", { code, host }));
    await joinRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/join`, { session: guest }),
      context(code),
    );
    for (const [session, type, payload] of [
      [host, "start-game", {}],
      [host, "choose-letter", { letter: "A" }],
    ] as const) {
      await actionRoute(
        jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
          actor: actor(session),
          type,
          payload,
        }),
        context(code),
      );
    }

    const answers = {
      Nome: "Ana",
      País: "Angola",
      Comida: "Arroz",
      Profissão: "Actor",
      Animal: "Antílope",
    };
    const stopped = await actionRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
        actor: actor(guest),
        type: "finish-round",
        payload: { answers },
      }),
      context(code),
    );
    const lateStop = await actionRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
        actor: actor(host),
        type: "finish-round",
        payload: { answers },
      }),
      context(code),
    );
    const stoppedRoom = await json(stopped);

    expect(stopped.status).toBe(200);
    expect(stoppedRoom.room?.status).toBe("results");
    expect(stoppedRoom.room?.round?.stoppedBy).toBe(guest.id);
    expect(stoppedRoom.room?.round?.answers[guest.id]).toEqual(answers);
    expect(lateStop.status).toBe(409);
  });

  it("inicia uma revanche mantendo os jogadores da sala", async () => {
    const code = "RVN01";
    const host = makeSession("Ana", code);
    await createRoute(jsonRequest("http://jogastop.test/api/rooms", { code, host }));

    for (const [type, payload] of [
      ["start-game", {}],
      ["choose-letter", { letter: "A" }],
      [
        "finish-round",
        {
          answers: {
            Nome: "Ana",
            País: "Angola",
            Comida: "Arroz",
            Profissão: "Actor",
            Animal: "Antílope",
          },
        },
      ],
    ] as const) {
      await actionRoute(
        jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
          actor: actor(host),
          type,
          payload,
        }),
        context(code),
      );
    }

    const response = await actionRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
        actor: actor(host),
        type: "rematch",
        payload: {},
      }),
      context(code),
    );
    const rematch = await json(response);

    expect(response.status).toBe(200);
    expect(rematch.room).toMatchObject({
      status: "lobby",
      round: null,
      history: [],
      players: [{ id: host.id, name: host.name }],
    });
  });

  it("aplica graça antes de transferir liderança através da API de presença", async () => {
    const code = "API03";
    const host = makeSession("Ana", code);
    const guest = makeSession("Beto", code);

    await createRoute(jsonRequest("http://jogastop.test/api/rooms", { code, host }));
    await joinRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/join`, { session: guest }),
      context(code),
    );
    await actionRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/actions`, {
        actor: actor(host),
        type: "start-game",
        payload: {},
      }),
      context(code),
    );
    const response = await presenceRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/presence`, {
        actor: actor(host),
        online: false,
      }),
      context(code),
    );
    const duringGrace = await json(response);

    expect(duringGrace.room?.hostId).toBe(host.id);
    expect(
      duringGrace.room?.players.find((player) => player.id === host.id)?.isOnline,
    ).toBe(true);

    getDatabase()
      .prepare(
        "UPDATE players SET last_seen_at = 0 WHERE room_code = ? AND id = ?",
      )
      .run(code, host.id);
    const afterGrace = await presenceRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/presence`, {
        actor: actor(guest),
        online: true,
      }),
      context(code),
    );
    const transferred = await json(afterGrace);

    expect(transferred.room?.hostId).toBe(guest.id);
    expect(transferred.room?.round?.commanderId).toBe(guest.id);
  });

  it("publica actualizações através do endpoint SSE", async () => {
    const code = "SSE01";
    const host = makeSession("Ana", code);
    const guest = makeSession("Beto", code);
    await createRoute(jsonRequest("http://jogastop.test/api/rooms", { code, host }));

    const abort = new AbortController();
    const response = await eventsRoute(
      new Request(`http://jogastop.test/api/rooms/${code}/events`, {
        signal: abort.signal,
      }),
      context(code),
    );
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const initial = decoder.decode((await reader.read()).value);

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(initial).toContain("event: connected");

    await joinRoute(
      jsonRequest(`http://jogastop.test/api/rooms/${code}/join`, { session: guest }),
      context(code),
    );
    const update = decoder.decode((await reader.read()).value);

    expect(update).toContain("event: room-updated");
    expect(update).toContain(`"code":"${code}"`);
    abort.abort();
    await reader.cancel();
  });
});
