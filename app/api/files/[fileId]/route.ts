import { getPrisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/session";
import { canManageStorage } from "@/server/authz";
import { jsonError } from "@/server/http";
import { getStorageProvider } from "@/server/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (!canManageStorage(session)) {
    return jsonError("Only admins can delete files.", 403);
  }

  const { fileId } = await context.params;
  const url = new URL(request.url);
  const scheduleAt = url.searchParams.get("scheduleAt");
  const prisma = getPrisma();
  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    select: { id: true, projectId: true, storageKey: true },
  });

  if (!file) {
    return jsonError("File not found.", 404);
  }

  const deletionScheduledAt = scheduleAt ? new Date(scheduleAt) : null;

  if (scheduleAt && Number.isNaN(deletionScheduledAt?.getTime())) {
    return jsonError("scheduleAt must be a valid ISO date.");
  }

  if (scheduleAt) {
    const scheduledFile = await prisma.projectFile.update({
      where: { id: fileId },
      data: { deletionScheduledAt },
      select: { id: true, name: true, deletionScheduledAt: true },
    });

    return Response.json({ ok: true, file: scheduledFile });
  }

  if (file.storageKey) {
    await getStorageProvider().delete(file.storageKey);
  }

  const deletedFile = await prisma.projectFile.update({
    where: { id: fileId },
    data: {
      deletedAt: new Date(),
      storageDeletedAt: new Date(),
    },
    select: { id: true, name: true, deletedAt: true, storageDeletedAt: true },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: "PROJECT_FILE_DELETED",
      entity: "ProjectFile",
      entityId: fileId,
      metadata: { projectId: file.projectId },
    },
  });

  return Response.json({ ok: true, file: deletedFile });
}
