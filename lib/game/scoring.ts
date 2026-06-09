import type {
  AnswerScore,
  Player,
  PlayerRoundScore,
  RoundAnswers,
  RoundResult,
} from "./types";

function normalizeAnswer(answer: string) {
  return answer.trim().toLocaleLowerCase("pt-AO");
}

function isValidAnswer(answer: string, letter: string) {
  return normalizeAnswer(answer).startsWith(letter.toLocaleLowerCase("pt-AO"));
}

export function scoreRound({
  players,
  categories,
  letter,
  answers,
  stoppedBy,
}: {
  players: Player[];
  categories: string[];
  letter: string;
  answers: Record<string, RoundAnswers>;
  stoppedBy: string | null;
}): RoundResult {
  const scores: Record<string, PlayerRoundScore> = Object.fromEntries(
    players.map((player) => [
      player.id,
      { playerId: player.id, answers: {}, total: 0 },
    ]),
  );

  for (const category of categories) {
    const validAnswers = players
      .map((player) => ({
        playerId: player.id,
        answer: answers[player.id]?.[category]?.trim() ?? "",
      }))
      .filter(({ answer }) => isValidAnswer(answer, letter));

    const answerCounts = validAnswers.reduce<Record<string, number>>(
      (counts, { answer }) => {
        const normalizedAnswer = normalizeAnswer(answer);
        counts[normalizedAnswer] = (counts[normalizedAnswer] ?? 0) + 1;
        return counts;
      },
      {},
    );

    for (const player of players) {
      const answer = answers[player.id]?.[category]?.trim() ?? "";
      let score: AnswerScore = { answer, points: 0, status: "invalid" };

      if (isValidAnswer(answer, letter)) {
        const count = answerCounts[normalizeAnswer(answer)] ?? 0;

        if (validAnswers.length === 1) {
          score = { answer, points: 20, status: "unique" };
        } else if (count > 1) {
          score = { answer, points: 5, status: "duplicate" };
        } else {
          score = { answer, points: 10, status: "correct" };
        }
      }

      scores[player.id].answers[category] = score;
      scores[player.id].total += score.points;
    }
  }

  return {
    endedAt: Date.now(),
    stoppedBy,
    players: scores,
  };
}

export function getPlayerTotal(
  history: Array<{ result: RoundResult | null }>,
  playerId: string,
) {
  return history.reduce(
    (total, round) => total + (round.result?.players[playerId]?.total ?? 0),
    0,
  );
}
