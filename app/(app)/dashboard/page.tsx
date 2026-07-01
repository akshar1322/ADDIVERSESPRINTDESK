import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  DollarSign,
  PackageCheck,
  Printer,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const metrics = [
  { label: "Projects", value: "148", delta: "+12 this month", icon: PackageCheck },
  { label: "Printing", value: "23", delta: "7 urgent jobs", icon: Printer },
  { label: "Employees", value: "18", delta: "14 active today", icon: Users },
  { label: "Deliveries", value: "31", delta: "9 due this week", icon: CalendarClock },
  { label: "Pending", value: "42", delta: "Needs assignment", icon: CircleDot },
  { label: "Completed", value: "96", delta: "92% on time", icon: CheckCircle2 },
  { label: "Revenue", value: "$42.8k", delta: "+18.4%", icon: DollarSign },
];

const projects = [
  {
    name: "Aerospace bracket batch",
    customer: "HelioWorks",
    status: "Printing",
    priority: "Urgent",
    progress: "64%",
    delivery: "Jul 02",
  },
  {
    name: "Dental aligner trays",
    customer: "Northline Dental",
    status: "Quality check",
    priority: "High",
    progress: "100%",
    delivery: "Jul 01",
  },
  {
    name: "Retail display prototypes",
    customer: "BrightShelf",
    status: "Assigned",
    priority: "Medium",
    progress: "18%",
    delivery: "Jul 06",
  },
  {
    name: "Drone enclosure revision C",
    customer: "AeroNest",
    status: "Paused",
    priority: "High",
    progress: "41%",
    delivery: "Jul 04",
  },
];

const printerUsage = [
  { name: "Formlabs Fuse 1+", value: 88 },
  { name: "Bambu X1 Carbon", value: 74 },
  { name: "Ultimaker S7", value: 52 },
  { name: "Prusa XL", value: 39 },
];

function priorityVariant(priority: string) {
  if (priority === "Urgent") return "amber" as const;
  if (priority === "High") return "blue" as const;
  return "secondary" as const;
}

export default function DashboardPage() {
  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-blue-600">Production dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Today&apos;s print floor</h1>
          <p className="mt-2 text-muted-foreground">
            Live workload, printer utilization, delivery pressure, and operator progress.
          </p>
        </div>
        <Badge variant="green" className="w-fit">
          Cloud sync healthy
        </Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardDescription>{metric.label}</CardDescription>
              <metric.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="size-3" />
                {metric.delta}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Active projects</CardTitle>
            <CardDescription>Orders currently moving through assignment, printing, and dispatch.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.name}>
                    <TableCell>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs text-muted-foreground">{project.customer}</div>
                    </TableCell>
                    <TableCell>{project.status}</TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant(project.priority)}>{project.priority}</Badge>
                    </TableCell>
                    <TableCell>{project.progress}</TableCell>
                    <TableCell className="text-right">{project.delivery}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Printer usage</CardTitle>
            <CardDescription>Current utilization across connected machines.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {printerUsage.map((printer) => (
              <div key={printer.name} className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{printer.name}</span>
                  <span className="text-muted-foreground">{printer.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${printer.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
