import { cookies } from "next/headers";

import { getPrisma } from "@/lib/prisma";
import {
  employeeSessionCookieName,
  getEmployeeWorkspaceSessionByToken,
  type EmployeeWorkspaceJob,
} from "@/server/employee-sessions";

const visibleDispatchWindowMs = 24 * 60 * 60 * 1000;

export async function getEmployeeWorkspaceState() {
  const prisma = getPrisma();
  await ensureDefaultShiftDefinitions(prisma);

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(employeeSessionCookieName)?.value ?? null;
  const session = await getEmployeeWorkspaceSessionByToken(prisma, sessionToken);

  const [employees, shiftDefinitions, newJobs, inProgressJobs, readyJobs, dispatchedJobs] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true, defaultShiftType: true },
    }),
    prisma.shiftDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true, startTime: true, endTime: true },
    }),
    getJobsByStatus(prisma, ["NEW"]),
    getJobsByStatus(prisma, ["IN_PROGRESS"]),
    getJobsByStatus(prisma, ["READY_TO_DELIVER"]),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        workflowStatus: "DISPATCHED",
        dispatchedAt: {
          gte: new Date(Date.now() - visibleDispatchWindowMs),
        },
      },
      orderBy: [{ dispatchedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        jobNumber: true,
        name: true,
        priority: true,
        workflowStatus: true,
        expectedCompletionAt: true,
        requiredQuantity: true,
        quantity: true,
        printedQuantity: true,
        material: true,
        customer: { select: { name: true } },
        assignedPrinter: {
          select: { name: true, model: true, machineNumber: true, location: true, status: true, buildVolume: true },
        },
        files: {
          where: { deletedAt: null, kind: { not: "FOLDER" } },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, kind: true, size: true },
        },
        progressUpdates: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { note: true },
        },
        _count: { select: { files: true, photos: true, progressUpdates: true } },
      },
    }).then((jobs) => jobs.map(mapProjectToJob)),
  ]);

  return {
    session,
    employees,
    shiftDefinitions,
    jobsByTab: {
      new: newJobs,
      "in-progress": inProgressJobs,
      ready: [...readyJobs, ...dispatchedJobs],
    },
  };
}

async function ensureDefaultShiftDefinitions(prisma: ReturnType<typeof getPrisma>) {
  const count = await prisma.shiftDefinition.count({ where: { isActive: true } });

  if (count > 0) {
    return;
  }

  await prisma.shiftDefinition.createMany({
    data: [
      { name: "Day Shift", type: "DAY", startTime: "09:00", endTime: "18:00", isActive: true },
      { name: "Night Shift", type: "NIGHT", startTime: "18:00", endTime: "03:00", isActive: true },
    ],
    skipDuplicates: true,
  });
}

async function getJobsByStatus(prisma: ReturnType<typeof getPrisma>, statuses: Array<"NEW" | "IN_PROGRESS" | "READY_TO_DELIVER">) {
  const jobs = await prisma.project.findMany({
    where: { deletedAt: null, workflowStatus: { in: statuses } },
    orderBy: [{ priority: "desc" }, { expectedCompletionAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      jobNumber: true,
      name: true,
      priority: true,
      workflowStatus: true,
      expectedCompletionAt: true,
      requiredQuantity: true,
      quantity: true,
      printedQuantity: true,
      material: true,
      customer: { select: { name: true } },
      assignedPrinter: {
        select: { name: true, model: true, machineNumber: true, location: true, status: true, buildVolume: true },
      },
      files: {
        where: { deletedAt: null, kind: { not: "FOLDER" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, kind: true, size: true },
      },
      progressUpdates: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { note: true },
      },
      _count: { select: { files: true, photos: true, progressUpdates: true } },
    },
  });

  return jobs.map(mapProjectToJob);
}

function mapProjectToJob(job: {
  id: string;
  jobNumber: string | null;
  name: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  workflowStatus: "NEW" | "IN_PROGRESS" | "READY_TO_DELIVER" | "DISPATCHED" | "ARCHIVED" | "ON_HOLD" | "CANCELLED";
  expectedCompletionAt: Date | null;
  quantity: number;
  printedQuantity: number;
  requiredQuantity: number | null;
  material: string;
  customer: { name: string };
  assignedPrinter: {
    name: string;
    model: string;
    machineNumber: string | null;
    location: string | null;
    status: string;
    buildVolume: string | null;
  } | null;
  files: Array<{ id: string; name: string; kind: string; size: number | null }>;
  progressUpdates: Array<{ note: string | null }>;
  _count: { files: number; photos: number; progressUpdates: number };
}): EmployeeWorkspaceJob {
  const totalQuantity = job.requiredQuantity ?? job.quantity;

  return {
    id: job.id,
    jobNumber: job.jobNumber,
    client: job.customer.name,
    name: job.name,
    priority: job.priority,
    due: job.expectedCompletionAt ? job.expectedCompletionAt.toLocaleString() : "No due date",
    quantity: totalQuantity,
    printedQuantity: job.printedQuantity,
    remainingQuantity: Math.max(totalQuantity - job.printedQuantity, 0),
    material: job.material,
    status: job.workflowStatus,
    printer: job.assignedPrinter?.name ?? "Unassigned",
    printerInfo: job.assignedPrinter,
    note: `${job._count.files} file(s), ${job._count.photos} photo(s), ${job._count.progressUpdates} update(s)`,
    files: job.files,
    filesCount: job._count.files,
    photosCount: job._count.photos,
    progressCount: job._count.progressUpdates,
    latestProgressNote: job.progressUpdates[0]?.note ?? null,
  };
}
