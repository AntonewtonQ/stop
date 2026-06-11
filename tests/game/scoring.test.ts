import { describe, expect, it } from "vitest";

import { scoreRound } from "@/lib/game/scoring";
import type { Player } from "@/lib/game/types";
import { isKnownAnswer } from "@/lib/game/word-validation";

function player(id: string, isOnline = true): Player {
  return {
    id,
    name: id,
    initials: id,
    color: "#0F2D3D",
    isHost: id === "a",
    isOnline,
    lastSeenAt: 1,
    joinedAt: 1,
  };
}

describe("scoreRound", () => {
  const players = [player("a"), player("b"), player("c")];

  it("reconhece respostas conhecidas em português, inglês e francês", () => {
    expect(isKnownAnswer("Animal", "Cão")).toBe(true);
    expect(isKnownAnswer("Animal", "Dog")).toBe(true);
    expect(isKnownAnswer("Animal", "Chien")).toBe(true);
  });

  it("aplica 5 para repetidas e 10 para uma resposta diferente", () => {
    const result = scoreRound({
      players,
      categories: ["Nome"],
      letter: "A",
      answers: {
        a: { Nome: "Ana" },
        b: { Nome: "Ana" },
        c: { Nome: "Abel" },
      },
      stoppedBy: "a",
      endedAt: 100,
    });

    expect(result.players.a.answers.Nome.points).toBe(5);
    expect(result.players.b.answers.Nome.points).toBe(5);
    expect(result.players.c.answers.Nome.points).toBe(10);
  });

  it("aplica 20 quando apenas uma resposta é válida", () => {
    const result = scoreRound({
      players,
      categories: ["Nome"],
      letter: "A",
      answers: {
        a: { Nome: "Ana" },
        b: { Nome: "Beto" },
      },
      stoppedBy: null,
      endedAt: 100,
    });

    expect(result.players.a.answers.Nome).toMatchObject({
      points: 20,
      status: "unique",
      validation: "automatic",
    });
    expect(result.players.b.answers.Nome.points).toBe(0);
  });

  it("mantém resposta desconhecida pendente até todos os jogadores online votarem", () => {
    const initial = scoreRound({
      players,
      categories: ["Nome"],
      letter: "A",
      answers: { a: { Nome: "Aquila" } },
      stoppedBy: "a",
      endedAt: 100,
    });
    const [challenge] = Object.values(initial.challenges);

    expect(challenge.status).toBe("pending");
    expect(initial.votingComplete).toBe(false);

    const resolved = scoreRound({
      players: [player("a"), player("b"), player("c", false)],
      categories: ["Nome"],
      letter: "A",
      answers: { a: { Nome: "Aquila" } },
      stoppedBy: "a",
      endedAt: 100,
      existingChallenges: {
        [challenge.id]: {
          ...challenge,
          votes: { b: "approve" },
        },
      },
    });

    expect(resolved.challenges[challenge.id].status).toBe("approved");
    expect(resolved.votingComplete).toBe(true);
    expect(resolved.players.a.answers.Nome.points).toBe(20);
  });

  it("rejeita a resposta quando os votos online empatam", () => {
    const initial = scoreRound({
      players,
      categories: ["Nome"],
      letter: "A",
      answers: { a: { Nome: "Aquila" } },
      stoppedBy: "a",
    });
    const [challenge] = Object.values(initial.challenges);
    const result = scoreRound({
      players,
      categories: ["Nome"],
      letter: "A",
      answers: { a: { Nome: "Aquila" } },
      stoppedBy: "a",
      existingChallenges: {
        [challenge.id]: {
          ...challenge,
          votes: { b: "approve", c: "reject" },
        },
      },
    });

    expect(result.challenges[challenge.id].status).toBe("rejected");
    expect(result.players.a.answers.Nome.points).toBe(0);
  });
});
