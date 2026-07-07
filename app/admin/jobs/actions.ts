"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Priority } from "@/app/generated/prisma";
import { getPrisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  assertUploadableFile,
  buildStorageObject,
  buildUploadKey,
  getFileKind,
  getStorageProvider,
} from "@/server/storage";

export type CreateJobState = {
  ok: boolean;
  message: string;
};

const optionalText = z.string().trim().optional().transform((value) => value || undefined);

const createJobSchema = z
  .object({
    clientMode: z.enum(["existing", "new"]),
    customerId: optionalText,
    clientName: optionalText,
    company: optionalText,
    phone: optionalText,
    whatsapp: optionalText,
    email: optionalText,
    address: optionalText,
    jobName: z.string().trim().min(2, "Job name is required."),
    quantity: z.coerce.number().int().positive("Quantity must be greater than zero."),
    material: z.string().trim().min(1, "Material is required."),
    color: optionalText,
    priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT]),
    deliveryDate: z.string().trim().min(1, "Delivery date is required."),
    expectedCompletionAt: optionalText,
    assignedPrinterId: optionalText,
    assignedEmployeeId: optionalText,
    description: optionalText,
    adminInstructions: optionalText,
    deliveryNotes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.clientMode === "existing" && !data.customerId) {
      ctx.addIssue({ code: "custom", path: ["customerId"], message: "Choose an existing client." });
    }

    if (data.clientMode === "new" && !data.clientName) {
      ctx.addIssue({ code: "custom", path: ["clientName"], message: "Client name is required." });
    }
  });

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function asDate(valueToParse: string) {
  const date = new Date(valueToParse);
  return Number.isNaN(date.getTime()) ? null : date;
}

function createJobNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `JOB-${stamp}-${suffix}`;
}

export async function createJob(_previousState: CreateJobState, formData: FormData): Promise<CreateJobState> {
  const session = await requireSession();
  const parsed = createJobSchema.safeParse({
    clientMode: value(formData, "clientMode") || "existing",
    customerId: value(formData, "customerId"),
    clientName: value(formData, "clientName"),
    company: value(formData, "company"),
    phone: value(formData, "phone"),
    whatsapp: value(formData, "whatsapp"),
    email: value(formData, "email"),
    address: value(formData, "address"),
    jobName: value(formData, "jobName"),
    quantity: value(formData, "quantity"),
    material: value(formData, "material"),
    color: value(formData, "color"),
    priority: value(formData, "priority") || Priority.MEDIUM,
    deliveryDate: value(formData, "deliveryDate"),
    expectedCompletionAt: value(formData, "expectedCompletionAt"),
    assignedPrinterId: value(formData, "assignedPrinterId"),
    assignedEmployeeId: value(formData, "assignedEmployeeId"),
    description: value(formData, "description"),
    adminInstructions: value(formData, "adminInstructions"),
    deliveryNotes: value(formData, "deliveryNotes"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the job details." };
  }

  const deliveryDate = asDate(parsed.data.deliveryDate);
  const expectedCompletionAt = parsed.data.expectedCompletionAt ? asDate(parsed.data.expectedCompletionAt) : undefined;

  if (!deliveryDate) {
    return { ok: false, message: "Delivery date is invalid." };
  }

  if (parsed.data.expectedCompletionAt && !expectedCompletionAt) {
    return { ok: false, message: "Expected completion date is invalid." };
  }

  const prisma = getPrisma();
  const uploadedFiles = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  try {
    for (const file of uploadedFiles) {
      assertUploadableFile(file);
    }

    const job = await prisma.$transaction(async (tx) => {
      const customer =
        parsed.data.clientMode === "new"
          ? await tx.customer.create({
              data: {
                name: parsed.data.clientName!,
                company: parsed.data.company,
                phone: parsed.data.phone,
                whatsapp: parsed.data.whatsapp,
                email: parsed.data.email,
                address: parsed.data.address,
              },
              select: { id: true },
            })
          : await tx.customer.findFirst({
              where: { id: parsed.data.customerId, deletedAt: null },
              select: { id: true },
            });

      if (!customer) {
        throw new Error("CLIENT_NOT_FOUND");
      }

      const project = await tx.project.create({
        data: {
          name: parsed.data.jobName,
          description: parsed.data.description,
          priority: parsed.data.priority,
          jobNumber: createJobNumber(),
          quantity: parsed.data.quantity,
          requiredQuantity: parsed.data.quantity,
          material: parsed.data.material,
          color: parsed.data.color,
          deliveryDate,
          expectedCompletionAt,
          adminInstructions: parsed.data.adminInstructions,
          deliveryNotes: parsed.data.deliveryNotes,
          customerId: customer.id,
          assignedPrinterId: parsed.data.assignedPrinterId,
          assignedEmployeeId: parsed.data.assignedEmployeeId,
          createdById: session.user.id,
        },
        select: { id: true, jobNumber: true },
      });

      if (uploadedFiles.length > 0) {
        const storage = getStorageProvider();

        for (const file of uploadedFiles) {
          const key = buildUploadKey(project.id, file.name);
          const storedFile = await storage.put(key, await buildStorageObject(file));

          await tx.projectFile.create({
            data: {
              projectId: project.id,
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
          });
        }
      }

      return project;
    });

    revalidatePath("/admin/jobs");
    revalidatePath("/admin/clients");

    return { ok: true, message: `${job.jobNumber} created.` };
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
      return { ok: false, message: "Selected client does not exist. Add the client information and try again." };
    }

    return { ok: false, message: "Could not create the job. Please try again." };
  }
}

export async function deleteJob(formData: FormData) {
  "use server";

  const session = await requireSession();
  const jobId = value(formData, "jobId");

  if (!jobId) {
    redirect("/admin/jobs?error=Missing+job+id.");
  }

  const prisma = getPrisma();
  const job = await prisma.project.findFirst({
    where: { id: jobId, deletedAt: null },
    select: { id: true, jobNumber: true },
  });

  if (!job) {
    redirect("/admin/jobs?error=Job+not+found.");
  }

  await prisma.project.update({
    where: { id: job.id },
    data: {
      deletedAt: new Date(),
      deletionScheduledAt: new Date(),
      updatedById: session.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      actorAdminId: session.user.id,
      actorType: "ADMIN",
      action: "JOB_SOFT_DELETED",
      entity: "Project",
      entityId: job.id,
      metadata: { jobNumber: job.jobNumber },
    },
  });

  revalidatePath("/admin/jobs");
  redirect("/admin/jobs?success=Job+deleted.");
}
