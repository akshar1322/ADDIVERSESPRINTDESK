import { getPrisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/session";
import { canManageProjects } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (!canManageProjects(session)) {
    return jsonError("Only admins can delete projects.", 403);
  }

  const { projectId } = await context.params;
  const url = new URL(request.url);
  const scheduleAt = url.searchParams.get("scheduleAt");
  const prisma = getPrisma();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return jsonError("Project not found.", 404);
  }

  const deletionScheduledAt = scheduleAt ? new Date(scheduleAt) : null;

  if (scheduleAt && Number.isNaN(deletionScheduledAt?.getTime())) {
    return jsonError("scheduleAt must be a valid ISO date.");
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: scheduleAt
      ? { deletionScheduledAt, updatedById: session.user.id }
      : { deletedAt: new Date(), updatedById: session.user.id },
    select: {
      id: true,
      name: true,
      deletedAt: true,
      deletionScheduledAt: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: scheduleAt ? "PROJECT_DELETE_SCHEDULED" : "PROJECT_SOFT_DELETED",
      entity: "Project",
      entityId: projectId,
      metadata: { scheduleAt },
    },
  });

  return Response.json({ ok: true, project: updatedProject });
}
