import "server-only";

import { getPortableExecutor, type SqlRow as Row } from "./portable-sql";
import { hashToken } from "./repository-shared";

/** Daily challenge attempts, stored with portable SQL (see portable-sql.ts). */

export type DailyAttempt = {
  id: string;
  day: string;
  name: string;
  startedAt: number;
  finishedAt: number | null;
  score: number | null;
  elapsedMs: number | null;
  resultJson: string | null;
};

export type DailyLeaderboardEntry = {
  name: string;
  score: number;
  elapsedMs: number;
};

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS daily_attempts (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    player_key_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    started_at BIGINT NOT NULL,
    finished_at BIGINT,
    score INTEGER,
    elapsed_ms BIGINT,
    result_json TEXT,
    UNIQUE (day, player_key_hash)
  )`,
  "CREATE INDEX IF NOT EXISTS daily_attempts_rank_idx ON daily_attempts (day, score)",
  "CREATE INDEX IF NOT EXISTS daily_attempts_player_idx ON daily_attempts (player_key_hash, day)",
];

const getExecutor = () => getPortableExecutor("daily", SCHEMA);

const toNumber = (value: unknown) =>
  value === null || value === undefined ? null : Number(value);

function toAttempt(row: Row | undefined): DailyAttempt | null {
  if (!row) return null;
  return {
    id: String(row.id),
    day: String(row.day),
    name: String(row.name),
    startedAt: Number(row.started_at),
    finishedAt: toNumber(row.finished_at),
    score: toNumber(row.score),
    elapsedMs: toNumber(row.elapsed_ms),
    resultJson: row.result_json === null ? null : String(row.result_json),
  };
}

const ATTEMPT_COLUMNS =
  "id, day, name, started_at, finished_at, score, elapsed_ms, result_json";

export async function findDailyAttempt(day: string, playerKey: string) {
  const executor = await getExecutor();
  const rows = await executor.all(
    `SELECT ${ATTEMPT_COLUMNS} FROM daily_attempts WHERE day = ? AND player_key_hash = ?`,
    [day, hashToken(playerKey)],
  );
  return toAttempt(rows[0]);
}

/** Creates today's attempt, or returns the existing one (one per device per day). */
export async function startDailyAttempt(input: {
  day: string;
  playerKey: string;
  name: string;
  startedAt: number;
}) {
  const executor = await getExecutor();
  await executor.run(
    `INSERT INTO daily_attempts (id, day, player_key_hash, name, started_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (day, player_key_hash) DO NOTHING`,
    [crypto.randomUUID(), input.day, hashToken(input.playerKey), input.name, input.startedAt],
  );

  return (await findDailyAttempt(input.day, input.playerKey))!;
}

/** Stores the result once; returns false if it was already finished. */
export async function finishDailyAttempt(input: {
  id: string;
  playerKey: string;
  finishedAt: number;
  score: number;
  elapsedMs: number;
  resultJson: string;
}) {
  const executor = await getExecutor();
  const changes = await executor.run(
    `UPDATE daily_attempts
     SET finished_at = ?, score = ?, elapsed_ms = ?, result_json = ?
     WHERE id = ? AND player_key_hash = ? AND finished_at IS NULL`,
    [
      input.finishedAt,
      input.score,
      input.elapsedMs,
      input.resultJson,
      input.id,
      hashToken(input.playerKey),
    ],
  );
  return changes > 0;
}

export async function getDailyAttemptById(id: string, playerKey: string) {
  const executor = await getExecutor();
  const rows = await executor.all(
    `SELECT ${ATTEMPT_COLUMNS} FROM daily_attempts WHERE id = ? AND player_key_hash = ?`,
    [id, hashToken(playerKey)],
  );
  return toAttempt(rows[0]);
}

export async function getDailyLeaderboard(day: string, limit = 10) {
  const executor = await getExecutor();
  const rows = await executor.all(
    `SELECT name, score, elapsed_ms FROM daily_attempts
     WHERE day = ? AND finished_at IS NOT NULL
     ORDER BY score DESC, elapsed_ms ASC, finished_at ASC
     LIMIT ?`,
    [day, limit],
  );
  return rows.map<DailyLeaderboardEntry>((row) => ({
    name: String(row.name),
    score: Number(row.score),
    elapsedMs: Number(row.elapsed_ms),
  }));
}

export async function countDailyPlayers(day: string) {
  const executor = await getExecutor();
  const rows = await executor.all(
    "SELECT COUNT(*) AS total FROM daily_attempts WHERE day = ? AND finished_at IS NOT NULL",
    [day],
  );
  return Number(rows[0]?.total ?? 0);
}

/** 1-based position using the same ordering as the leaderboard. */
export async function getDailyRank(day: string, score: number, elapsedMs: number) {
  const executor = await getExecutor();
  const rows = await executor.all(
    `SELECT COUNT(*) AS ahead FROM daily_attempts
     WHERE day = ? AND finished_at IS NOT NULL
       AND (score > ? OR (score = ? AND elapsed_ms < ?))`,
    [day, score, score, elapsedMs],
  );
  return Number(rows[0]?.ahead ?? 0) + 1;
}

/** Removes attempts older than the given day (exclusive). */
export async function deleteDailyAttemptsBefore(day: string) {
  const executor = await getExecutor();
  return executor.run("DELETE FROM daily_attempts WHERE day < ?", [day]);
}

export type DailyHistoryEntry = { day: string; score: number };

/** Finished attempts of one device, newest first (for streaks and profile). */
export async function getPlayerHistory(playerKey: string, limit = 400) {
  const executor = await getExecutor();
  const rows = await executor.all(
    `SELECT day, score FROM daily_attempts
     WHERE player_key_hash = ? AND finished_at IS NOT NULL
     ORDER BY day DESC LIMIT ?`,
    [hashToken(playerKey), limit],
  );
  return rows.map<DailyHistoryEntry>((row) => ({
    day: String(row.day),
    score: Number(row.score),
  }));
}

export type WeeklyLeaderboardEntry = { name: string; total: number; days: number };

const WEEK_FILTER = "day >= ? AND day <= ? AND finished_at IS NOT NULL";

/** Sum of daily scores per device between two days (inclusive). */
export async function getWeeklyLeaderboard(start: string, end: string, limit = 10) {
  const executor = await getExecutor();
  const rows = await executor.all(
    `SELECT MAX(name) AS name, SUM(score) AS total, COUNT(*) AS days
     FROM daily_attempts WHERE ${WEEK_FILTER}
     GROUP BY player_key_hash
     ORDER BY total DESC, days ASC
     LIMIT ?`,
    [start, end, limit],
  );
  return rows.map<WeeklyLeaderboardEntry>((row) => ({
    name: String(row.name),
    total: Number(row.total),
    days: Number(row.days),
  }));
}

export async function getWeeklyStanding(start: string, end: string, playerKey: string) {
  const executor = await getExecutor();
  const mine = await executor.all(
    `SELECT SUM(score) AS total, COUNT(*) AS days FROM daily_attempts
     WHERE ${WEEK_FILTER} AND player_key_hash = ?`,
    [start, end, hashToken(playerKey)],
  );
  const days = Number(mine[0]?.days ?? 0);
  if (days === 0) return null;

  const total = Number(mine[0]?.total ?? 0);
  const ahead = await executor.all(
    `SELECT COUNT(*) AS ahead FROM (
       SELECT SUM(score) AS total FROM daily_attempts
       WHERE ${WEEK_FILTER} GROUP BY player_key_hash
     ) weekly WHERE total > ?`,
    [start, end, total],
  );
  return { total, days, rank: Number(ahead[0]?.ahead ?? 0) + 1 };
}

export async function countWeeklyPlayers(start: string, end: string) {
  const executor = await getExecutor();
  const rows = await executor.all(
    `SELECT COUNT(DISTINCT player_key_hash) AS players FROM daily_attempts WHERE ${WEEK_FILTER}`,
    [start, end],
  );
  return Number(rows[0]?.players ?? 0);
}
