import { getPrisma } from "@/lib/prisma";
import { requireCronSecret } from "@/server/http";
import { getStorageProvider } from "@/server/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!requireCronSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const prisma = getPrisma();
  const now = new Date();
  const storage = getStorageProvider();

  const scheduledProjects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      deletionScheduledAt: {
        lte: now,
      },
    },
    select: {
      id: true,
    },
  });

  if (scheduledProjects.length > 0) {
    await prisma.project.updateMany({
      where: {
        id: {
          in: scheduledProjects.map((project) => project.id),
        },
      },
      data: {
        deletedAt: now,
      },
    });
  }

  const scheduledFiles = await prisma.projectFile.findMany({
    where: {
      deletedAt: null,
      deletionScheduledAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      projectId: true,
      storageKey: true,
    },
  });

  const deletedFileIds: string[] = [];

  for (const file of scheduledFiles) {
    if (file.storageKey) {
      await storage.delete(file.storageKey);
    }

    deletedFileIds.push(file.id);
  }

  if (deletedFileIds.length > 0) {
    await prisma.projectFile.updateMany({
      where: {
        id: {
          in: deletedFileIds,
        },
      },
      data: {
        deletedAt: now,
        storageDeletedAt: now,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      action: "SCHEDULED_STORAGE_RETENTION_COMPLETED",
      entity: "System",
      entityId: "storage-retention",
      metadata: {
        projectsDeleted: scheduledProjects.length,
        filesDeleted: deletedFileIds.length,
      },
    },
  });

  return Response.json({
    ok: true,
    projectsDeleted: scheduledProjects.length,
    filesDeleted: deletedFileIds.length,
  });
}
