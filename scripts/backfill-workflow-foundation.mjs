import { PrismaPg } from "@prisma/adapter-pg";

import prismaClient from "../app/generated/prisma/index.js";

const { PrismaClient } = prismaClient;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run this backfill.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function toWorkflowStatus(status) {
  if (status === "PRINTING" || status === "PAUSED" || status === "QUALITY_CHECK") {
    return "IN_PROGRESS";
  }

  if (status === "READY_FOR_PICKUP") {
    return "READY_TO_DELIVER";
  }

  if (status === "DELIVERED" || status === "COMPLETED") {
    return "DISPATCHED";
  }

  if (status === "CANCELLED") {
    return "CANCELLED";
  }

  return "NEW";
}

function getExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function toPreviewType(kind) {
  if (kind === "STL" || kind === "OBJ" || kind === "GLB" || kind === "GLTF") {
    return "MODEL_3D";
  }

  if (kind === "IMAGE") {
    return "IMAGE";
  }

  if (kind === "PDF") {
    return "PDF";
  }

  return "DOWNLOAD_ONLY";
}

function toMaterialCode(material) {
  return material
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "MATERIAL";
}

try {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      status: true,
      quantity: true,
      deliveryDate: true,
      material: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const materialByName = new Map();

  for (const project of projects) {
    const materialName = project.material.trim();

    if (materialName && !materialByName.has(materialName.toLowerCase())) {
      const baseCode = toMaterialCode(materialName);
      let code = baseCode;
      let suffix = 1;

      while (await prisma.materialType.findUnique({ where: { code } })) {
        suffix += 1;
        code = `${baseCode}_${suffix}`;
      }

      const materialType = await prisma.materialType.create({
        data: {
          name: materialName,
          code,
          unit: "GRAM",
          isActive: true,
        },
        select: { id: true },
      });

      materialByName.set(materialName.toLowerCase(), materialType.id);
    }
  }

  let projectCount = 0;

  for (const [index, project] of projects.entries()) {
    const jobNumber = `JOB-${String(index + 1).padStart(6, "0")}`;
    const materialTypeId = materialByName.get(project.material.trim().toLowerCase()) ?? null;

    await prisma.project.update({
      where: { id: project.id },
      data: {
        workflowStatus: toWorkflowStatus(project.status),
        requiredQuantity: project.quantity,
        expectedCompletionAt: project.deliveryDate,
        jobNumber,
        materialTypeId,
      },
    });

    projectCount += 1;
  }

  const files = await prisma.projectFile.findMany({
    select: { id: true, name: true, kind: true },
  });

  for (const file of files) {
    await prisma.projectFile.update({
      where: { id: file.id },
      data: {
        fileExtension: getExtension(file.name),
        previewType: toPreviewType(file.kind),
      },
    });
  }

  await prisma.activityLog.updateMany({
    where: {
      actorId: null,
      actorType: null,
    },
    data: {
      actorType: "SYSTEM",
    },
  });

  const actorLogs = await prisma.activityLog.findMany({
    where: {
      actorId: { not: null },
      actorType: null,
    },
    select: {
      id: true,
      actorId: true,
      actor: { select: { role: true } },
    },
  });

  for (const log of actorLogs) {
    await prisma.activityLog.update({
      where: { id: log.id },
      data: {
        actorType: "ADMIN",
        actorAdminId: log.actorId,
      },
    });
  }

  await prisma.shiftDefinition.createMany({
    data: [
      { name: "Day Shift", type: "DAY", startTime: "09:00", endTime: "18:00", isActive: true },
      { name: "Night Shift", type: "NIGHT", startTime: "18:00", endTime: "03:00", isActive: true },
    ],
    skipDuplicates: true,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        projectsBackfilled: projectCount,
        filesBackfilled: files.length,
        materialsCreated: materialByName.size,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
