import { describe, expect, it } from "vitest";

import {
  chooseRoundLetter,
  finishGame,
  finishRound,
  prepareNextRound,
  reconcileRoomPresence,
  saveRoundAnswers,
  startRematch,
  startFirstRound,
} from "@/lib/game/engine";
import {
  makeRoomWithPlayers,
  setPlayerOnline,
} from "../helpers/game";

describe("motor da partida", () => {
  it("respeita a ordem de comando e bloqueia letras repetidas", () => {
    const { room, sessions } = makeRoomWithPlayers();
    const prepared = startFirstRound(room, sessions[0].id);
    const firstRound = chooseRoundLetter(prepared, sessions[0].id, "A");
    const results = finishRound(
      completeAnswers(firstRound, sessions[0].id),
      sessions[0].id,
      100,
    );
    const nextSelection = prepareNextRound(results, sessions[1].id);

    expect(prepared.commanderOrder).toEqual(sessions.map((session) => session.id));
    expect(nextSelection.round?.commanderId).toBe(sessions[1].id);
    expect(chooseRoundLetter(nextSelection, sessions[1].id, "A")).toBe(
      nextSelection,
    );
    expect(chooseRoundLetter(nextSelection, sessions[1].id, "B").round?.letter).toBe(
      "B",
    );
  });

  it("reserva a escolha da letra ao comandante e exige respostas completas para STOP", () => {
    const { room, sessions } = makeRoomWithPlayers();
    const prepared = startFirstRound(room, sessions[0].id);

    expect(chooseRoundLetter(prepared, sessions[1].id, "A")).toBe(prepared);

    const round = chooseRoundLetter(prepared, sessions[0].id, "A");
    expect(finishRound(round, sessions[1].id)).toBe(round);
  });

  it("permite que qualquer jogador preenchido grite STOP primeiro", () => {
    const { room, sessions } = makeRoomWithPlayers();
    const round = chooseRoundLetter(
      startFirstRound(room, sessions[0].id),
      sessions[0].id,
      "A",
    );
    const completed = completeAnswers(round, sessions[1].id);
    const results = finishRound(completed, sessions[1].id);

    expect(results.status).toBe("results");
    expect(results.round?.stoppedBy).toBe(sessions[1].id);
    expect(finishRound(results, sessions[0].id)).toBe(results);
  });

  it("rejeita STOP de alguém que não pertence à sala", () => {
    const { room, sessions } = makeRoomWithPlayers();
    const round = completeAnswers(
      chooseRoundLetter(
        startFirstRound(room, sessions[0].id),
        sessions[0].id,
        "A",
      ),
      "intruso",
    );

    expect(finishRound(round, "intruso")).toBe(round);
  });

  it("transfere anfitrião e comandante corrente para o próximo online", () => {
    const { room, sessions } = makeRoomWithPlayers();
    const prepared = startFirstRound(room, sessions[0].id);
    const reconciled = reconcileRoomPresence(
      setPlayerOnline(prepared, sessions[0].id, false),
    );

    expect(reconciled.hostId).toBe(sessions[1].id);
    expect(reconciled.round?.commanderId).toBe(sessions[1].id);
    expect(reconciled.commanderOrder[0]).toBe(sessions[1].id);
    expect(
      reconciled.players.find((player) => player.id === sessions[1].id)?.isHost,
    ).toBe(true);
  });

  it("transfere o próximo comando offline sem bloquear a rodada seguinte", () => {
    const { room, sessions } = makeRoomWithPlayers();
    const firstRound = chooseRoundLetter(
      startFirstRound(room, sessions[0].id),
      sessions[0].id,
      "A",
    );
    const results = finishRound(
      completeAnswers(firstRound, sessions[0].id),
      sessions[0].id,
    );
    const reconciled = reconcileRoomPresence(
      setPlayerOnline(results, sessions[1].id, false),
    );
    const nextRound = prepareNextRound(reconciled, sessions[2].id);

    expect(reconciled.commanderOrder[1]).toBe(sessions[2].id);
    expect(nextRound.round?.commanderId).toBe(sessions[2].id);
  });

  it("prepara uma revanche preservando sala, jogadores e regras", () => {
    const { room, sessions } = makeRoomWithPlayers(["Ana"]);
    const round = chooseRoundLetter(
      startFirstRound(room, sessions[0].id),
      sessions[0].id,
      "A",
    );
    const results = finishRound(
      completeAnswers(round, sessions[0].id),
      sessions[0].id,
    );
    const finished = finishGame(results, sessions[0].id);
    const rematch = startRematch(finished, sessions[0].id);

    expect(finished.status).toBe("finished");
    expect(rematch).toMatchObject({
      code: room.code,
      status: "lobby",
      players: room.players,
      settings: room.settings,
      round: null,
      history: [],
      commanderOrder: [],
    });
  });
});

function completeAnswers(
  room: ReturnType<typeof startFirstRound>,
  playerId: string,
) {
  return saveRoundAnswers(
    room,
    playerId,
    Object.fromEntries(
      room.settings.categories.map((category) => [category, "Resposta"]),
    ),
  );
}
