import "server-only";

export type DatabaseDriver = "turso" | "postgresql" | "sqlite";

export function getConfiguredDatabaseDriver(): DatabaseDriver {
  if (process.env.TURSO_DATABASE_URL) return "turso";
  if (process.env.DATABASE_URL) return "postgresql";
  return "sqlite";
}

export function assertProductionDatabaseConfigured() {
  if (process.env.VERCEL && getConfiguredDatabaseDriver() === "sqlite") {
    throw new Error(
      "TURSO_DATABASE_URL or DATABASE_URL is required on Vercel because SQLite storage is ephemeral.",
    );
  }
}

export async function checkDatabaseHealth() {
  assertProductionDatabaseConfigured();

  switch (getConfiguredDatabaseDriver()) {
    case "turso": {
      const { checkTursoHealth } = await import("./database-turso");
      return checkTursoHealth();
    }
    case "postgresql": {
      const { checkPostgresHealth } = await import("./database-postgres");
      return checkPostgresHealth();
    }
    case "sqlite": {
      const { checkSqliteHealth } = await import("./database-sqlite");
      return checkSqliteHealth();
    }
  }
}
