import { beforeEach, describe, expect, it } from "vitest";

import {
  chooseRoundLetter,
  finishRound,
  joinRoom,
  saveRoundAnswers,
  startFirstRound,
} from "@/lib/game/engine";
import { getDatabase } from "@/lib/server/database-sqlite";
import {
  authenticatePlayer,
  cleanupExpiredRooms,
  createStoredRoom,
  getRoom,
  joinStoredRoom,
  mutateStoredRoom,
  RoomRepositoryError,
  updateStoredPresence,
} from "@/lib/server/room-repository";
import {
  clearTestDatabase,
  makeRoomWithPlayers,
} from "../helpers/game";

describe("RoomRepository", () => {
  beforeEach(clearTestDatabase);

  it("persiste a sala e protege o token da sessão com hash", async () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana"]);
    await createStoredRoom(
      {
        ...room,
        settings: {
          ...room.settings,
          roundsToPlay: 5,
          roundsCustomized: true,
        },
      },
      sessions[0].token,
    );

    const row = getDatabase()
      .prepare("SELECT session_token FROM players WHERE room_code = ?")
      .get(code) as { session_token: string };

    const stored = await getRoom(code);
    expect(stored?.players[0].name).toBe("Ana");
    expect(stored?.players[0].avatarId).toBe("spark");
    expect(stored?.settings).toMatchObject({
      roundsToPlay: 5,
      roundsCustomized: true,
    });
    expect(row.session_token).not.toBe(sessions[0].token);
    expect(row.session_token).toHaveLength(64);
    await expect(
      authenticatePlayer(code, sessions[0].id, "token-errado"),
    ).rejects.toThrowError(RoomRepositoryError);
  });

  it("migra e normaliza avatares de jogadores guardados", async () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana"]);
    const withAvatar = {
      ...room,
      players: [{ ...room.players[0], avatarId: "rocket" as const }],
    };
    await createStoredRoom(withAvatar, sessions[0].token);

    expect((await getRoom(code))?.players[0].avatarId).toBe("rocket");
    expect(
      getDatabase()
        .prepare("SELECT avatar_id FROM players WHERE room_code = ?")
        .get(code),
    ).toEqual({ avatar_id: "rocket" });
  });

  it("normaliza cores de perfil antigas fora da paleta", async () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana"]);
    await createStoredRoom(room, sessions[0].token);
    getDatabase()
      .prepare("UPDATE players SET color = ? WHERE room_code = ?")
      .run("invalid", code);

    expect((await getRoom(code))?.players[0].color).toBe("#0F2D3D");
  });

  it("persiste entrada, rodada e respostas em transações", async () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    await createStoredRoom(
      { ...room, players: [room.players[0]], settings: { ...room.settings, roundsToPlay: 1 } },
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

    const stored = await getRoom(code);
    expect(stored?.players).toHaveLength(2);
    expect(stored?.round).toMatchObject({
      commanderId: sessions[0].id,
      letter: "A",
    });
    expect(stored?.round?.answers[sessions[1].id]).toEqual({ Nome: "Abel" });
  });

  it("aceita apenas o primeiro STOP entre jogadores preenchidos", async () => {
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

    for (const session of sessions) {
      await mutateStoredRoom(code, session.id, session.token, (storedRoom, id) =>
        saveRoundAnswers(
          storedRoom,
          id,
          Object.fromEntries(
            storedRoom.settings.categories.map((category) => [category, "Ana"]),
          ),
        ),
      );
    }

    await mutateStoredRoom(code, sessions[1].id, sessions[1].token, (storedRoom, id) =>
      finishRound(storedRoom, id),
    );

    await expect(
      mutateStoredRoom(code, sessions[0].id, sessions[0].token, (storedRoom, id) =>
        finishRound(storedRoom, id),
      ),
    ).rejects.toThrowError(RoomRepositoryError);
    expect((await getRoom(code))?.round?.stoppedBy).toBe(sessions[1].id);
  });

  it("aguarda o período de graça antes de transferir anfitrião e comandante", async () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    await createStoredRoom(
      { ...room, players: [room.players[0]], settings: { ...room.settings, roundsToPlay: 1 } },
      sessions[0].token,
    );
    await joinStoredRoom(code, sessions[1], joinRoom);
    await mutateStoredRoom(code, sessions[0].id, sessions[0].token, startFirstRound);

    const { room: duringGrace, changed } = await updateStoredPresence(
      code,
      sessions[0].id,
      sessions[0].token,
      false,
    );

    expect(changed).toBe(false);
    expect(duringGrace.hostId).toBe(sessions[0].id);
    expect(
      duringGrace.players.find((player) => player.id === sessions[0].id)
        ?.isOnline,
    ).toBe(true);

    getDatabase()
      .prepare(
        "UPDATE players SET last_seen_at = 0 WHERE room_code = ? AND id = ?",
      )
      .run(code, sessions[0].id);
    const { room: transferred } = await updateStoredPresence(
      code,
      sessions[1].id,
      sessions[1].token,
      true,
    );

    expect(transferred.hostId).toBe(sessions[1].id);
    expect(transferred.round?.commanderId).toBe(sessions[1].id);
    expect(
      transferred.players.find((player) => player.id === sessions[0].id)
        ?.isOnline,
    ).toBe(false);
  });

  it("detecta heartbeat expirado quando outro jogador actualiza presença", async () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    await createStoredRoom(
      { ...room, players: [room.players[0]], settings: { ...room.settings, roundsToPlay: 1 } },
      sessions[0].token,
    );
    await joinStoredRoom(code, sessions[1], joinRoom);
    await mutateStoredRoom(code, sessions[0].id, sessions[0].token, startFirstRound);
    getDatabase()
      .prepare(
        "UPDATE players SET is_online = 1, last_seen_at = 0 WHERE room_code = ? AND id = ?",
      )
      .run(code, sessions[0].id);

    const { room: transferred } = await updateStoredPresence(
      code,
      sessions[1].id,
      sessions[1].token,
      true,
    );

    expect(transferred.hostId).toBe(sessions[1].id);
    expect(transferred.round?.commanderId).toBe(sessions[1].id);
  });

  it("remove salas antigas sem apagar salas com jogadores activos", async () => {
    const oldRoom = makeRoomWithPlayers(["Ana"]);
    const activeRoom = makeRoomWithPlayers(["Beto"]);
    await createStoredRoom(oldRoom.room, oldRoom.sessions[0].token);
    await createStoredRoom(activeRoom.room, activeRoom.sessions[0].token);

    getDatabase()
      .prepare("UPDATE rooms SET updated_at = 0")
      .run();
    getDatabase()
      .prepare("UPDATE players SET is_online = 0 WHERE room_code = ?")
      .run(oldRoom.code);
    getDatabase()
      .prepare(
        `UPDATE players SET is_online = 1, last_seen_at = ?
         WHERE room_code = ?`,
      )
      .run(Date.now(), activeRoom.code);

    expect(await cleanupExpiredRooms()).toBe(1);
    expect(await getRoom(oldRoom.code)).toBeNull();
    expect(await getRoom(activeRoom.code)).not.toBeNull();
  });
});
