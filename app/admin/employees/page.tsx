import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Save, Trash2, UserPlus, Users } from "lucide-react";

import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { assertValidEmployeePin, hashEmployeePin } from "@/server/employees/pin";
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

function parseShiftType(value: string) {
  if (value === "DAY" || value === "NIGHT" || value === "CUSTOM") return value;
  return null;
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

function buildEmployeeCode(userId: string) {
  return `USR-${userId.slice(-8).toUpperCase()}`;
}

async function assertCanManageEmployeeUsers() {
  const session = await requireSession();

  if (!canManageUsers(session)) {
    throw new Error("Only admins can manage users.");
  }

  return { session, actorRole: getRole(session) };
}

// ─── Server Actions ────────────────────────────────────────────────────────────

async function updateUser(formData: FormData) {
  "use server";

  try {
    const { session, actorRole } = await assertCanManageEmployeeUsers();
    const userId = readString(formData, "userId");
    const name = readString(formData, "name");
    const email = readString(formData, "email");
    const phone = readOptionalString(formData, "phone");
    const role = parseRole(readString(formData, "role"), actorRole);
    const status = parseStatus(readString(formData, "status"));
    const newPassword = readOptionalString(formData, "newPassword");
    const employeePin = readOptionalString(formData, "employeePin");
    const defaultShiftType = parseShiftType(readString(formData, "defaultShiftType"));

    if (!userId || !name || !email) {
      redirect("/admin/employees?error=Name+and+email+are+required.");
    }

    if (newPassword && newPassword.length < 8) {
      redirect("/admin/employees?error=New+password+must+be+at+least+8+characters.");
    }

    if (employeePin) {
      assertValidEmployeePin(employeePin);
    }

    const prisma = getPrisma();
    const target = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true, email: true },
    });

    if (!target) {
      redirect("/admin/employees?error=User+not+found.");
    }

    if (target.role === "MASTER_ADMIN" && actorRole !== "MASTER_ADMIN") {
      redirect("/admin/employees?error=Only+master+admins+can+update+a+master+admin.");
    }

    // Check email uniqueness if changed
    if (email !== target.email) {
      const existing = await prisma.user.findFirst({
        where: { email, deletedAt: null, id: { not: userId } },
        select: { id: true },
      });
      if (existing) {
        redirect("/admin/employees?error=That+email+is+already+in+use+by+another+account.");
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        role,
        status,
        updatedById: session.user.id,
      },
    });

    const employeeCode = buildEmployeeCode(userId);
    const existingFloorEmployee = await prisma.employee.findUnique({
      where: { employeeCode },
      select: { id: true },
    });

    if (role === "EMPLOYEE") {
      const pinHash = employeePin ? await hashEmployeePin(employeePin) : undefined;
      await prisma.employee.upsert({
        where: { employeeCode },
        create: {
          name,
          employeeCode,
          pinHash: pinHash ?? (await hashEmployeePin("1234")),
          isActive: status === "ACTIVE",
          defaultShiftType,
        },
        update: {
          name,
          isActive: status === "ACTIVE",
          defaultShiftType,
          ...(pinHash ? { pinHash } : {}),
        },
      });
    } else if (existingFloorEmployee) {
      await prisma.employee.update({
        where: { id: existingFloorEmployee.id },
        data: { isActive: false },
      });
    }

    // Reset password if provided
    if (newPassword) {
      const account = await prisma.account.findFirst({
        where: { userId, providerId: "credential" },
        select: { id: true },
      });

      if (account) {
        const { hashPassword } = await import("better-auth/crypto");
        const hashed = await hashPassword(newPassword);
        await prisma.account.update({
          where: { id: account.id },
          data: { password: hashed },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        actorAdminId: session.user.id,
        actorType: "ADMIN",
        action: "USER_UPDATED",
        entity: "User",
        entityId: userId,
        metadata: { role, status, passwordReset: !!newPassword },
      },
    });
  } catch (err: unknown) {
    // redirect() throws internally – re-throw it
    if (
      err instanceof Error &&
      (err.message === "NEXT_REDIRECT" || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
    ) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    redirect(`/admin/employees?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees?success=User+updated+successfully.");
}

async function deleteUser(formData: FormData) {
  "use server";

  try {
    const { session, actorRole } = await assertCanManageEmployeeUsers();
    const userId = readString(formData, "userId");

    if (!userId) {
      redirect("/admin/employees?error=User+id+is+required.");
    }

    if (userId === session.user.id) {
      redirect("/admin/employees?error=You+cannot+delete+your+own+signed-in+account.");
    }

    const prisma = getPrisma();
    const target = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true },
    });

    if (!target) {
      redirect("/admin/employees?error=User+not+found.");
    }

    if (target.role === "MASTER_ADMIN" && actorRole !== "MASTER_ADMIN") {
      redirect("/admin/employees?error=Only+master+admins+can+delete+a+master+admin.");
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
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message === "NEXT_REDIRECT" || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
    ) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    redirect(`/admin/employees?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees?success=User+removed+successfully.");
}

async function createUser(formData: FormData) {
  "use server";

  try {
    const { session, actorRole } = await assertCanManageEmployeeUsers();
    const name = readString(formData, "name");
    const email = readString(formData, "email");
    const password = readString(formData, "password");
    const phone = readOptionalString(formData, "phone");
    const role = parseRole(readString(formData, "role"), actorRole);
    const employeePin = readOptionalString(formData, "employeePin");
    const defaultShiftType = parseShiftType(readString(formData, "defaultShiftType"));

    if (!name || !email || !password) {
      redirect("/admin/employees?error=Name%2C+email%2C+and+password+are+required.");
    }

    if (password.length < 8) {
      redirect("/admin/employees?error=Password+must+be+at+least+8+characters.");
    }

    if (role === "EMPLOYEE" && !employeePin) {
      redirect("/admin/employees?error=PIN+is+required+when+creating+an+employee.");
    }

    if (employeePin) {
      assertValidEmployeePin(employeePin);
    }

    // Check if email already exists
    const prisma = getPrisma();
    const existing = await prisma.user.findFirst({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing) {
      redirect("/admin/employees?error=A+user+with+that+email+already+exists.+Use+a+different+email.");
    }

    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!result?.user?.id) {
      redirect("/admin/employees?error=Failed+to+create+user+account.");
    }

    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        role,
        phone,
        status: "INVITED",
        createdById: session.user.id,
        updatedById: session.user.id,
      },
    });

    if (role === "EMPLOYEE") {
      await prisma.employee.create({
        data: {
          name,
          employeeCode: buildEmployeeCode(result.user.id),
          pinHash: await hashEmployeePin(employeePin!),
          isActive: false,
          defaultShiftType,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        actorAdminId: session.user.id,
        actorType: "ADMIN",
        action: "USER_CREATED",
        entity: "User",
        entityId: result.user.id,
        metadata: { role, email },
      },
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message === "NEXT_REDIRECT" || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
    ) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    redirect(`/admin/employees?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees?success=Employee+created+successfully.");
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireSession();
  const currentRole = getRole(session);
  const { error, success } = await searchParams;

  const prisma = getPrisma();
  const [employees, floorEmployees] = await Promise.all([
    prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: 100,
    select: { id: true, name: true, email: true, role: true, status: true, phone: true },
    }),
    prisma.employee.findMany({
      select: { employeeCode: true, defaultShiftType: true },
    }),
  ]);
  const floorEmployeeByCode = new Map(floorEmployees.map((employee) => [employee.employeeCode, employee]));

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
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

      {/* Error / Success banners */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{decodeURIComponent(error)}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{decodeURIComponent(success)}</span>
        </div>
      )}

      {/* Add new employee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-blue-600" />
            Add new employee
          </CardTitle>
          <CardDescription>Create a new staff account with login credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="new-name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input id="new-name" name="name" placeholder="Jane Doe" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-email">
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input id="new-email" name="email" type="email" placeholder="jane@example.com" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input id="new-password" name="password" type="password" placeholder="Min. 8 characters" required minLength={8} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-phone">Phone number</Label>
              <Input id="new-phone" name="phone" placeholder="+91..." />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-role">
                Role <span className="text-destructive">*</span>
              </Label>
              <select id="new-role" name="role" className={selectClass} defaultValue="EMPLOYEE">
                {currentRole === "MASTER_ADMIN" ? <option value="MASTER_ADMIN">Master Admin</option> : null}
                <option value="SUB_ADMIN">Sub Admin</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-employee-pin">Employee PIN</Label>
              <Input id="new-employee-pin" name="employeePin" inputMode="numeric" placeholder="4-12 digits for work floor" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-default-shift">Default shift</Label>
              <select id="new-default-shift" name="defaultShiftType" className={selectClass} defaultValue="DAY">
                <option value="DAY">Day</option>
                <option value="NIGHT">Night</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full gap-2">
                <UserPlus className="size-4" />
                Add employee
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Staff accounts table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
          <CardDescription>
            Edit name, email, phone, role, status, or reset a password inline — then click Save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No active users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-56">Name</TableHead>
                    <TableHead className="min-w-48">Email</TableHead>
                    <TableHead className="min-w-36">Phone</TableHead>
                    <TableHead className="min-w-36">Role</TableHead>
                    <TableHead className="min-w-32">Status</TableHead>
                    <TableHead className="min-w-48">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="size-3.5" />
                        New password
                      </span>
                    </TableHead>
                    <TableHead className="min-w-40">Work PIN</TableHead>
                    <TableHead className="min-w-36">Default shift</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const isProtectedMasterAdmin = employee.role === "MASTER_ADMIN" && currentRole !== "MASTER_ADMIN";
                    const isSelf = employee.id === session.user.id;
                    const floorEmployee = floorEmployeeByCode.get(buildEmployeeCode(employee.id));

                    return (
                      <TableRow key={employee.id}>
                        {/* Name — hosts the update form */}
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
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant={getRoleVariant(employee.role)}>{formatLabel(employee.role)}</Badge>
                              <Badge variant={getStatusVariant(employee.status)}>{formatLabel(employee.status)}</Badge>
                            </div>
                          </form>
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          <Input
                            form={`update-${employee.id}`}
                            name="email"
                            type="email"
                            defaultValue={employee.email}
                            disabled={isProtectedMasterAdmin}
                            required
                          />
                        </TableCell>

                        <TableCell>
                          <select
                            form={`update-${employee.id}`}
                            name="defaultShiftType"
                            className={cn(selectClass, "h-9")}
                            defaultValue={floorEmployee?.defaultShiftType ?? "DAY"}
                            disabled={isProtectedMasterAdmin || employee.role !== "EMPLOYEE"}
                          >
                            <option value="DAY">Day</option>
                            <option value="NIGHT">Night</option>
                            <option value="CUSTOM">Custom</option>
                          </select>
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          <Input
                            form={`update-${employee.id}`}
                            name="phone"
                            defaultValue={employee.phone ?? ""}
                            disabled={isProtectedMasterAdmin}
                            placeholder="+91..."
                          />
                        </TableCell>

                        {/* Role */}
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

                        {/* Status */}
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

                        {/* New password (optional reset) */}
                        <TableCell>
                          <Input
                            form={`update-${employee.id}`}
                            name="newPassword"
                            type="password"
                            placeholder="Leave blank to keep"
                            minLength={8}
                            disabled={isProtectedMasterAdmin}
                          />
                        </TableCell>

                        <TableCell>
                          <Input
                            form={`update-${employee.id}`}
                            name="employeePin"
                            inputMode="numeric"
                            placeholder={employee.role === "EMPLOYEE" ? "Set new PIN" : "Only employees"}
                            disabled={isProtectedMasterAdmin || employee.role !== "EMPLOYEE"}
                          />
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              form={`update-${employee.id}`}
                              type="submit"
                              size="icon"
                              variant="outline"
                              disabled={isProtectedMasterAdmin}
                              title="Save changes"
                            >
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
                                title={isSelf ? "Cannot delete your own account" : "Remove user"}
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
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
