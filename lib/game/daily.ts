import { PLAYABLE_LETTERS } from "./constants";
import {
  hasScorableContent,
  isKnownAnswer,
  normalizeAnswer,
  startsWithLetter,
} from "./word-validation";
import {
  getLetterGuide,
  WORD_LIST_CATEGORIES,
  type WordListCategory,
} from "@/lib/content/word-lists";

/**
 * Daily challenge: everyone plays the same letter and categories each day.
 * Pure logic shared by the API (authoritative scoring) and the client UI.
 */

export const DAILY_DURATION_SECONDS = 60;
export const DAILY_CATEGORY_COUNT = 5;
/** Countdown shown before the letter appears; the clock starts after it. */
export const DAILY_COUNTDOWN_MS = 3_000;
/** Late submissions within this window still count (slow networks). */
export const DAILY_SUBMIT_GRACE_MS = 10_000;
/** Day #1 of the challenge, in Luanda time. */
export const DAILY_FIRST_DAY = "2026-11-16";
/** Best score on a letter needed to be an "Expert" in it. */
export const DAILY_EXPERT_SCORE = 75;

const LUANDA_OFFSET_MS = 60 * 60 * 1000; // Angola is UTC+1 all year.
const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyChallenge = {
  day: string;
  number: number;
  letter: string;
  categories: WordListCategory[];
  /** Category of the week: always present and worth double. */
  featured: WordListCategory;
  duration: number;
};

export type DailyAnswerStatus = "confirmed" | "unconfirmed" | "invalid" | "empty";

export type DailyAnswerResult = {
  category: string;
  answer: string;
  status: DailyAnswerStatus;
  points: number;
  featured?: boolean;
};

export type DailyResult = {
  answers: DailyAnswerResult[];
  base: number;
  speedBonus: number;
  total: number;
  elapsedMs: number;
};

export const DAILY_POINTS: Record<DailyAnswerStatus, number> = {
  confirmed: 10,
  unconfirmed: 5,
  invalid: 0,
  empty: 0,
};

