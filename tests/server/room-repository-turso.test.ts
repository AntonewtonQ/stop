import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  chooseRoundLetter,
  joinRoom,
  saveRoundAnswers,
  startFirstRound,
} from "@/lib/game/engine";
import {
  ensureTursoSchema,
  getTursoClient,
} from "@/lib/server/database-turso";
import {
  authenticatePlayer,
  createStoredRoom,
  getRoom,
  joinStoredRoom,
  mutateStoredRoom,
  updateStoredPresence,
} from "@/lib/server/room-repository-turso";
import { RoomRepositoryError } from "@/lib/server/room-repository-error";
import { makeRoomWithPlayers } from "../helpers/game";

const databasePath = path.join(tmpdir(), `jogastop-turso-vitest-${process.pid}.db`);

for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}

describe("RoomRepository Turso", () => {
  beforeAll(() => {
    process.env.TURSO_DATABASE_URL = `file:${databasePath}`;
    delete process.env.TURSO_AUTH_TOKEN;
  });

  beforeEach(async () => {
    await ensureTursoSchema();
    await getTursoClient().execute("DELETE FROM rooms");
  });

  afterAll(() => {
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
  });

  it("persiste salas e protege tokens em libSQL", async () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana"]);
    await createStoredRoom(room, sessions[0].token);

    const stored = await getRoom(code);
    expect(stored?.players[0].name).toBe("Ana");
    await expect(
      authenticatePlayer(code, sessions[0].id, "token-errado"),
    ).rejects.toThrowError(RoomRepositoryError);
    await expect(
      authenticatePlayer(code, sessions[0].id, sessions[0].token),
    ).resolves.toBe(true);
  });

  it("executa entrada, respostas e presença em transações write", async () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    await createStoredRoom(
      {
        ...room,
        players: [room.players[0]],
        settings: { ...room.settings, roundsToPlay: 1 },
      },
      sessions[0].token,
    );

    await joinStoredRoom(code, sessions[1], joinRoom);
    await mutateStoredRoom(code, sessions[0].id, sessions[0].token, startFirstRound);
    await mutateStoredRoom(code, sessions[0].id, sessions[0].token, (storedRoom, id) =>
      chooseRoundLetter(storedRoom, id, "A"),
    );
    await mutateStoredRoom(code, sessions[1].id, sessions[1].token, (storedRoom, id) =>
      saveRoundAnswers(storedRoom, id, { Nome: "Abel" }),
    );
    const presence = await updateStoredPresence(
      code,
      sessions[1].id,
      sessions[1].token,
      true,
    );

    const stored = await getRoom(code);
    expect(stored?.players).toHaveLength(2);
    expect(stored?.round).toMatchObject({ letter: "A" });
    expect(stored?.round?.answers[sessions[1].id]).toEqual({ Nome: "Abel" });
    expect(presence.room.players.find((player) => player.id === sessions[1].id)?.isOnline).toBe(true);
  });
});
