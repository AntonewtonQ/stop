import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const DEFAULT_CONNECTION_TIMEOUT_MS = 30_000;
const MAX_CONNECT_ATTEMPTS = 2;

const globalDatabase = globalThis as typeof globalThis & {
  stopPostgresPool?: Pool;
  stopPostgresSchema?: Promise<void>;
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizePostgresConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  if (
    url.searchParams.get("sslmode") === "require" &&
    !url.searchParams.has("uselibpqcompat")
  ) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export function isTransientPostgresError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  const code = candidate?.code ?? "";
  const message = candidate?.message?.toLowerCase() ?? "";

  return (
    code.startsWith("08") ||
    [
      "57P01",
      "57P02",
      "57P03",
      "EAI_AGAIN",
      "ECONNREFUSED",
      "ECONNRESET",
      "ENETUNREACH",
      "EPIPE",
      "ETIMEDOUT",
    ].includes(code) ||
    message.includes("timeout exceeded when trying to connect") ||
    message.includes("connection terminated") ||
    message.includes("timeout expired")
  );
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function withPostgresRetry<T>(
  operation: () => Promise<T>,
  attempts = MAX_CONNECT_ATTEMPTS,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientPostgresError(error) || attempt === attempts) throw error;
      await delay(500 * attempt);
    }
  }

  throw lastError;
}

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to use PostgreSQL.");
  }
  if (globalDatabase.stopPostgresPool) return globalDatabase.stopPostgresPool;

  const pool = new Pool({
    connectionString: normalizePostgresConnectionString(connectionString),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: positiveNumber(
      process.env.POSTGRES_CONNECTION_TIMEOUT_MS,
      DEFAULT_CONNECTION_TIMEOUT_MS,
    ),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    maxLifetimeSeconds: 300,
  });
  pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL connection error.", error);
  });
  globalDatabase.stopPostgresPool = pool;
  return pool;
}

export function connectPostgres() {
  return withPostgresRetry<PoolClient>(() => getPostgresPool().connect());
}

export function queryPostgres<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
) {
  return withPostgresRetry<QueryResult<T>>(() =>
    getPostgresPool().query<T>(text, values),
  );
}

export function ensurePostgresSchema() {
  if (globalDatabase.stopPostgresSchema) return globalDatabase.stopPostgresSchema;

  globalDatabase.stopPostgresSchema = queryPostgres(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL,
      categories_json JSONB NOT NULL,
      round_duration INTEGER NOT NULL,
      rounds_to_play INTEGER NOT NULL,
      rounds_customized BOOLEAN NOT NULL DEFAULT FALSE,
      commander_order_json JSONB NOT NULL,
      current_round_number INTEGER,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
      session_token TEXT NOT NULL,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL,
      avatar_id TEXT NOT NULL DEFAULT 'spark',
      is_host BOOLEAN NOT NULL,
      is_online BOOLEAN NOT NULL DEFAULT FALSE,
      last_seen_at BIGINT NOT NULL DEFAULT 0,
      joined_at BIGINT NOT NULL,
      position INTEGER NOT NULL,
      UNIQUE(room_code, position)
    );

    CREATE TABLE IF NOT EXISTS rounds (
      room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
      number INTEGER NOT NULL,
      commander_id TEXT NOT NULL,
      letter TEXT NOT NULL,
      started_at BIGINT NOT NULL,
      duration INTEGER NOT NULL,
      stopped_at BIGINT,
      stopped_by TEXT,
      result_json JSONB,
      PRIMARY KEY(room_code, number)
    );

    CREATE TABLE IF NOT EXISTS answers (
      room_code TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      category TEXT NOT NULL,
      answer TEXT NOT NULL,
      points INTEGER,
      score_status TEXT,
      validation_status TEXT,
      challenge_id TEXT,
      PRIMARY KEY(room_code, round_number, player_id, category),
      FOREIGN KEY(room_code, round_number)
        REFERENCES rounds(room_code, number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS challenges (
      room_code TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      id TEXT NOT NULL,
      category TEXT NOT NULL,
      answer TEXT NOT NULL,
      normalized_answer TEXT NOT NULL,
      status TEXT NOT NULL,
      player_ids_json JSONB NOT NULL,
      PRIMARY KEY(room_code, round_number, id),
      FOREIGN KEY(room_code, round_number)
        REFERENCES rounds(room_code, number) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS votes (
      room_code TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      challenge_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      PRIMARY KEY(room_code, round_number, challenge_id, player_id),
      FOREIGN KEY(room_code, round_number, challenge_id)
        REFERENCES challenges(room_code, round_number, id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS players_room_code_idx ON players(room_code);
    CREATE INDEX IF NOT EXISTS players_online_idx
      ON players(room_code, is_online, last_seen_at);
    CREATE INDEX IF NOT EXISTS rooms_cleanup_idx ON rooms(status, updated_at);
    CREATE INDEX IF NOT EXISTS rounds_room_code_idx ON rounds(room_code);
    CREATE INDEX IF NOT EXISTS answers_round_idx
      ON answers(room_code, round_number);
    CREATE INDEX IF NOT EXISTS votes_round_idx
      ON votes(room_code, round_number);
  `)
    .then(() => undefined)
    .catch((error) => {
      globalDatabase.stopPostgresSchema = undefined;
      throw error;
    });

  return globalDatabase.stopPostgresSchema;
}

export async function checkPostgresHealth() {
  await ensurePostgresSchema();
  const result = await queryPostgres<{ healthy: number }>("SELECT 1 AS healthy");
  return result.rows[0]?.healthy === 1;
}
