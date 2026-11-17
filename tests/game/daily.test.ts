import { describe, expect, it } from "vitest";

import {
  addDays,
  bestScoresByLetter,
  computeStreak,
  getChallengeWeek,
  dailyEmojiGrid,
  getChallengeDay,
  getChallengeNumber,
  getDailyChallenge,
  msUntilNextChallenge,
  previousDay,
  scoreDailyChallenge,
} from "@/lib/game/daily";
import { PLAYABLE_LETTERS } from "@/lib/game/constants";

describe("desafio diário", () => {
  it("usa o dia de Luanda (UTC+1)", () => {
    expect(getChallengeDay(Date.parse("2026-11-16T22:59:00Z"))).toBe("2026-11-16");
    expect(getChallengeDay(Date.parse("2026-11-16T23:00:00Z"))).toBe("2026-11-17");
    expect(msUntilNextChallenge(Date.parse("2026-11-16T22:00:00Z"))).toBe(60 * 60 * 1000);
  });

  it("numera os desafios a partir do primeiro dia", () => {
    expect(getChallengeNumber("2026-11-16")).toBe(1);
    expect(getChallengeNumber("2026-12-16")).toBe(31);
  });

  it("gera a mesma configuração para todos no mesmo dia", () => {
    const challenge = getDailyChallenge("2026-12-01");

    expect(getDailyChallenge("2026-12-01")).toEqual(challenge);
    expect(PLAYABLE_LETTERS).toContain(challenge.letter);
    expect(challenge.categories).toHaveLength(5);
    expect(new Set(challenge.categories).size).toBe(5);
    expect(challenge.duration).toBe(60);
  });

  it("inclui sempre a categoria da semana, que vale a dobrar", () => {
    const week = getChallengeWeek("2026-11-18"); // a Wednesday
    expect(week.start).toBe("2026-11-16"); // Monday
    expect(week.end).toBe("2026-11-22");

    for (let offset = 0; offset < 7; offset += 1) {
      const challenge = getDailyChallenge(addDays(week.start, offset));
      expect(challenge.featured).toBe(week.featured);
      expect(challenge.categories).toContain(week.featured);
    }
    expect(getChallengeWeek("2026-11-23").featured).not.toBe(week.featured);

    const result = scoreDailyChallenge(
      { letter: "L", categories: ["Nome", "Cidade"], featured: "Cidade", duration: 60 },
      { Nome: "Luís", Cidade: "Luanda" },
      60_000,
    );
    expect(result.answers.map((answer) => answer.points)).toEqual([10, 20]);
  });

  it("guarda a melhor pontuação por letra", () => {
    const history = [
      { day: "2026-11-16", score: 40 },
      { day: "2026-11-17", score: 80 },
    ];
    const best = bestScoresByLetter(history);
    expect(Object.values(best).sort()).toEqual([40, 80].sort());
  });

  it("nunca repete a letra do dia anterior", () => {
    let day = "2026-11-16";
    for (let index = 0; index < 200; index += 1) {
      const next = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000)
        .toISOString()
        .slice(0, 10);
      expect(getDailyChallenge(next).letter).not.toBe(getDailyChallenge(day).letter);
      day = next;
    }
  });

  it("usa cada letra uma vez em cada bloco de 19 dias", () => {
    const size = PLAYABLE_LETTERS.length;
    let start = Math.round(Date.parse("2026-11-10T00:00:00Z") / 86_400_000);
    while (start % size !== 0) start += 1; // align to a block

    const letters = Array.from({ length: size }, (_, offset) =>
      getDailyChallenge(
        new Date((start + offset) * 86_400_000).toISOString().slice(0, 10),
      ).letter,
    );
    expect(new Set(letters).size).toBe(size);
  });

  it("pontua respostas confirmadas, por confirmar e inválidas", () => {
    const challenge = {
      letter: "M",
      categories: ["Nome", "País", "Comida", "Animal", "Cidade"] as const,
      duration: 60,
    };
    const result = scoreDailyChallenge(
      { ...challenge, categories: [...challenge.categories] },
      { Nome: "Maria", País: "Moçambique", Comida: "Mbombo", Animal: "Leão", Cidade: "" },
      20_000,
    );

    expect(result.answers.map((answer) => answer.status)).toEqual([
      "confirmed",
      "confirmed",
      "unconfirmed",
      "invalid",
      "empty",
    ]);
    expect(result.base).toBe(25);
    expect(result.speedBonus).toBe(0);
    expect(dailyEmojiGrid(result)).toBe("🟩🟩🟨🟥⬛");
  });

  it("não dá bónus de velocidade a palavras por confirmar", () => {
    const result = scoreDailyChallenge(
      { letter: "H", categories: ["País", "Cidade"], duration: 60 },
      { País: "Hua", Cidade: "Hambaluku" },
      5_000,
    );

    expect(result.base).toBe(10);
    expect(result.speedBonus).toBe(0);
  });

  it("dá bónus de velocidade quando tudo está confirmado", () => {
    const result = scoreDailyChallenge(
      { letter: "L", categories: ["Nome", "Cidade"], duration: 60 },
      { Nome: "Luís", Cidade: "Luanda" },
      14_500,
    );

    expect(result.base).toBe(20);
    expect(result.speedBonus).toBe(45);
    expect(result.total).toBe(65);
  });

  it("conta a sequência de dias seguidos", () => {
    const today = "2026-11-20";
    const days = [today, previousDay(today), "2026-11-18", "2026-11-15"];

    expect(computeStreak(days, today)).toBe(3);
    expect(computeStreak(days.slice(1), today)).toBe(2);
    expect(computeStreak([], today)).toBe(0);
  });
});
