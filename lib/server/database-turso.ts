import "server-only";

import { createClient, type Client } from "@libsql/client";

const globalDatabase = globalThis as typeof globalThis & {
  stopTursoClient?: Client;
  stopTursoSchema?: Promise<void>;
};

export function isTursoConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

export function getTursoClient() {
  if (globalDatabase.stopTursoClient) return globalDatabase.stopTursoClient;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is required to use Turso.");
  }

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
    intMode: "number",
  });

  globalDatabase.stopTursoClient = client;
  return client;
}

async function tableColumns(client: Client, table: "players" | "rooms") {
  const result = await client.execute(`PRAGMA table_info(${table})`);
  return new Set(result.rows.map((row) => String(row.name)));
}

async function createTursoSchema() {
  const client = getTursoClient();

  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL,
      categories_json TEXT NOT NULL,
      round_duration INTEGER NOT NULL,
      rounds_to_play INTEGER NOT NULL,
      rounds_customized INTEGER NOT NULL DEFAULT 0,
      commander_order_json TEXT NOT NULL,
      current_round_number INTEGER,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
      session_token TEXT NOT NULL,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL,
      avatar_id TEXT NOT NULL DEFAULT 'spark',
      is_host INTEGER NOT NULL,
      is_online INTEGER NOT NULL DEFAULT 0,
      last_seen_at INTEGER NOT NULL DEFAULT 0,
      joined_at INTEGER NOT NULL,
      position INTEGER NOT NULL,
      UNIQUE(room_code, position)
    );

    CREATE TABLE IF NOT EXISTS rounds (
      room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
      number INTEGER NOT NULL,
      commander_id TEXT NOT NULL,
      letter TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      stopped_at INTEGER,
      stopped_by TEXT,
      result_json TEXT,
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
      player_ids_json TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS votes_round_idx ON votes(room_code, round_number);
  `);

  const playerColumns = await tableColumns(client, "players");
  const roomColumns = await tableColumns(client, "rooms");

  if (!roomColumns.has("rounds_customized")) {
    await client.execute(
      "ALTER TABLE rooms ADD COLUMN rounds_customized INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!playerColumns.has("is_online")) {
    await client.execute(
      "ALTER TABLE players ADD COLUMN is_online INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!playerColumns.has("avatar_id")) {
    await client.execute(
      "ALTER TABLE players ADD COLUMN avatar_id TEXT NOT NULL DEFAULT 'spark'",
    );
  }
  if (!playerColumns.has("last_seen_at")) {
    await client.execute(
      "ALTER TABLE players ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0",
    );
    await client.execute(
      "UPDATE players SET last_seen_at = joined_at WHERE last_seen_at = 0",
    );
  }
}

export function ensureTursoSchema() {
  if (globalDatabase.stopTursoSchema) return globalDatabase.stopTursoSchema;

  globalDatabase.stopTursoSchema = createTursoSchema().catch((error) => {
    globalDatabase.stopTursoSchema = undefined;
    throw error;
  });

  return globalDatabase.stopTursoSchema;
}

export async function checkTursoHealth() {
  await ensureTursoSchema();
  const result = await getTursoClient().execute("SELECT 1 AS healthy");
  return Number(result.rows[0]?.healthy) === 1;
}
