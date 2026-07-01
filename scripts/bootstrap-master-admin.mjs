import fs from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import prismaClient from "../app/generated/prisma/index.js";

const { PrismaClient } = prismaClient;

function readEnvValue(key) {
  const env = fs.readFileSync(".env", "utf8");
  const line = env
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) {
    throw new Error(`${key} is missing in .env`);
  }

  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^"|"$/g, "");
}

const email = process.env.MASTER_ADMIN_EMAIL ?? "admin@printflow.local";
const password = process.env.MASTER_ADMIN_PASSWORD ?? "Admin@123456";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? readEnvValue("DATABASE_URL"),
});

const prisma = new PrismaClient({ adapter });

try {
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Master Admin",
      role: "MASTER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      deletedAt: null,
    },
    create: {
      name: "Master Admin",
      email,
      role: "MASTER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    update: {
      password: passwordHash,
    },
    create: {
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: passwordHash,
    },
  });

  const saved = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });

  console.log(JSON.stringify(saved, null, 2));
} finally {
  await prisma.$disconnect();
}
