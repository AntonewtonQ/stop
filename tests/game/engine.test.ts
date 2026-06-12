import { describe, expect, it } from "vitest";

import {
  castAnswerVote,
  chooseRoundLetter,
  finishGame,
  finishRound,
  joinRoom,
  prepareNextRound,
  reconcileRoomPresence,
  saveRoundAnswers,
  startRematch,
  startFirstRound,
  updateRoomSettings,
} from "@/lib/game/engine";
import {
  makeSession,
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

  it("fixa o número de rodadas e mantém a escolha quando entram jogadores", () => {
    const { code, room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    const configured = updateRoomSettings(room, sessions[0].id, {
      roundsToPlay: 5,
    });
    const joined = joinRoom(configured, makeSession("Carla", code));

    expect(configured.settings).toMatchObject({
      roundsToPlay: 5,
      roundsCustomized: true,
    });
    expect(joined.settings.roundsToPlay).toBe(5);
  });

  it("repete a ordem de comando até completar as rodadas escolhidas", () => {
    const { room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    const configured = updateRoomSettings(room, sessions[0].id, {
      roundsToPlay: 3,
    });
    const firstSelection = startFirstRound(configured, sessions[0].id);
    const firstResults = finishRound(
      completeAnswers(
        chooseRoundLetter(firstSelection, sessions[0].id, "A"),
        sessions[0].id,
      ),
      sessions[0].id,
    );
    const secondSelection = prepareNextRound(firstResults, sessions[1].id);
    const secondResults = finishRound(
      completeAnswers(
        chooseRoundLetter(secondSelection, sessions[1].id, "B"),
        sessions[1].id,
      ),
      sessions[1].id,
    );
    const thirdSelection = prepareNextRound(secondResults, sessions[0].id);
    const thirdResults = finishRound(
      completeAnswers(
        chooseRoundLetter(thirdSelection, sessions[0].id, "C"),
        sessions[0].id,
      ),
      sessions[0].id,
    );

    expect(secondSelection.round?.commanderId).toBe(sessions[1].id);
    expect(thirdSelection.round?.commanderId).toBe(sessions[0].id);
    expect(thirdResults.status).toBe("finished");
    expect(prepareNextRound(thirdResults, sessions[0].id)).toBe(thirdResults);
    expect(finishGame(thirdResults, sessions[1].id)).toBe(thirdResults);
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

  it("abre a classificação final após concluir as votações da última rodada", () => {
    const { room, sessions } = makeRoomWithPlayers(["Ana", "Beto"]);
    const configured = updateRoomSettings(room, sessions[0].id, {
      roundsToPlay: 1,
    });
    const round = chooseRoundLetter(
      startFirstRound(configured, sessions[0].id),
      sessions[0].id,
      "A",
    );
    const doubtfulAnswers = Object.fromEntries(
      round.settings.categories.map((category) => [category, "Azzzzzz"]),
    );
    let results = finishRound(
      saveRoundAnswers(round, sessions[0].id, doubtfulAnswers),
      sessions[0].id,
    );
    const challengeIds = Object.keys(results.round?.result?.challenges ?? {});

    expect(results.status).toBe("results");
    expect(challengeIds.length).toBeGreaterThan(0);

    for (const challengeId of challengeIds) {
      results = castAnswerVote(results, sessions[1].id, challengeId, "approve");
    }

    expect(results.status).toBe("finished");
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
    const rematch = startRematch(results, sessions[0].id);

    expect(results.status).toBe("finished");
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
