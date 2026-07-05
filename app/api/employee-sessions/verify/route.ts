import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrisma } from "@/lib/prisma";
import { verifyEmployeePin } from "@/server/employees/pin";
import {
  buildEmployeeSessionCookie,
  createEmployeeSessionToken,
  getEmployeeSessionExpiry,
} from "@/server/employee-sessions";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

const verifySchema = z.object({
  employeeId: z.string().min(1),
  pin: z.string().min(4),
  shiftDefinitionId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError("Employee, PIN, and shift are required.");
  }

  const prisma = getPrisma();
  const employee = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, isActive: true },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      pinHash: true,
      defaultShiftType: true,
    },
  });

  if (!employee) {
    return jsonError("Employee not found.", 404);
  }

  const pinValid = await verifyEmployeePin(parsed.data.pin, employee.pinHash);

  if (!pinValid) {
    return jsonError("Invalid PIN.", 401);
  }

  const shiftDefinition =
    parsed.data.shiftDefinitionId
      ? await prisma.shiftDefinition.findFirst({
          where: { id: parsed.data.shiftDefinitionId, isActive: true },
          select: { id: true, name: true, type: true },
        })
      : await prisma.shiftDefinition.findFirst({
          where: employee.defaultShiftType ? { type: employee.defaultShiftType, isActive: true } : { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, type: true },
        });

  if (!shiftDefinition) {
    return jsonError("No active shift definitions are available.", 404);
  }

  const shiftSession = await prisma.shiftSession.create({
    data: {
      employeeId: employee.id,
      shiftDefinitionId: shiftDefinition.id,
      verifiedAt: new Date(),
    },
    select: { id: true },
  });

  const expiresAt = getEmployeeSessionExpiry();
  const sessionToken = createEmployeeSessionToken();

  await prisma.employeeSession.create({
    data: {
      employeeId: employee.id,
      sessionToken,
      shiftSessionId: shiftSession.id,
      verifiedAt: new Date(),
      expiresAt,
      lastSeenAt: new Date(),
    },
    select: { id: true },
  });

  const response = NextResponse.json({
    ok: true,
    session: {
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
      },
      shift: shiftDefinition,
      expiresAt: expiresAt.toISOString(),
    },
  });

  response.headers.set("Set-Cookie", buildEmployeeSessionCookie(sessionToken, expiresAt));

  return response;
}
