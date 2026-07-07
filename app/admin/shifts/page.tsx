import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, Timer, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageUsers } from "@/server/authz";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseShiftType(value: string) {
  if (value === "DAY" || value === "NIGHT" || value === "CUSTOM") return value;
  return "DAY";
}

async function assertCanManageShifts() {
  const session = await requireSession();

  if (!canManageUsers(session)) {
    throw new Error("Only admins can manage shifts.");
  }

  return session;
}

async function createShift(formData: FormData) {
  "use server";

  const session = await assertCanManageShifts();
  const name = readString(formData, "name");
  const type = parseShiftType(readString(formData, "type"));
  const startTime = readString(formData, "startTime");
  const endTime = readString(formData, "endTime");

  if (!name || !startTime || !endTime) {
    redirect("/admin/shifts?error=Name%2C+start+time%2C+and+end+time+are+required.");
  }

  const shift = await getPrisma().shiftDefinition.upsert({
    where: { name_type: { name, type } },
    create: { name, type, startTime, endTime, isActive: true },
    update: { startTime, endTime, isActive: true },
    select: { id: true },
  });

  await getPrisma().activityLog.create({
    data: {
      actorId: session.user.id,
      actorAdminId: session.user.id,
      actorType: "ADMIN",
      action: "SHIFT_UPSERTED",
      entity: "ShiftDefinition",
      entityId: shift.id,
      metadata: { name, type, startTime, endTime },
    },
  });

  revalidatePath("/admin/shifts");
  redirect("/admin/shifts?success=Shift+saved.");
}

async function disableShift(formData: FormData) {
  "use server";

  const session = await assertCanManageShifts();
  const shiftId = readString(formData, "shiftId");

  if (!shiftId) {
    redirect("/admin/shifts?error=Shift+id+is+required.");
  }

  await getPrisma().shiftDefinition.update({
    where: { id: shiftId },
    data: { isActive: false },
  });

  await getPrisma().activityLog.create({
    data: {
      actorId: session.user.id,
      actorAdminId: session.user.id,
      actorType: "ADMIN",
      action: "SHIFT_DISABLED",
      entity: "ShiftDefinition",
      entityId: shiftId,
    },
  });

  revalidatePath("/admin/shifts");
  redirect("/admin/shifts?success=Shift+disabled.");
}

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const prisma = getPrisma();
  await ensureDefaultShiftDefinitions();

  const shifts = await prisma.shiftDefinition.findMany({
    orderBy: [{ isActive: "desc" }, { type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, startTime: true, endTime: true, isActive: true },
  });

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <section>
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
          <Timer className="size-4" />
          Shifts
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Day and night shifts</h1>
      </section>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{decodeURIComponent(error)}</div> : null}
      {success ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="size-4" />
          {decodeURIComponent(success)}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add shift</CardTitle>
          <CardDescription>Create day, night, or custom shift windows used on the work floor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createShift} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Day Shift" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className={selectClass} defaultValue="DAY">
                <option value="DAY">Day</option>
                <option value="NIGHT">Night</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="startTime">Start</Label>
              <Input id="startTime" name="startTime" type="time" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="endTime">End</Label>
              <Input id="endTime" name="endTime" type="time" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Save shift</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shift list</CardTitle>
          <CardDescription>Active shifts appear in the employee PIN and start printing forms.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.type}</TableCell>
                  <TableCell>
                    {shift.startTime} - {shift.endTime}
                  </TableCell>
                  <TableCell>{shift.isActive ? "Active" : "Disabled"}</TableCell>
                  <TableCell className="text-right">
                    <form action={disableShift}>
                      <input type="hidden" name="shiftId" value={shift.id} />
                      <Button type="submit" size="icon" variant="destructive" disabled={!shift.isActive}>
                        <Trash2 className="size-4" />
                        <span className="sr-only">Disable {shift.name}</span>
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

async function ensureDefaultShiftDefinitions() {
  const prisma = getPrisma();
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
