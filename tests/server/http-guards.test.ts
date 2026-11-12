import { describe, expect, it } from "vitest";

import { parseAnswers } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { hasMeaningfulChange } from "@/lib/server/realtime";

describe("rate limit", () => {
  it("bloqueia depois do limite e reabre na janela seguinte", () => {
    const rule = { limit: 2, windowMs: 1_000 };
    const key = `test:${crypto.randomUUID()}`;

    expect(checkRateLimit(key, rule, 0).allowed).toBe(true);
    expect(checkRateLimit(key, rule, 10).allowed).toBe(true);
    const blocked = checkRateLimit(key, rule, 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(980);
    expect(checkRateLimit(key, rule, 1_000).allowed).toBe(true);
  });
});

describe("parseAnswers", () => {
  it("corta respostas longas e ignora valores que não são texto", () => {
    const answers = parseAnswers({ Nome: "A".repeat(200), País: 42 });

    expect(answers).toEqual({ Nome: "A".repeat(80) });
  });

  it("recusa mais respostas do que categorias possíveis", () => {
    const tooMany = Object.fromEntries(
      Array.from({ length: 11 }, (_, index) => [`c${index}`, "x"]),
    );

    expect(() => parseAnswers(tooMany)).toThrow();
  });
});

describe("hasMeaningfulChange", () => {
  const lobby = { status: "lobby" as const, roundNumber: null, updatedAt: 1 };

  it("ignora o primeiro snapshot", () => {
    expect(hasMeaningfulChange(null, lobby)).toBe(false);
  });

  it("emite em mudanças de estado ou de rodada", () => {
    expect(
      hasMeaningfulChange(lobby, { ...lobby, status: "letter-selection" }),
    ).toBe(true);
    expect(hasMeaningfulChange(lobby, { ...lobby, roundNumber: 1 })).toBe(true);
  });

  it("ignora gravações de respostas durante a rodada", () => {
    const round = { status: "round" as const, roundNumber: 1, updatedAt: 5 };

    expect(hasMeaningfulChange(round, { ...round, updatedAt: 9 })).toBe(false);
    expect(hasMeaningfulChange(lobby, { ...lobby, updatedAt: 9 })).toBe(true);
  });
});
