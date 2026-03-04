import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // MIGRATE_DATABASE_URL = conexão direta ao Neon (sem pooler) — obrigatória para migrations
    // DATABASE_URL = conexão via pgbouncer — usada em runtime pelo PrismaClient
    url: env("MIGRATE_DATABASE_URL") || env("DATABASE_URL"),
  },
});
