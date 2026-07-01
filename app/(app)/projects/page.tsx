import { revalidatePath } from "next/cache";
import { Boxes, CalendarClock, FileUp, Plus } from "lucide-react";

import { ProjectDeletePanel } from "@/components/projects/project-delete-panel";
import { StorageManagementPanel } from "@/components/storage/storage-management-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getPrisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageProjects } from "@/server/authz";

export const dynamic = "force-dynamic";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalString(formData: FormData, key: string) {
  return readString(formData, key) || null;
}

function readPositiveNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseDate(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error("A valid delivery date is required.");
  }

  return date;
}

function parseOptionalDate(value: string) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePriority(value: string) {
  if (value === "LOW" || value === "HIGH" || value === "URGENT") return value;
  return "MEDIUM";
}

function parseProjectStatus(value: string) {
  if (
    value === "ASSIGNED" ||
    value === "PRINTING" ||
    value === "PAUSED" ||
    value === "QUALITY_CHECK" ||
    value === "READY_FOR_PICKUP"
  ) {
    return value;
  }

  return "DRAFT";
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPriorityVariant(priority: string) {
  if (priority === "URGENT" || priority === "HIGH") return "amber";
  if (priority === "LOW") return "secondary";
  return "blue";
}

async function createProject(formData: FormData) {
  "use server";

  const session = await requireSession();

  if (!canManageProjects(session)) {
    throw new Error("Only admins can create projects.");
  }

  const name = readString(formData, "name");
  const material = readString(formData, "material");
  const customerId = readOptionalString(formData, "customerId");
  const customerName = readOptionalString(formData, "customerName");

  if (!name || !material) {
    throw new Error("Project name and material are required.");
  }

  const prisma = getPrisma();
  let finalCustomerId = customerId;

  if (!finalCustomerId) {
    if (!customerName) {
      throw new Error("Choose a customer or enter a new customer name.");
    }

    const customer = await prisma.customer.create({
      data: {
        name: customerName,
        email: readOptionalString(formData, "customerEmail"),
        phone: readOptionalString(formData, "customerPhone"),
        whatsapp: readOptionalString(formData, "customerWhatsapp"),
        address: readOptionalString(formData, "customerAddress"),
        notes: "Created while adding a project.",
        createdById: session.user.id,
        updatedById: session.user.id,
      },
      select: { id: true },
    });

    finalCustomerId = customer.id;
  }

  const project = await prisma.project.create({
    data: {
      name,
      description: readOptionalString(formData, "description"),
      priority: parsePriority(readString(formData, "priority")),
      status: parseProjectStatus(readString(formData, "status")),
      quantity: readPositiveNumber(formData, "quantity", 1),
      material,
      color: readOptionalString(formData, "color"),
      deliveryDate: parseDate(readString(formData, "deliveryDate")),
      startDate: parseOptionalDate(readString(formData, "startDate")),
      estimatedPrintTime: readPositiveNumber(formData, "estimatedPrintTime", 0) || null,
      notes: readOptionalString(formData, "notes"),
      customerId: finalCustomerId,
      assignedEmployeeId: readOptionalString(formData, "assignedEmployeeId"),
      assignedPrinterId: readOptionalString(formData, "assignedPrinterId"),
      createdById: session.user.id,
      updatedById: session.user.id,
    },
    select: { id: true },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: "PROJECT_CREATED",
      entity: "Project",
      entityId: project.id,
      metadata: { name },
    },
  });

  revalidatePath("/projects");
}

async function getProjectPageData() {
  const prisma = getPrisma();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  return Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: [{ priority: "desc" }, { deliveryDate: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        priority: true,
        status: true,
        quantity: true,
        printedQuantity: true,
        material: true,
        color: true,
        deliveryDate: true,
        estimatedPrintTime: true,
        customer: { select: { name: true } },
        assignedEmployee: { select: { name: true } },
        assignedPrinter: { select: { name: true } },
        _count: { select: { files: true } },
      },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, company: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, status: "ACTIVE", role: { in: ["EMPLOYEE", "SUB_ADMIN"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.printer.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, model: true, status: true },
    }),
    prisma.project.count({
      where: {
        deletedAt: null,
        status: { not: "COMPLETED" },
      },
    }),
    prisma.project.count({
      where: {
        deletedAt: null,
        deliveryDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
    }),
  ]);
}

