import { readFile } from "node:fs/promises";
import path from "node:path";

import { getPrisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/session";
import { canManageStorage } from "@/server/authz";
import { getEmployeeWorkspaceSession } from "@/server/employee-sessions";
import { jsonError } from "@/server/http";
import { getStorageProvider } from "@/server/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

function localStoragePath(key: string) {
  const storageRoot = path.join(process.cwd(), ".storage");
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(storageRoot, normalized);
}

export async function GET(request: Request, context: RouteContext) {
  const prisma = getPrisma();
  const adminSession = await getSessionFromRequest(request);
  const employeeSession = await getEmployeeWorkspaceSession(prisma, request.headers.get("cookie"));

  if (!adminSession && !employeeSession) {
    return jsonError("Unauthorized", 401);
  }

  const { fileId } = await context.params;
  const file = await prisma.projectFile.findFirst({
    where: { id: fileId, deletedAt: null },
    select: { name: true, mimeType: true, storageProvider: true, storageKey: true, publicUrl: true },
  });

  if (!file?.storageKey) {
    return jsonError("File not found.", 404);
  }

  if (file.publicUrl && file.storageProvider !== "LOCAL") {
    return Response.redirect(file.publicUrl);
  }

  if (file.storageProvider !== "LOCAL") {
    return jsonError("This file is stored privately and has no public download URL.", 409);
  }

  const bytes = await readFile(localStoragePath(file.storageKey));

  return new Response(bytes, {
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
  });
}

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