/** Calendar day (YYYY-MM-DD) in Luanda for a timestamp. */
export function getChallengeDay(now = Date.now()) {
  return new Date(now + LUANDA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Milliseconds until the next challenge starts (midnight in Luanda). */
export function msUntilNextChallenge(now = Date.now()) {
  const shifted = now + LUANDA_OFFSET_MS;
  return DAY_MS - (shifted % DAY_MS);
}

function dayIndex(day: string) {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

export function getChallengeNumber(day: string) {
  return dayIndex(day) - dayIndex(DAILY_FIRST_DAY) + 1;
}

export function addDays(day: string, amount: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Monday..Sunday week (Luanda calendar) that contains `day`. */
export function getChallengeWeek(day: string) {
  // Day index 0 (1970-01-01) was a Thursday; shift so Monday = 0.
  const weekday = (((dayIndex(day) + 3) % 7) + 7) % 7;
  const start = addDays(day, -weekday);
  const index = Math.floor(dayIndex(start) / 7);
  return {
    start,
    end: addDays(start, 6),
    featured: WORD_LIST_CATEGORIES[index % WORD_LIST_CATEGORIES.length]!,
  };
}

export function previousDay(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Small deterministic PRNG (mulberry32) seeded from the day string. */
function seededRandom(seedText: string) {
  let seed = 2166136261;
  for (const char of seedText) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledLetters(block: number) {
  const random = seededRandom(`jogastop-daily-letters-${block}`);
  return [...PLAYABLE_LETTERS]
    .map((letter) => ({ letter, weight: random() }))
    .sort((a, b) => a.weight - b.weight)
    .map(({ letter }) => letter);
}

/**
 * Letters run in blocks of 19 days: each block is a shuffled cycle, so every
 * letter appears exactly once per block and never twice in a row.
 */
function letterFor(day: string) {
  const index = dayIndex(day);
  const size = PLAYABLE_LETTERS.length;
  const block = Math.floor(index / size);
  const order = shuffledLetters(block);
  const previousLast = shuffledLetters(block - 1)[size - 1];

  if (order[0] === previousLast) [order[0], order[1]] = [order[1]!, order[0]!];
  return order[index - block * size]!;
}

export function getDailyChallenge(day = getChallengeDay()): DailyChallenge {
  const letter = letterFor(day);
  const random = seededRandom(`jogastop-daily-categories-${day}`);
  const shuffled = [...WORD_LIST_CATEGORIES]
    .map((category) => ({ category, weight: random() }))
    .sort((a, b) => a.weight - b.weight)
    .map(({ category }) => category);
  const { featured } = getChallengeWeek(day);
  const chosen = new Set(
    [featured, ...shuffled.filter((category) => category !== featured)].slice(
      0,
      DAILY_CATEGORY_COUNT,
    ),
  );

  return {
    day,
    number: getChallengeNumber(day),
    letter,
    // Keep the familiar order (Nome, País, Comida…) for readability.
    categories: WORD_LIST_CATEGORIES.filter((category) => chosen.has(category)),
    featured,
    duration: DAILY_DURATION_SECONDS,
  };
}

function isListedAnswer(category: WordListCategory, letter: string, answer: string) {
  const normalized = normalizeAnswer(answer);
  return (getLetterGuide(letter)?.words[category] ?? []).some(
    (word) => normalizeAnswer(word) === normalized,
  );
}

export function classifyDailyAnswer(
  category: WordListCategory,
  letter: string,
  rawAnswer: string,
): DailyAnswerStatus {
  const answer = rawAnswer.trim();
  if (!answer) return "empty";
  if (!startsWithLetter(answer, letter) || !hasScorableContent(answer)) {
    return "invalid";
  }

  return isKnownAnswer(category, answer) || isListedAnswer(category, letter, answer)
    ? "confirmed"
    : "unconfirmed";
}

export function scoreDailyChallenge(
  challenge: Pick<DailyChallenge, "letter" | "categories" | "duration"> & {
    featured?: WordListCategory;
  },
  answers: Record<string, string>,
  elapsedMs: number,
): DailyResult {
  const results = challenge.categories.map((category) => {
    const answer = (answers[category] ?? "").trim();
    const status = classifyDailyAnswer(category, challenge.letter, answer);
    const featured = category === challenge.featured;
    return {
      category,
      answer,
      status,
      points: DAILY_POINTS[status] * (featured ? 2 : 1),
      ...(featured ? { featured } : {}),
    };
  });

  const base = results.reduce((sum, result) => sum + result.points, 0);
  // Only fully confirmed sheets earn speed: made-up words that merely start
  // with the letter must never beat real answers.
  const allConfirmed = results.every((result) => result.status === "confirmed");
  const remainingSeconds = Math.floor(
    (challenge.duration * 1000 - Math.max(0, elapsedMs)) / 1000,
  );
  const speedBonus = allConfirmed ? Math.max(0, remainingSeconds) : 0;

  return {
    answers: results,
    base,
    speedBonus,
    total: base + speedBonus,
    elapsedMs: Math.max(0, Math.round(elapsedMs)),
  };
}

/** Wordle-style emoji line for sharing without spoiling the answers. */
export function dailyEmojiGrid(result: Pick<DailyResult, "answers">) {
  const symbols: Record<DailyAnswerStatus, string> = {
    confirmed: "🟩",
    unconfirmed: "🟨",
    invalid: "🟥",
    empty: "⬛",
  };
  return result.answers.map((answer) => symbols[answer.status]).join("");
}

/** Best score per letter from a device's history (letter derives from the day). */
export function bestScoresByLetter(history: readonly { day: string; score: number }[]) {
  const best: Record<string, number> = {};
  for (const { day, score } of history) {
    const { letter } = getDailyChallenge(day);
    best[letter] = Math.max(best[letter] ?? 0, score);
  }
  return best;
}

/** Consecutive played days ending today (or yesterday if today is pending). */
export function computeStreak(playedDays: readonly string[], today: string) {
  const days = new Set(playedDays);
  let cursor = days.has(today) ? today : previousDay(today);
  let streak = 0;

  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }

  return streak;
}
