import { describe, expect, it } from "vitest";

import {
  isTransientPostgresError,
  normalizePostgresConnectionString,
} from "@/lib/server/database-postgres";
import { assertProductionDatabaseConfigured } from "@/lib/server/database";

describe("configuração PostgreSQL", () => {
  it("normaliza sslmode=require para verificação completa", () => {
    const connectionString = normalizePostgresConnectionString(
      "postgresql://user:password@example.neon.tech/neondb?sslmode=require",
    );

    expect(new URL(connectionString).searchParams.get("sslmode")).toBe(
      "verify-full",
    );
  });

  it("preserva configuração explícita compatível com libpq", () => {
    const connectionString = normalizePostgresConnectionString(
      "postgresql://user:password@example.neon.tech/neondb?sslmode=require&uselibpqcompat=true",
    );

    expect(new URL(connectionString).searchParams.get("sslmode")).toBe("require");
  });

  it("identifica apenas falhas transitórias de ligação para repetição", () => {
    expect(
      isTransientPostgresError(
        new Error("timeout exceeded when trying to connect"),
      ),
    ).toBe(true);
    expect(isTransientPostgresError({ code: "ECONNRESET" })).toBe(true);
    expect(isTransientPostgresError({ code: "23505" })).toBe(false);
  });

  it("exige PostgreSQL quando a aplicação está na Vercel", () => {
    const previousVercel = process.env.VERCEL;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.VERCEL = "1";
    delete process.env.DATABASE_URL;

    expect(() => assertProductionDatabaseConfigured()).toThrow(
      "DATABASE_URL is required on Vercel",
    );

    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });
});
