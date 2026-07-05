import { PrismaClient } from "@/app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/printflow";

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export function getPrisma() {
  // Dev hot reload can keep a PrismaClient instance from before schema changes.
  const cached = globalForPrisma.prisma;
  if (cached?.employee) {
    return cached;
  }

  globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}
