import { getPrisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/session";
import { canManageStorage } from "@/server/authz";
import { jsonError } from "@/server/http";
import {
  assertUploadableFile,
  buildStorageObject,
  buildUploadKey,
  getFileKind,
  getStorageProvider,
} from "@/server/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const { projectId } = await context.params;
  const files = await getPrisma().projectFile.findMany({
    where: {
      projectId,
      deletedAt: null,
      kind: { not: "FOLDER" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      kind: true,
      mimeType: true,
      size: true,
      checksum: true,
      storageProvider: true,
      storageKey: true,
      publicUrl: true,
      deletionScheduledAt: true,
      createdAt: true,
    },
  });

  return Response.json({ ok: true, files });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (!canManageStorage(session)) {
    return jsonError("Only admins can upload production files.", 403);
  }

  const { projectId } = await context.params;
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    return jsonError("Project not found.", 404);
  }

  const formData = await request.formData();
  const uploadedFiles = formData.getAll("files").filter((value): value is File => value instanceof File);

  if (uploadedFiles.length === 0) {
    return jsonError("Upload at least one file.");
  }

  const storage = getStorageProvider();
  const records = [];

  for (const file of uploadedFiles) {
    assertUploadableFile(file);
    const key = buildUploadKey(projectId, file.name);
    const storedFile = await storage.put(key, await buildStorageObject(file));
    const record = await prisma.projectFile.create({
      data: {
        projectId,
        name: file.name,
        kind: getFileKind(file.name),
        mimeType: file.type || "application/octet-stream",
        size: storedFile.size,
        checksum: storedFile.checksum,
        storageProvider: storage.name,
        storageKey: storedFile.key,
        publicUrl: storedFile.url,
        uploadedById: session.user.id,
      },
      select: {
        id: true,
        name: true,
        kind: true,
        size: true,
        checksum: true,
        storageProvider: true,
        storageKey: true,
        createdAt: true,
      },
    });

    records.push(record);
  }

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: "PROJECT_FILES_UPLOADED",
      entity: "Project",
      entityId: projectId,
      metadata: { count: records.length },
    },
  });

  return Response.json({ ok: true, files: records }, { status: 201 });
}
