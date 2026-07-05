import { revalidatePath } from "next/cache";
import { Save, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { canManageUsers, getRole } from "@/server/authz";

export const dynamic = "force-dynamic";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalString(formData: FormData, key: string) {
  return readString(formData, key) || null;
}

function parseRole(value: string, actorRole: string) {
  if (value === "MASTER_ADMIN" && actorRole === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (value === "SUB_ADMIN") return "SUB_ADMIN";
  return "EMPLOYEE";
}

function parseStatus(value: string) {
  if (value === "ACTIVE" || value === "SUSPENDED") return value;
  return "INVITED";
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function getRoleVariant(role: string) {
  if (role === "MASTER_ADMIN") return "blue";
  if (role === "SUB_ADMIN") return "amber";
  return "secondary";
}

function getStatusVariant(status: string) {
  if (status === "ACTIVE") return "green";
  if (status === "SUSPENDED") return "amber";
  return "outline";
}

async function assertCanManageEmployeeUsers() {
  const session = await requireSession();

  if (!canManageUsers(session)) {
    throw new Error("Only admins can manage users.");
  }

  return { session, actorRole: getRole(session) };
}

async function updateUser(formData: FormData) {
  "use server";

  const { session, actorRole } = await assertCanManageEmployeeUsers();
  const userId = readString(formData, "userId");
  const name = readString(formData, "name");
  const phone = readOptionalString(formData, "phone");
  const role = parseRole(readString(formData, "role"), actorRole);
  const status = parseStatus(readString(formData, "status"));

  if (!userId || !name) {
    throw new Error("User id and name are required.");
  }

  const prisma = getPrisma();
  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, role: true },
  });

  if (!target) {
    throw new Error("User not found.");
  }

  if (target.role === "MASTER_ADMIN" && actorRole !== "MASTER_ADMIN") {
    throw new Error("Only master admins can update a master admin.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      phone,
      role,
      status,
      updatedById: session.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      actorAdminId: session.user.id,
      actorType: "ADMIN",
      action: "USER_UPDATED",
      entity: "User",
      entityId: userId,
      metadata: { role, status },
    },
  });

  revalidatePath("/admin/employees");
}

async function deleteUser(formData: FormData) {
  "use server";

  const { session, actorRole } = await assertCanManageEmployeeUsers();
  const userId = readString(formData, "userId");

  if (!userId) {
    throw new Error("User id is required.");
  }

  if (userId === session.user.id) {
    throw new Error("You cannot delete your own signed-in account.");
  }

  const prisma = getPrisma();
  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, role: true },
  });

  if (!target) {
    throw new Error("User not found.");
  }

  if (target.role === "MASTER_ADMIN" && actorRole !== "MASTER_ADMIN") {
    throw new Error("Only master admins can delete a master admin.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      status: "SUSPENDED",
      updatedById: session.user.id,
    },
  });

  await prisma.session.deleteMany({ where: { userId } });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      actorAdminId: session.user.id,
      actorType: "ADMIN",
      action: "USER_SOFT_DELETED",
      entity: "User",
      entityId: userId,
      metadata: { previousRole: target.role },
    },
  });

  revalidatePath("/admin/employees");
}

export default async function AdminEmployeesPage() {
  const session = await requireSession();
  const currentRole = getRole(session);
  const employees = await getPrisma().user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: 100,
    select: { id: true, name: true, email: true, role: true, status: true, phone: true },
  });

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
          <Users className="size-4" />
          Employees
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Team directory</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Update staff details, adjust access, suspend accounts, or soft-delete users while keeping audit history.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
          <CardDescription>Changes are recorded with the current admin identity.</CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No active users found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-60">User</TableHead>
                  <TableHead className="min-w-40">Phone</TableHead>
                  <TableHead className="min-w-40">Role</TableHead>
                  <TableHead className="min-w-36">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const isProtectedMasterAdmin = employee.role === "MASTER_ADMIN" && currentRole !== "MASTER_ADMIN";
                  const isSelf = employee.id === session.user.id;

                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <form id={`update-${employee.id}`} action={updateUser} className="grid gap-2">
                          <input type="hidden" name="userId" value={employee.id} />
                          <Label htmlFor={`name-${employee.id}`} className="sr-only">
                            Name
                          </Label>
                          <Input
                            id={`name-${employee.id}`}
                            name="name"
                            defaultValue={employee.name}
                            disabled={isProtectedMasterAdmin}
                            required
                          />
                          <div className="text-xs text-muted-foreground">{employee.email}</div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant={getRoleVariant(employee.role)}>{formatLabel(employee.role)}</Badge>
                            <Badge variant={getStatusVariant(employee.status)}>{formatLabel(employee.status)}</Badge>
                          </div>
                        </form>
                      </TableCell>
                      <TableCell>
                        <Input
                          form={`update-${employee.id}`}
                          name="phone"
                          defaultValue={employee.phone ?? ""}
                          disabled={isProtectedMasterAdmin}
                          placeholder="+91..."
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          form={`update-${employee.id}`}
                          name="role"
                          className={cn(selectClass, "h-9")}
                          defaultValue={employee.role}
                          disabled={isProtectedMasterAdmin}
                        >
                          {currentRole === "MASTER_ADMIN" ? <option value="MASTER_ADMIN">Master Admin</option> : null}
                          <option value="SUB_ADMIN">Sub Admin</option>
                          <option value="EMPLOYEE">Employee</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          form={`update-${employee.id}`}
                          name="status"
                          className={cn(selectClass, "h-9")}
                          defaultValue={employee.status}
                          disabled={isProtectedMasterAdmin}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INVITED">Invited</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button form={`update-${employee.id}`} type="submit" size="icon" variant="outline" disabled={isProtectedMasterAdmin}>
                            <Save className="size-4" />
                            <span className="sr-only">Save {employee.name}</span>
                          </Button>
                          <form action={deleteUser}>
                            <input type="hidden" name="userId" value={employee.id} />
                            <Button
                              type="submit"
                              size="icon"
                              variant="destructive"
                              disabled={isProtectedMasterAdmin || isSelf}
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Delete {employee.name}</span>
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
