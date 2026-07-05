import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";

export default async function AdminJobsPage() {
  const jobs = await getPrisma().project.findMany({
    where: { deletedAt: null },
    orderBy: [{ updatedAt: "desc" }],
    take: 20,
    select: {
      id: true,
      jobNumber: true,
      name: true,
      workflowStatus: true,
      priority: true,
      expectedCompletionAt: true,
      customer: { select: { name: true } },
      assignedPrinter: { select: { name: true } },
    },
  });

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">Jobs</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Production jobs</h1>
        </div>
        <Button asChild>
          <Link href="/admin/jobs/new">
            <Plus className="size-4" />
            New job
          </Link>
        </Button>
      </section>

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
                <TableHead>Printer</TableHead>
                <TableHead className="text-right">Due</TableHead>
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
                  <TableCell>{job.assignedPrinter?.name ?? "Unassigned"}</TableCell>
                  <TableCell className="text-right">
                    {job.expectedCompletionAt ? job.expectedCompletionAt.toLocaleDateString() : "Not set"}
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
