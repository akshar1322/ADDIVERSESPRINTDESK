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
        material: true,
        customer: { select: { name: true } },
        assignedPrinter: { select: { name: true } },
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
      material: true,
      customer: { select: { name: true } },
      assignedPrinter: { select: { name: true } },
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
  requiredQuantity: number | null;
  material: string;
  customer: { name: string };
  assignedPrinter: { name: string } | null;
  _count: { files: number; photos: number; progressUpdates: number };
}): EmployeeWorkspaceJob {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    client: job.customer.name,
    name: job.name,
    priority: job.priority,
    due: job.expectedCompletionAt ? job.expectedCompletionAt.toLocaleString() : "No due date",
    quantity: job.requiredQuantity ?? job.quantity,
    material: job.material,
    status: job.workflowStatus,
    printer: job.assignedPrinter?.name ?? "Unassigned",
    note: `${job._count.files} file(s), ${job._count.photos} photo(s), ${job._count.progressUpdates} update(s)`,
    filesCount: job._count.files,
    photosCount: job._count.photos,
    progressCount: job._count.progressUpdates,
  };
}
