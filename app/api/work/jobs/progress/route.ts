import { z } from "zod";

import { getPrisma } from "@/lib/prisma";
import { getEmployeeWorkspaceSession } from "@/server/employee-sessions";
import { jsonError } from "@/server/http";
import { calculateRemainingQuantity } from "@/server/workflow/validation";

export const runtime = "nodejs";

const progressSchema = z.object({
  jobId: z.string().min(1),
  printedQuantity: z.coerce.number().int().min(0),
  note: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const prisma = getPrisma();
  const session = await getEmployeeWorkspaceSession(prisma, request.headers.get("cookie"));

  if (!session?.employeeSession.shiftSession) {
    return jsonError("Verify employee and shift before updating progress.", 401);
  }

  const payload = await request.json().catch(() => null);
  const parsed = progressSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError("Job and printed quantity are required.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: parsed.data.jobId, deletedAt: null, workflowStatus: "IN_PROGRESS" },
        select: {
          id: true,
          quantity: true,
          requiredQuantity: true,
          assignedPrinterId: true,
        },
      });

      if (!project) {
        throw new Error("JOB_NOT_FOUND");
      }

      const totalQuantity = project.requiredQuantity ?? project.quantity;
      const remainingQuantity = calculateRemainingQuantity(totalQuantity, parsed.data.printedQuantity);
      const activeRun = await tx.productionRun.findFirst({
        where: { projectId: project.id, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
        select: { id: true },
      });

      const update = await tx.jobProgressUpdate.create({
        data: {
          projectId: project.id,
          productionRunId: activeRun?.id,
          employeeId: session.employeeSession.employee.id,
          shiftSessionId: session.employeeSession.shiftSession!.id,
          printedQuantity: parsed.data.printedQuantity,
          remainingQuantity,
          note: parsed.data.note,
        },
        select: { id: true, printedQuantity: true, remainingQuantity: true, note: true },
      });

      await tx.project.update({
        where: { id: project.id },
        data: {
          printedQuantity: parsed.data.printedQuantity,
          ...(remainingQuantity === 0
            ? { workflowStatus: "READY_TO_DELIVER" as const, status: "READY_FOR_PICKUP" as const, readyToDeliverAt: new Date() }
            : {}),
        },
      });

      if (remainingQuantity === 0 && project.assignedPrinterId) {
        await tx.printer.update({
          where: { id: project.assignedPrinterId },
          data: { status: "AVAILABLE", currentProjectId: null, currentEmployeeId: null },
        });
      }

      await tx.activityLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: session.employeeSession.employee.id,
          projectId: project.id,
          shiftSessionId: session.employeeSession.shiftSession!.id,
          action: "JOB_PROGRESS_UPDATED",
          entity: "Project",
          entityId: project.id,
          metadata: { printedQuantity: update.printedQuantity, remainingQuantity: update.remainingQuantity },
        },
      });

      return update;
    });

    return Response.json({ ok: true, progress: result });
  } catch (error) {
    if (error instanceof Error && error.message === "JOB_NOT_FOUND") {
      return jsonError("In-progress job not found.", 404);
    }

    return jsonError(error instanceof Error ? error.message : "Could not update progress.", 400);
  }
}
