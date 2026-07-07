import { Trash2 } from "lucide-react";

import { deleteJob } from "@/app/admin/jobs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateJobDialog } from "@/components/jobs/create-job-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const prisma = getPrisma();
  const [jobs, clients, printers, employees] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
      select: {
        id: true,
        jobNumber: true,
        name: true,
        workflowStatus: true,
        priority: true,
        quantity: true,
        requiredQuantity: true,
        printedQuantity: true,
        expectedCompletionAt: true,
        customer: { select: { name: true } },
        assignedPrinter: { select: { name: true } },
        progressUpdates: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { note: true, remainingQuantity: true },
        },
      },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, company: true, phone: true },
    }),
    prisma.printer.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">Jobs</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Production jobs</h1>
        </div>
        <CreateJobDialog clients={clients} printers={printers} employees={employees} />
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {decodeURIComponent(error)}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700">
          {decodeURIComponent(success)}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Job list</CardTitle>
          <CardDescription>Newest jobs first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Printer</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-medium">{job.name}</div>
                    <div className="text-xs text-muted-foreground">{job.jobNumber ?? job.id}</div>
                  </TableCell>
                  <TableCell>{job.customer.name}</TableCell>
                  <TableCell>{job.workflowStatus}</TableCell>
                  <TableCell>
                    <Badge variant={job.priority === "URGENT" || job.priority === "HIGH" ? "amber" : "secondary"}>
                      {job.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {job.printedQuantity} / {job.requiredQuantity ?? job.quantity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {job.progressUpdates[0]
                        ? `${job.progressUpdates[0].remainingQuantity} remaining`
                        : `${(job.requiredQuantity ?? job.quantity) - job.printedQuantity} remaining`}
                    </div>
                    {job.progressUpdates[0]?.note ? (
                      <div className="max-w-52 truncate text-xs text-muted-foreground">{job.progressUpdates[0].note}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{job.assignedPrinter?.name ?? "Unassigned"}</TableCell>
                  <TableCell className="text-right">
                    {job.expectedCompletionAt ? job.expectedCompletionAt.toLocaleDateString() : "Not set"}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={deleteJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <Button type="submit" size="icon" variant="destructive" title="Delete job">
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete {job.name}</span>
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
