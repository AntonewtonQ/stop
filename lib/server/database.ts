import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalDatabase = globalThis as typeof globalThis & {
  stopDatabase?: DatabaseSync;
};

export function getDatabase() {
  if (globalDatabase.stopDatabase) return globalDatabase.stopDatabase;

  const databasePath =
    process.env.STOP_DATABASE_PATH ?? path.join(process.cwd(), "data", "stop.db");
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL,
      categories_json TEXT NOT NULL,
      round_duration INTEGER NOT NULL,
      rounds_to_play INTEGER NOT NULL,
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
    CREATE INDEX IF NOT EXISTS rounds_room_code_idx ON rounds(room_code);
    CREATE INDEX IF NOT EXISTS answers_round_idx ON answers(room_code, round_number);
    CREATE INDEX IF NOT EXISTS votes_round_idx ON votes(room_code, round_number);
  `);

  const playerColumns = new Set(
    (
      database.prepare("PRAGMA table_info(players)").all() as Array<{
        name: string;
      }>
    ).map((column) => column.name),
  );

  if (!playerColumns.has("is_online")) {
    database.exec(
      "ALTER TABLE players ADD COLUMN is_online INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!playerColumns.has("avatar_id")) {
    database.exec(
      "ALTER TABLE players ADD COLUMN avatar_id TEXT NOT NULL DEFAULT 'spark'",
    );
  }
  if (!playerColumns.has("last_seen_at")) {
    database.exec(
      "ALTER TABLE players ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0",
    );
    database.exec(
      "UPDATE players SET last_seen_at = joined_at WHERE last_seen_at = 0",
    );
  }

  globalDatabase.stopDatabase = database;
  return database;
}
