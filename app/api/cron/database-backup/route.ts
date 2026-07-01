import { getPrisma } from "@/lib/prisma";
import { requireCronSecret } from "@/server/http";
import { buildBackupKey, getStorageProvider } from "@/server/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!requireCronSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const prisma = getPrisma();
  const storage = getStorageProvider();
  const backupJob = await prisma.backupJob.create({
    data: {
      status: "PENDING",
      storageProvider: storage.name,
    },
    select: { id: true },
  });

  try {
    const snapshot = {
      generatedAt: new Date().toISOString(),
      customers: await prisma.customer.findMany(),
      printers: await prisma.printer.findMany(),
      projects: await prisma.project.findMany(),
      projectFiles: await prisma.projectFile.findMany(),
      productionEvents: await prisma.productionEvent.findMany(),
      notifications: await prisma.notification.findMany(),
      settings: await prisma.setting.findMany(),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    const storedBackup = await storage.put(buildBackupKey(), {
      bytes,
      contentType: "application/json",
      fileName: "printflow-backup.json",
    });

    const completedJob = await prisma.backupJob.update({
      where: { id: backupJob.id },
      data: {
        status: "COMPLETED",
        storageKey: storedBackup.key,
        size: storedBackup.size,
        checksum: storedBackup.checksum,
        completedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        storageProvider: true,
        storageKey: true,
        size: true,
        checksum: true,
        completedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "DATABASE_BACKUP_COMPLETED",
        entity: "BackupJob",
        entityId: completedJob.id,
        metadata: { storageKey: completedJob.storageKey },
      },
    });

    return Response.json({ ok: true, backup: completedJob });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed.";
    await prisma.backupJob.update({
      where: { id: backupJob.id },
      data: {
        status: "FAILED",
        error: message,
        completedAt: new Date(),
      },
    });

    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
