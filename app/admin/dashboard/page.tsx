import { Activity, CalendarClock, HardDriveUpload, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";

async function getDashboardData() {
  const prisma = getPrisma();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  return Promise.all([
    prisma.project.count({ where: { deletedAt: null, workflowStatus: "NEW" } }),
    prisma.project.count({ where: { deletedAt: null, workflowStatus: "IN_PROGRESS" } }),
    prisma.project.count({ where: { deletedAt: null, workflowStatus: "READY_TO_DELIVER" } }),
    prisma.project.count({
      where: {
        deletedAt: null,
        workflowStatus: "DISPATCHED",
        dispatchedAt: { gte: now },
      },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        jobNumber: true,
        name: true,
        workflowStatus: true,
        priority: true,
        expectedCompletionAt: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        expectedCompletionAt: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      orderBy: { expectedCompletionAt: "asc" },
      take: 5,
      select: { id: true, jobNumber: true, name: true, expectedCompletionAt: true },
    }),
    prisma.printer.count({ where: { deletedAt: null, isActive: true } }),
    prisma.user.count({ where: { deletedAt: null, status: "ACTIVE" } }),
  ]);
}

function formatDate(date: Date | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPriority(priority: string) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export default async function AdminDashboardPage() {
  const [
    newCount,
    inProgressCount,
    readyCount,
    dispatchedTodayCount,
    recentJobs,
    dueSoonJobs,
    activePrinters,
    activeEmployees,
  ] = await getDashboardData();

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <section className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-blue-600">Admin dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Production overview</h1>
          <p className="mt-2 text-muted-foreground">
            Live job counts, active people, and the next work that needs attention.
          </p>
        </div>
        <Badge variant="green" className="w-fit">
          Systems online
        </Badge>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardDescription>New jobs</CardDescription>
            <HardDriveUpload className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{newCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardDescription>In progress</CardDescription>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardDescription>Ready to deliver</CardDescription>
            <CalendarClock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{readyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardDescription>Dispatched today</CardDescription>
            <Printer className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{dispatchedTodayCount}</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
            <CardDescription>Latest workflow changes across the floor.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-medium">{job.name}</div>
                      <div className="text-xs text-muted-foreground">{job.jobNumber ?? job.id}</div>
                    </TableCell>
                    <TableCell>{job.workflowStatus}</TableCell>
                    <TableCell>{formatPriority(job.priority)}</TableCell>
                    <TableCell>{job.customer.name}</TableCell>
                    <TableCell className="text-right">{formatDate(job.expectedCompletionAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Due soon</CardTitle>
              <CardDescription>Jobs due in the next 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {dueSoonJobs.map((job) => (
                <div key={job.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="font-medium">{job.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {job.jobNumber ?? job.id} • {formatDate(job.expectedCompletionAt)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity quick stats</CardTitle>
              <CardDescription>Current staffing and machine coverage.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Active printers</span>
                <span className="font-medium">{activePrinters}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active employees</span>
                <span className="font-medium">{activeEmployees}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