export default async function ProjectsPage() {
  const session = await requireSession();
  const [projects, customers, employees, printers, activeProjects, dueSoon] = await getProjectPageData();
  const canCreate = canManageProjects(session);

  return (
    <main className="grid gap-5 p-4 md:p-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Boxes className="size-4" />
            Project desk
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">Projects</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Add project details, assign employees and printers, track materials, and attach production files.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total projects</CardDescription>
            <CardTitle className="text-2xl">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active work</CardDescription>
            <CardTitle className="text-2xl">{activeProjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Due within 7 days</CardDescription>
            <CardTitle className="text-2xl">{dueSoon}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {canCreate ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-muted-foreground" />
              <CardTitle>Create project</CardTitle>
            </div>
            <CardDescription>Use an existing customer or enter a new one while creating the project.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createProject} className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-4">
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="name">Project name</Label>
                  <Input id="name" name="name" placeholder="Nylon bracket batch" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select id="priority" name="priority" className={selectClass} defaultValue="MEDIUM">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" name="status" className={selectClass} defaultValue="DRAFT">
                    <option value="DRAFT">Draft</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="PRINTING">Printing</option>
                    <option value="PAUSED">Paused</option>
                    <option value="QUALITY_CHECK">Quality Check</option>
                    <option value="READY_FOR_PICKUP">Ready For Pickup</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="material">Material</Label>
                  <Input id="material" name="material" placeholder="PLA, ABS, nylon" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" placeholder="Matte black" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estimatedPrintTime">Print time minutes</Label>
                  <Input id="estimatedPrintTime" name="estimatedPrintTime" type="number" min={0} placeholder="180" />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="deliveryDate">Delivery date</Label>
                  <Input id="deliveryDate" name="deliveryDate" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" name="startDate" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assignedEmployeeId">Assign employee</Label>
                  <select id="assignedEmployeeId" name="assignedEmployeeId" className={selectClass} defaultValue="">
                    <option value="">Unassigned</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} ({formatLabel(employee.role)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assignedPrinterId">Assign printer</Label>
                  <select id="assignedPrinterId" name="assignedPrinterId" className={selectClass} defaultValue="">
                    <option value="">No printer</option>
                    {printers.map((printer) => (
                      <option key={printer.id} value={printer.id}>
                        {printer.name} ({formatLabel(printer.status)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Print requirements, tolerances, infill, supports, finish..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Internal notes</Label>
                  <Textarea id="notes" name="notes" placeholder="Operator notes, customer reminders, special handling..." />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-5">
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="customerId">Existing customer</Label>
                  <select id="customerId" name="customerId" className={selectClass} defaultValue="">
                    <option value="">Create new customer below</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.company ? ` - ${customer.company}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customerName">New customer</Label>
                  <Input id="customerName" name="customerName" placeholder="Customer name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customerEmail">Customer email</Label>
                  <Input id="customerEmail" name="customerEmail" type="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customerPhone">Customer phone</Label>
                  <Input id="customerPhone" name="customerPhone" />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_2fr_auto]">
                <div className="grid gap-2">
                  <Label htmlFor="customerWhatsapp">WhatsApp</Label>
                  <Input id="customerWhatsapp" name="customerWhatsapp" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customerAddress">Delivery address</Label>
                  <Input id="customerAddress" name="customerAddress" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    <Plus className="size-4" />
                    Create project
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Project list</CardTitle>
          <CardDescription>Use the project ID when uploading files in the upload panel below.</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No projects yet. Create one above to start tracking production.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="font-medium">{project.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant={getPriorityVariant(project.priority)}>{formatLabel(project.priority)}</Badge>
                        <Badge variant="outline">{formatLabel(project.status)}</Badge>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">{project.id}</div>
                    </TableCell>
                    <TableCell>{project.customer.name}</TableCell>
                    <TableCell>
                      <div>{project.assignedEmployee?.name ?? "Unassigned"}</div>
                      <div className="text-xs text-muted-foreground">{project.assignedPrinter?.name ?? "No printer"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{project.material}</div>
                      <div className="text-xs text-muted-foreground">{project.color ?? "No color"}</div>
                    </TableCell>
                    <TableCell>
                      {project.printedQuantity}/{project.quantity}
                      <div className="text-xs text-muted-foreground">
                        {project.estimatedPrintTime ? `${project.estimatedPrintTime} min est.` : "No estimate"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5 text-muted-foreground" />
                        {formatDate(project.deliveryDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{project._count.files}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canCreate ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <div className="grid gap-5">
            <div className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
              <FileUp className="size-4" />
              Upload and retention
            </div>
            <StorageManagementPanel />
          </div>
          <ProjectDeletePanel />
        </section>
      ) : null}
    </main>
  );
}
