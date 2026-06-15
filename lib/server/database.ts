import "server-only";

export function assertProductionDatabaseConfigured() {
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required on Vercel because SQLite storage is ephemeral.",
    );
  }
}

export async function checkDatabaseHealth() {
  assertProductionDatabaseConfigured();

  if (process.env.DATABASE_URL) {
    const { checkPostgresHealth } = await import("./database-postgres");
    return checkPostgresHealth();
  }

  const { checkSqliteHealth } = await import("./database-sqlite");
  return checkSqliteHealth();
}
