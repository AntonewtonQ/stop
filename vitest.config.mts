import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { defineConfig } from "vitest/config";

const databasePath = path.join(tmpdir(), `jogastop-vitest-${process.pid}.db`);
process.env.JOGASTOP_DATABASE_PATH = databasePath;

for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    maxWorkers: 1,
    pool: "forks",
  },
});
