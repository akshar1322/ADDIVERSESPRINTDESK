import "dotenv/config";
import { defineConfig } from "prisma/config";

function getPrismaCliDatabaseUrl() {
  const directUrl = process.env.DIRECT_URL;
  if (directUrl) {
    return directUrl;
  }

  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/printflow";

  // Supabase transaction pooler (6543) breaks Prisma CLI commands.
  // Fall back to session mode on 5432 when DIRECT_URL is not configured.
  if (databaseUrl.includes(".pooler.supabase.com:6543")) {
    return databaseUrl
      .replace(".pooler.supabase.com:6543", ".pooler.supabase.com:5432")
      .replace(/([?&])pgbouncer=true&?/g, "$1")
      .replace(/[?&]$/, "");
  }

  return databaseUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getPrismaCliDatabaseUrl(),
  },
});
