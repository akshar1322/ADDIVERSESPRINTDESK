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
import { assertValidJobStatusTransition } from "@/server/workflow/status";

export const runtime = "nodejs";

const startSchema = z.object({
  jobId: z.string().min(1),
  employeeId: z.string().min(1),
  pin: z.string().min(4),
  shiftDefinitionId: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = startSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError("Job, employee, PIN, and shift are required.");
  }

  const prisma = getPrisma();
  const employee = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, isActive: true },
    select: { id: true, name: true, employeeCode: true, pinHash: true },
  });

  if (!employee) {
    return jsonError("Employee not found.", 404);
  }

  const pinValid = await verifyEmployeePin(parsed.data.pin, employee.pinHash);

  if (!pinValid) {
    return jsonError("Invalid PIN.", 401);
  }

  const shiftDefinition = await prisma.shiftDefinition.findFirst({
    where: { id: parsed.data.shiftDefinitionId, isActive: true },
    select: { id: true, name: true, type: true },
  });

  if (!shiftDefinition) {
    return jsonError("Shift not found.", 404);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: parsed.data.jobId, deletedAt: null },
        select: { id: true, workflowStatus: true, assignedPrinterId: true, printedQuantity: true, requiredQuantity: true, quantity: true },
      });

      if (!project) {
        throw new Error("JOB_NOT_FOUND");
      }

      if (project.workflowStatus !== "IN_PROGRESS") {
        assertValidJobStatusTransition(project.workflowStatus, "IN_PROGRESS");
      }

      const activeRun = await tx.productionRun.findFirst({
        where: { projectId: project.id, status: "ACTIVE" },
        select: { id: true },
      });

      if (activeRun) {
        throw new Error("JOB_ALREADY_ACTIVE");
      }

      const shiftSession = await tx.shiftSession.create({
        data: {
          employeeId: employee.id,
          shiftDefinitionId: shiftDefinition.id,
          verifiedAt: new Date(),
        },
        select: { id: true },
      });

      const run = await tx.productionRun.create({
        data: {
          projectId: project.id,
          printerId: project.assignedPrinterId,
          startedByEmployeeId: employee.id,
          currentEmployeeId: employee.id,
          shiftSessionId: shiftSession.id,
        },
        select: { id: true },
      });

      await tx.project.update({
        where: { id: project.id },
        data: {
          workflowStatus: "IN_PROGRESS",
          status: "PRINTING",
          startDate: new Date(),
        },
      });

      if (project.assignedPrinterId) {
        await tx.printer.update({
          where: { id: project.assignedPrinterId },
          data: {
            status: "BUSY",
            currentProjectId: project.id,
            currentEmployeeId: null,
          },
        });
      }

      await tx.jobProgressUpdate.create({
        data: {
          projectId: project.id,
          productionRunId: run.id,
          employeeId: employee.id,
          shiftSessionId: shiftSession.id,
          printedQuantity: project.printedQuantity,
          remainingQuantity: (project.requiredQuantity ?? project.quantity) - project.printedQuantity,
          note: `Printing started by ${employee.name}.`,
        },
      });

      await tx.activityLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          projectId: project.id,
          shiftSessionId: shiftSession.id,
          action: "JOB_PRINTING_STARTED",
          entity: "Project",
          entityId: project.id,
          metadata: { productionRunId: run.id, shift: shiftDefinition.type },
        },
      });

      return { shiftSession, run };
    });

    const expiresAt = getEmployeeSessionExpiry();
    const sessionToken = createEmployeeSessionToken();

    await prisma.employeeSession.create({
      data: {
        employeeId: employee.id,
        sessionToken,
        shiftSessionId: result.shiftSession.id,
        verifiedAt: new Date(),
        expiresAt,
        lastSeenAt: new Date(),
      },
    });

    const response = NextResponse.json({
      ok: true,
      session: {
        employee: { id: employee.id, name: employee.name, employeeCode: employee.employeeCode },
        shift: shiftDefinition,
        expiresAt: expiresAt.toISOString(),
      },
      run: result.run,
    });

    response.headers.set("Set-Cookie", buildEmployeeSessionCookie(sessionToken, expiresAt));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "JOB_NOT_FOUND") {
      return jsonError("Job not found.", 404);
    }

    if (error instanceof Error && error.message === "JOB_ALREADY_ACTIVE") {
      return jsonError("This job is already in progress.", 409);
    }

    return jsonError(error instanceof Error ? error.message : "Could not start printing.", 400);
  }
}
