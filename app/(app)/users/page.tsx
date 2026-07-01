import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { Save, UserPlus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getRole } from "@/server/authz";

export const dynamic = "force-dynamic";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

async function assertCanManageUsers() {
  const session = await requireSession();
  const role = getRole(session);

  if (role !== "MASTER_ADMIN" && role !== "SUB_ADMIN") {
    throw new Error("Only admins can manage users.");
  }

  return { session, role };
}

async function createUser(formData: FormData) {
  "use server";

  const { session, role: actorRole } = await assertCanManageUsers();
  const name = readString(formData, "name");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const phone = readString(formData, "phone") || null;
  const role = parseRole(readString(formData, "role"), actorRole);
  const status = parseStatus(readString(formData, "status"));

  if (!name || !email || password.length < 8) {
    throw new Error("Name, email, and an 8+ character password are required.");
  }

  const prisma = getPrisma();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      role,
      status,
      emailVerified: true,
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: passwordHash,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
      metadata: { role, status },
    },
  });

  revalidatePath("/users");
}

async function updateUserAccess(formData: FormData) {
  "use server";

  const { session, role: actorRole } = await assertCanManageUsers();
  const userId = readString(formData, "userId");
  const role = parseRole(readString(formData, "role"), actorRole);
  const status = parseStatus(readString(formData, "status"));

  if (!userId) {
    throw new Error("User id is required.");
  }

  await getPrisma().user.update({
    where: { id: userId },
    data: {
      role,
      status,
      updatedById: session.user.id,
    },
  });

  await getPrisma().activityLog.create({
    data: {
      actorId: session.user.id,
      action: "USER_ACCESS_UPDATED",
      entity: "User",
      entityId: userId,
      metadata: { role, status },
    },
  });

  revalidatePath("/users");
}

async function getUsers() {
  return getPrisma().user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          assignedProjects: true,
          uploadedFiles: true,
        },
      },
    },
  });
}

export default async function UsersPage() {
  const session = await requireSession();
  const currentRole = getRole(session);
  const users = await getUsers();
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const admins = users.filter((user) => user.role === "MASTER_ADMIN" || user.role === "SUB_ADMIN").length;

  return (
    <main className="grid gap-5 p-4 md:p-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="size-4" />
            Team directory
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">Users</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Create staff accounts, assign access, and keep account status in sync with production work.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total users</CardDescription>
            <CardTitle className="text-2xl">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active accounts</CardDescription>
            <CardTitle className="text-2xl">{activeUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-2xl">{admins}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-muted-foreground" />
            <CardTitle>Create user</CardTitle>
          </div>
          <CardDescription>Add a user who can login with email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUser} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="grid gap-2 xl:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Employee name" required />
            </div>
            <div className="grid gap-2 xl:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="name@company.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+91..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select id="role" name="role" className={selectClass} defaultValue="EMPLOYEE">
                {currentRole === "MASTER_ADMIN" ? <option value="MASTER_ADMIN">Master Admin</option> : null}
                <option value="SUB_ADMIN">Sub Admin</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" className={selectClass} defaultValue="ACTIVE">
                <option value="ACTIVE">Active</option>
                <option value="INVITED">Invited</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div className="flex items-end xl:col-span-4">
              <Button type="submit" className="w-full md:w-auto">
                <UserPlus className="size-4" />
                Create user
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage users</CardTitle>
          <CardDescription>Change role and account status without leaving the directory.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No users found in the database yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="min-w-64">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={getRoleVariant(user.role)}>{formatLabel(user.role)}</Badge>
                        <Badge variant={getStatusVariant(user.status)}>{formatLabel(user.status)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{user.phone ?? "-"}</TableCell>
                    <TableCell className="text-right">{user._count.assignedProjects}</TableCell>
                    <TableCell className="text-right">{user._count.uploadedFiles}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <form action={updateUserAccess} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          className={cn(selectClass, "h-8")}
                          defaultValue={user.role}
                          disabled={currentRole !== "MASTER_ADMIN" && user.role === "MASTER_ADMIN"}
                        >
                          {currentRole === "MASTER_ADMIN" ? <option value="MASTER_ADMIN">Master Admin</option> : null}
                          <option value="SUB_ADMIN">Sub Admin</option>
                          <option value="EMPLOYEE">Employee</option>
                        </select>
                        <select name="status" className={cn(selectClass, "h-8")} defaultValue={user.status}>
                          <option value="ACTIVE">Active</option>
                          <option value="INVITED">Invited</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                        <Button type="submit" size="icon" variant="outline" aria-label={`Save access for ${user.name}`}>
                          <Save className="size-4" />
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
