import "server-only";

import { assertProductionDatabaseConfigured, getConfiguredDatabaseDriver } from "./database";

/**
 * Minimal SQL executor that runs the same statements on SQLite, Turso/libSQL
 * and PostgreSQL (`?` placeholders are rewritten to `$n` for PostgreSQL).
 * Used by small feature tables that do not need a dedicated adapter.
 */

export type SqlRow = Record<string, unknown>;
export type SqlExecutor = {
  all(sql: string, args?: unknown[]): Promise<SqlRow[]>;
  run(sql: string, args?: unknown[]): Promise<number>;
};

const globalSql = globalThis as typeof globalThis & {
  jogastopPortableSchemas?: Map<string, Promise<void>>;
};

function toPositional(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

async function createExecutor(): Promise<SqlExecutor> {
  assertProductionDatabaseConfigured();

  switch (getConfiguredDatabaseDriver()) {
    case "sqlite": {
      const { getDatabase } = await import("./database-sqlite");
      const database = getDatabase();
      return {
        async all(sql, args = []) {
          return database.prepare(sql).all(...(args as never[])) as SqlRow[];
        },
        async run(sql, args = []) {
          return Number(database.prepare(sql).run(...(args as never[])).changes);
        },
      };
    }
    case "turso": {
      const { getTursoClient } = await import("./database-turso");
      const client = getTursoClient();
      return {
        async all(sql, args = []) {
          const result = await client.execute({ sql, args: args as never });
          return result.rows as unknown as SqlRow[];
        },
        async run(sql, args = []) {
          const result = await client.execute({ sql, args: args as never });
          return result.rowsAffected;
        },
      };
    }
    case "postgresql": {
      const { queryPostgres } = await import("./database-postgres");
      return {
        async all(sql, args = []) {
          return (await queryPostgres(toPositional(sql), args)).rows as SqlRow[];
        },
        async run(sql, args = []) {
          return (await queryPostgres(toPositional(sql), args)).rowCount ?? 0;
        },
      };
    }
  }
}

/** Returns an executor once the feature's schema statements have run. */
export async function getPortableExecutor(feature: string, schema: readonly string[]) {
  const executor = await createExecutor();
  const key = `${getConfiguredDatabaseDriver()}:${feature}`;
  globalSql.jogastopPortableSchemas ??= new Map();

  let ready = globalSql.jogastopPortableSchemas.get(key);
  if (!ready) {
    ready = (async () => {
      for (const statement of schema) await executor.run(statement);
    })().catch((error) => {
      globalSql.jogastopPortableSchemas?.delete(key);
      throw error;
    });
    globalSql.jogastopPortableSchemas.set(key, ready);
  }

  await ready;
  return executor;
}
