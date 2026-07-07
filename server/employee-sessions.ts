import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/app/generated/prisma";

export const employeeSessionCookieName = "employee-work-session";
const employeeSessionTtlMs = 12 * 60 * 60 * 1000;

export type EmployeeWorkspaceSession = {
  employeeSession: {
    id: string;
    sessionToken: string;
    expiresAt: Date;
    verifiedAt: Date;
    employee: {
      id: string;
      name: string;
      employeeCode: string;
      isActive: boolean;
    };
    shiftSession: {
      id: string;
      shiftDefinition: {
        id: string;
        name: string;
        type: string;
      };
    } | null;
  };
} | null;

export function createEmployeeSessionToken() {
  return randomUUID();
}

export function buildEmployeeSessionCookie(sessionToken: string, expiresAt: Date) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${employeeSessionCookieName}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function clearEmployeeSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${employeeSessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

export function parseCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

export async function getEmployeeWorkspaceSessionByToken(prisma: PrismaClient, sessionToken: string | null | undefined) {

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.employeeSession.findUnique({
    where: { sessionToken },
    select: {
      id: true,
      sessionToken: true,
      expiresAt: true,
      verifiedAt: true,
      employee: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          isActive: true,
        },
      },
      shiftSession: {
        select: {
          id: true,
          shiftDefinition: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.employeeSession.delete({ where: { sessionToken } });
    return null;
  }

  return { employeeSession: session };
}

export async function getEmployeeWorkspaceSession(prisma: PrismaClient, cookieHeader: string | null | undefined) {
  const sessionToken = parseCookieValue(cookieHeader, employeeSessionCookieName);
  return getEmployeeWorkspaceSessionByToken(prisma, sessionToken);
}

export function getEmployeeSessionExpiry() {
  return new Date(Date.now() + employeeSessionTtlMs);
}

export type EmployeeWorkspaceJob = {
  id: string;
  jobNumber: string | null;
  client: string;
  name: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  due: string;
  quantity: number;
  printedQuantity: number;
  remainingQuantity: number;
  material: string;
  status: "NEW" | "IN_PROGRESS" | "READY_TO_DELIVER" | "DISPATCHED" | "ARCHIVED" | "ON_HOLD" | "CANCELLED";
  printer: string;
  printerInfo: {
    name: string;
    model: string;
    machineNumber: string | null;
    location: string | null;
    status: string;
    buildVolume: string | null;
  } | null;
  note: string;
  files: Array<{
    id: string;
    name: string;
    kind: string;
    size: number | null;
  }>;
  filesCount: number;
  photosCount: number;
  progressCount: number;
  latestProgressNote: string | null;
};
