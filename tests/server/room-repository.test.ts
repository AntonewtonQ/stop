import { beforeEach, describe, expect, it } from "vitest";

import {
  chooseRoundLetter,
  joinRoom,
  saveRoundAnswers,
  startFirstRound,
} from "@/lib/game/engine";
import { getDatabase } from "@/lib/server/database";
import {
  authenticatePlayer,
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

  it("persiste a sala e protege o token da sessão com hash", () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana"]);
    createStoredRoom(room, sessions[0].token);

    const row = getDatabase()
      .prepare("SELECT session_token FROM players WHERE room_code = ?")
      .get(code) as { session_token: string };

    expect(getRoom(code)?.players[0].name).toBe("Ana");
    expect(row.session_token).not.toBe(sessions[0].token);
    expect(row.session_token).toHaveLength(64);
    expect(() =>
      authenticatePlayer(code, sessions[0].id, "token-errado"),
    ).toThrowError(RoomRepositoryError);
  });

  it("persiste entrada, rodada e respostas em transações", () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    createStoredRoom(
      { ...room, players: [room.players[0]], settings: { ...room.settings, roundsToPlay: 1 } },
      sessions[0].token,
    );
    joinStoredRoom(code, sessions[1], joinRoom);

    mutateStoredRoom(code, sessions[0].id, sessions[0].token, startFirstRound);
    mutateStoredRoom(code, sessions[0].id, sessions[0].token, (storedRoom, id) =>
      chooseRoundLetter(storedRoom, id, "A"),
    );
    mutateStoredRoom(code, sessions[1].id, sessions[1].token, (storedRoom, id) =>
      saveRoundAnswers(storedRoom, id, { Nome: "Abel" }),
    );

    const stored = getRoom(code);
    expect(stored?.players).toHaveLength(2);
    expect(stored?.round).toMatchObject({
      commanderId: sessions[0].id,
      letter: "A",
    });
    expect(stored?.round?.answers[sessions[1].id]).toEqual({ Nome: "Abel" });
  });

  it("marca ausências e transfere anfitrião e comandante", () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    createStoredRoom(
      { ...room, players: [room.players[0]], settings: { ...room.settings, roundsToPlay: 1 } },
      sessions[0].token,
    );
    joinStoredRoom(code, sessions[1], joinRoom);
    mutateStoredRoom(code, sessions[0].id, sessions[0].token, startFirstRound);

    const { room: transferred, changed } = updateStoredPresence(
      code,
      sessions[0].id,
      sessions[0].token,
      false,
    );

    expect(changed).toBe(true);
    expect(transferred.hostId).toBe(sessions[1].id);
    expect(transferred.round?.commanderId).toBe(sessions[1].id);
    expect(
      transferred.players.find((player) => player.id === sessions[0].id)
        ?.isOnline,
    ).toBe(false);
  });

  it("detecta heartbeat expirado quando outro jogador actualiza presença", () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    createStoredRoom(
      { ...room, players: [room.players[0]], settings: { ...room.settings, roundsToPlay: 1 } },
      sessions[0].token,
    );
    joinStoredRoom(code, sessions[1], joinRoom);
    mutateStoredRoom(code, sessions[0].id, sessions[0].token, startFirstRound);
    getDatabase()
      .prepare(
        "UPDATE players SET is_online = 1, last_seen_at = 0 WHERE room_code = ? AND id = ?",
      )
      .run(code, sessions[0].id);

    const { room: transferred } = updateStoredPresence(
      code,
      sessions[1].id,
      sessions[1].token,
      true,
    );

    expect(transferred.hostId).toBe(sessions[1].id);
    expect(transferred.round?.commanderId).toBe(sessions[1].id);
  });
});
