import "server-only";

import {
  bestScoresByLetter,
  computeStreak,
  DAILY_COUNTDOWN_MS,
  DAILY_EXPERT_SCORE,
  DAILY_SUBMIT_GRACE_MS,
  getChallengeDay,
  getChallengeWeek,
  getDailyChallenge,
  previousDay,
  scoreDailyChallenge,
  type DailyChallenge,
  type DailyResult,
} from "@/lib/game/daily";
import {
  countDailyPlayers,
  countWeeklyPlayers,
  deleteDailyAttemptsBefore,
  findDailyAttempt,
  finishDailyAttempt,
  getDailyAttemptById,
  getDailyLeaderboard,
  getDailyRank,
  getPlayerHistory,
  getWeeklyLeaderboard,
  getWeeklyStanding,
  startDailyAttempt,
  type DailyAttempt,
} from "./daily-repository";
import { RoomRepositoryError } from "./room-repository-error";

/** Attempts are kept this long (streaks are counted within this window). */
export const DAILY_RETENTION_DAYS = 120;

export type DailyMe =
  | {
      status: "playing";
      attemptId: string;
      letter: string;
      startedAt: number;
      endsAt: number;
    }
  | {
      status: "finished";
      attemptId: string;
      letter: string;
      result: DailyResult;
      rank: number;
      streak: number;
    };

/** The letter stays secret until the player starts. */
function publicChallenge({ day, number, categories, featured, duration }: DailyChallenge) {
  return { day, number, categories, featured, duration };
}

async function playedDays(playerKey: string) {
  return (await getPlayerHistory(playerKey)).map((entry) => entry.day);
}

function deadline(attempt: DailyAttempt, challenge: DailyChallenge) {
  return attempt.startedAt + challenge.duration * 1000;
}

async function finishedView(
  attempt: DailyAttempt,
  challenge: DailyChallenge,
  playerKey: string,
): Promise<DailyMe> {
  const result = JSON.parse(attempt.resultJson ?? "{}") as DailyResult;
  const [rank, days] = await Promise.all([
    getDailyRank(challenge.day, attempt.score ?? 0, attempt.elapsedMs ?? 0),
    playedDays(playerKey),
  ]);

  return {
    status: "finished",
    attemptId: attempt.id,
    letter: challenge.letter,
    result,
    rank,
    streak: computeStreak(days, challenge.day),
  };
}

async function settle(
  attempt: DailyAttempt,
  challenge: DailyChallenge,
  playerKey: string,
  answers: Record<string, string>,
  now: number,
) {
  const late = now > deadline(attempt, challenge) + DAILY_SUBMIT_GRACE_MS;
  // Too late means the letter was visible far beyond the clock: drop answers.
  // The letter is already in the start response during the countdown, but the
  // UI cannot submit before the clock starts: a submission that early comes
  // from a script, so it gets the slowest possible time (no speed bonus).
  const elapsedMs =
    now < attempt.startedAt
      ? challenge.duration * 1000
      : Math.min(now - attempt.startedAt, challenge.duration * 1000);
  const result = scoreDailyChallenge(challenge, late ? {} : answers, elapsedMs);

  await finishDailyAttempt({
    id: attempt.id,
    playerKey,
    finishedAt: now,
    score: result.total,
    elapsedMs: result.elapsedMs,
    resultJson: JSON.stringify(result),
  });

  const stored = await getDailyAttemptById(attempt.id, playerKey);
  return finishedView(stored!, challenge, playerKey);
}

async function meFor(
  attempt: DailyAttempt | null,
  challenge: DailyChallenge,
  playerKey: string,
  now: number,
): Promise<DailyMe | null> {
  if (!attempt) return null;
  if (attempt.finishedAt !== null) {
    return finishedView(attempt, challenge, playerKey);
  }

  // Abandoned attempt whose clock ran out: close it with no answers.
  if (now > deadline(attempt, challenge) + DAILY_SUBMIT_GRACE_MS) {
    return settle(attempt, challenge, playerKey, {}, now);
  }

  return {
    status: "playing",
    attemptId: attempt.id,
    letter: challenge.letter,
    startedAt: attempt.startedAt,
    endsAt: deadline(attempt, challenge),
  };
}

export async function getDailyOverview(playerKey: string | null, now = Date.now()) {
  const challenge = getDailyChallenge(getChallengeDay(now));
  const attempt = playerKey ? await findDailyAttempt(challenge.day, playerKey) : null;
  const me = playerKey ? await meFor(attempt, challenge, playerKey, now) : null;
  const week = getChallengeWeek(challenge.day);
  const [leaderboard, players, weekLeaderboard, weekPlayers, weekMe, history] =
    await Promise.all([
      getDailyLeaderboard(challenge.day),
      countDailyPlayers(challenge.day),
      getWeeklyLeaderboard(week.start, week.end),
      countWeeklyPlayers(week.start, week.end),
      playerKey ? getWeeklyStanding(week.start, week.end, playerKey) : null,
      playerKey ? getPlayerHistory(playerKey) : [],
    ]);
  const streak = playerKey
    ? computeStreak(history.map((entry) => entry.day), challenge.day)
    : null;

  return {
    challenge: publicChallenge(challenge),
    leaderboard,
    players,
    me,
    streak: me?.status === "finished" ? me.streak : streak,
    week: {
      start: week.start,
      end: week.end,
      featured: week.featured,
      leaderboard: weekLeaderboard,
      players: weekPlayers,
      me: weekMe,
    },
    profile:
      history.length > 0
        ? {
            daysPlayed: history.length,
            bestScore: Math.max(...history.map((entry) => entry.score)),
            letters: bestScoresByLetter(history),
            expertScore: DAILY_EXPERT_SCORE,
          }
        : null,
    serverNow: now,
  };
}

export async function startDaily(playerKey: string, name: string, now = Date.now()) {
  const challenge = getDailyChallenge(getChallengeDay(now));
  const attempt = await startDailyAttempt({
    day: challenge.day,
    playerKey,
    name,
    startedAt: now + DAILY_COUNTDOWN_MS,
  });
  const me = await meFor(attempt, challenge, playerKey, now);

  return {
    challenge: { ...publicChallenge(challenge), letter: challenge.letter },
    me: me!,
    serverNow: now,
  };
}

export async function finishDaily(
  playerKey: string,
  attemptId: string,
  answers: Record<string, string>,
  now = Date.now(),
) {
  const challenge = getDailyChallenge(getChallengeDay(now));
  const attempt = await getDailyAttemptById(attemptId, playerKey);

  // Started just before midnight: score it against the challenge it belongs to.
  if (attempt && attempt.day !== challenge.day) {
    const ownChallenge = getDailyChallenge(attempt.day);
    return attempt.finishedAt !== null
      ? finishedView(attempt, ownChallenge, playerKey)
      : settle(attempt, ownChallenge, playerKey, answers, now);
  }

  if (!attempt) {
    throw new RoomRepositoryError("Não encontramos esta tentativa.", 404);
  }
  if (attempt.finishedAt !== null) {
    return finishedView(attempt, challenge, playerKey);
  }

  return settle(attempt, challenge, playerKey, answers, now);
}

export async function cleanupDailyAttempts(now = Date.now()) {
  let cutoff = getChallengeDay(now);
  for (let index = 0; index < DAILY_RETENTION_DAYS; index += 1) {
    cutoff = previousDay(cutoff);
  }
  return deleteDailyAttemptsBefore(cutoff);
}
