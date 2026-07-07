"use client";

import {
  Clock3,
  FileDown,
  Files,
  Filter,
  LayoutGrid,
  LockKeyhole,
  Printer,
  ScanSearch,
  ShieldCheck,
  Timer,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type WorkTab = "new" | "in-progress" | "ready";

type WorkJob = {
  id: string;
  jobNumber: string | null;
  client: string;
  name: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  due: string;
  quantity: number;
  printedQuantity: number;
  remainingQuantity: number;
  material: string;
  status: "NEW" | "IN_PROGRESS" | "READY_TO_DELIVER" | "DISPATCHED" | "ARCHIVED" | "ON_HOLD" | "CANCELLED";
  printer: string;
  printerInfo: {
    name: string;
    model: string;
    machineNumber: string | null;
    location: string | null;
    status: string;
    buildVolume: string | null;
  } | null;
  note: string;
  files: Array<{
    id: string;
    name: string;
    kind: string;
    size: number | null;
  }>;
  filesCount: number;
  photosCount: number;
  progressCount: number;
  latestProgressNote: string | null;
};

type EmployeeOption = {
  id: string;
  name: string;
  employeeCode: string;
  defaultShiftType: string | null;
};

type ShiftOption = {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
};

type EmployeeSessionState = {
  employee: {
    id: string;
    name: string;
    employeeCode: string;
  };
  shift: {
    id: string;
    name: string;
    type: string;
  } | null;
  expiresAt: string;
} | null;

type EmployeePortalProps = {
  employees: EmployeeOption[];
  shiftDefinitions: ShiftOption[];
  session: {
    employeeSession: {
      employee: {
        id: string;
        name: string;
        employeeCode: string;
      };
      shiftSession: {
        id: string;
        shiftDefinition: {
          id: string;
          name: string;
          type: string;
        };
      } | null;
      expiresAt: Date;
    };
  } | null;
  jobsByTab: Record<WorkTab, WorkJob[]>;
};

const tabs: Array<{ id: WorkTab; label: string; icon: typeof LayoutGrid }> = [
  { id: "new", label: "New Work", icon: LayoutGrid },
  { id: "in-progress", label: "In Progress", icon: Timer },
  { id: "ready", label: "Ready to Deliver", icon: ShieldCheck },
];

function priorityVariant(priority: WorkJob["priority"]) {
  if (priority === "URGENT") return "amber" as const;
  if (priority === "HIGH") return "blue" as const;
  return "secondary" as const;
}

function formatBytes(size: number | null) {
  if (!size) return "-";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusVariant(status: WorkJob["status"]) {
  if (status === "NEW") return "outline" as const;
  if (status === "IN_PROGRESS") return "blue" as const;
  if (status === "READY_TO_DELIVER") return "green" as const;
  return "amber" as const;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

export function EmployeePortal({ employees, shiftDefinitions, session, jobsByTab }: EmployeePortalProps) {
  const router = useRouter();
  const now = useClock();
  const [activeTab, setActiveTab] = useState<WorkTab>("new");
  const [verified, setVerified] = useState(Boolean(session));
  const [sessionState, setSessionState] = useState<EmployeeSessionState>(() =>
    session
      ? {
          employee: session.employeeSession.employee,
          shift: session.employeeSession.shiftSession
            ? {
                id: session.employeeSession.shiftSession.id,
                name: session.employeeSession.shiftSession.shiftDefinition.name,
                type: session.employeeSession.shiftSession.shiftDefinition.type,
              }
            : null,
          expiresAt: session.employeeSession.expiresAt.toISOString(),
        }
      : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [startJob, setStartJob] = useState<WorkJob | null>(null);
  const [progressJob, setProgressJob] = useState<WorkJob | null>(null);
  const [progressPrinted, setProgressPrinted] = useState(0);
  const [isPending, startTransition] = useTransition();

  const visibleJobs = useMemo(() => jobsByTab[activeTab], [activeTab, jobsByTab]);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    const pin = String(formData.get("pin") ?? "").trim();
    const shiftDefinitionId = String(formData.get("shiftDefinitionId") ?? "").trim();

    if (!employeeId || pin.length < 4 || !shiftDefinitionId) {
      setMessage("Choose an employee, enter a PIN, and pick a shift.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/employee-sessions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, pin, shiftDefinitionId }),
      });

      const result = (await response.json()) as
        | {
            ok: true;
            session: {
              employee: { id: string; name: string; employeeCode: string };
              shift: { id: string; name: string; type: string } | null;
              expiresAt: string;
            };
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok || !result.ok) {
        setMessage(!result.ok && result.error ? result.error : "Unable to verify employee.");
        return;
      }

      setVerified(true);
      setSessionState(result.session);
      setMessage(`Verified ${result.session.employee.name}.`);
      router.refresh();
    });
  }

  async function handleSignOut() {
    setMessage(null);
    startTransition(async () => {
      await fetch("/api/employee-sessions/current", { method: "DELETE" });
      setVerified(false);
      setSessionState(null);
      router.refresh();
    });
  }

  async function handleStartPrinting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!startJob) return;

    const formData = new FormData(event.currentTarget);
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    const pin = String(formData.get("pin") ?? "").trim();
    const shiftDefinitionId = String(formData.get("shiftDefinitionId") ?? "").trim();

    if (!employeeId || pin.length < 4 || !shiftDefinitionId) {
      setMessage("Choose employee, enter PIN, and select day/night shift.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/work/jobs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: startJob.id, employeeId, pin, shiftDefinitionId }),
      });

      const result = (await response.json()) as
        | {
            ok: true;
            session: {
              employee: { id: string; name: string; employeeCode: string };
              shift: { id: string; name: string; type: string } | null;
              expiresAt: string;
            };
          }
        | { ok: false; error?: string };

      if (!response.ok || !result.ok) {
        setMessage(!result.ok && result.error ? result.error : "Could not start printing.");
        return;
      }

      setVerified(true);
      setSessionState(result.session);
      setStartJob(null);
      setActiveTab("in-progress");
      setMessage(`${startJob.name} moved to In Progress.`);
      router.refresh();
    });
  }

  async function handleProgressUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!progressJob) return;

    const formData = new FormData(event.currentTarget);
    const printedQuantity = Number(formData.get("printedQuantity"));
    const note = String(formData.get("note") ?? "").trim();

    startTransition(async () => {
      const response = await fetch("/api/work/jobs/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: progressJob.id, printedQuantity, note }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setMessage(result.error ?? "Could not update progress.");
        return;
      }

      setProgressJob(null);
      setMessage("Progress updated.");
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-[#f4efe6] text-slate-950">
      <section className="border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Warehouse className="size-4" />
              Employee workspace
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Work floor</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Select the operator, verify the PIN, choose the shift, and move work through the floor.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Employee</p>
              <p className="mt-1 text-sm font-medium">{sessionState?.employee.name ?? "Select employee"}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Shift</p>
              <p className="mt-1 text-sm font-medium">{sessionState?.shift?.name ?? "No shift"}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Current time</p>
              <p className="mt-1 text-sm font-medium">
                {now
                  ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:px-6 xl:grid-cols-[360px_1fr]">
        <Card className="border-black/10 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LockKeyhole className="size-4" />
              Verification
            </CardTitle>
            <CardDescription>Employee selection plus PIN opens the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form className="grid gap-4" onSubmit={handleVerify}>
              <div className="grid gap-2">
                <Label htmlFor="employeeId">Employee</Label>
                <select
                  id="employeeId"
                  name="employeeId"
                  defaultValue={sessionState?.employee.id ?? ""}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                >
                  <option value="" disabled>
                    Choose employee
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pin">PIN</Label>
                <Input id="pin" name="pin" type="password" inputMode="numeric" placeholder="••••" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="shiftDefinitionId">Shift</Label>
                <select
                  id="shiftDefinitionId"
                  name="shiftDefinitionId"
                  defaultValue={sessionState?.shift?.id ?? shiftDefinitions[0]?.id ?? ""}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                >
                  {shiftDefinitions.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.type})
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" className="h-11" disabled={isPending || employees.length === 0 || shiftDefinitions.length === 0}>
                <ShieldCheck className="size-4" />
                {verified ? "Re-verify" : "Verify and open"}
              </Button>
            </form>

            {verified ? (
              <div className="grid gap-2">
                <Button type="button" variant="outline" onClick={handleSignOut} disabled={isPending}>
                  Sign out employee
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/sign-out">Admin sign out</Link>
                </Button>
              </div>
            ) : null}

            <div className="grid gap-2 rounded-lg border border-dashed border-black/10 bg-muted/30 p-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Wrench className="size-4" />
                Ready for production
              </div>
              <p>
                The next pass will persist this session on the server and attach the actions to employee records.
              </p>
            </div>

            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={verified ? "green" : "outline"} className="h-8 px-3">
                {verified ? "Verified" : "Locked"}
              </Badge>
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-950">{verified ? "Workspace open" : "Verification required"}</p>
                <p className="text-xs">
                  {verified ? "You can move jobs through the floor." : "Verify before touching client work."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Filter className="size-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <ScanSearch className="size-4" />
                Search
              </Button>
              <Button variant="outline" size="sm">
                <FileDown className="size-4" />
                Handover
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
                    active ? "border-black bg-slate-950 text-white" : "border-black/10 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <section className="grid gap-4">
            {visibleJobs.length === 0 ? (
              <Card className="border-black/10 bg-white">
                <CardContent className="flex min-h-56 items-center justify-center text-sm text-slate-600">
                  No jobs in this lane right now.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleJobs.map((job) => (
                  <Card key={job.id} className="border-black/10 bg-white shadow-sm">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardDescription>
                            {job.client}
                            {job.jobNumber ? ` • ${job.jobNumber}` : ""}
                          </CardDescription>
                          <CardTitle className="mt-1 text-xl">{job.name}</CardTitle>
                        </div>
                        <Badge variant={priorityVariant(job.priority)}>{job.priority}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                        <Badge variant="outline">{job.id}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-black/10 bg-muted/30 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Due</p>
                          <p className="mt-1 text-sm font-medium">{job.due}</p>
                        </div>
                        <div className="rounded-lg border border-black/10 bg-muted/30 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Quantity</p>
                          <p className="mt-1 text-sm font-medium">
                            {job.printedQuantity} / {job.quantity}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">{job.remainingQuantity} remaining</p>
                        </div>
                        <div className="rounded-lg border border-black/10 bg-muted/30 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Material</p>
                          <p className="mt-1 text-sm font-medium">{job.material}</p>
                        </div>
                        <div className="rounded-lg border border-black/10 bg-muted/30 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Printer</p>
                          <p className="mt-1 text-sm font-medium">{job.printer}</p>
                          {job.printerInfo ? (
                            <p className="mt-1 text-xs text-slate-600">
                              {[
                                job.printerInfo.model,
                                job.printerInfo.machineNumber,
                                job.printerInfo.location,
                                job.printerInfo.buildVolume,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-black/10 bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Files</p>
                          <p className="mt-1 text-sm font-medium">{job.filesCount}</p>
                        </div>
                        <div className="rounded-lg border border-black/10 bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Photos</p>
                          <p className="mt-1 text-sm font-medium">{job.photosCount}</p>
                        </div>
                        <div className="rounded-lg border border-black/10 bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Updates</p>
                          <p className="mt-1 text-sm font-medium">{job.progressCount}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-black/10 p-3 text-sm text-slate-600">
                        <Clock3 className="size-4" />
                        {job.latestProgressNote ?? job.note}
                      </div>

                      {job.files.length > 0 ? (
                        <div className="grid gap-2 rounded-lg border border-black/10 bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Production files</p>
                          <div className="grid gap-2">
                            {job.files.map((file) => (
                              <a
                                key={file.id}
                                href={`/api/files/${file.id}`}
                                className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-slate-50"
                              >
                                <span className="min-w-0 truncate">
                                  {file.name}
                                  <span className="ml-2 text-xs text-slate-500">{file.kind}</span>
                                </span>
                                <span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" disabled={!verified}>
                          <Files className="size-4" />
                          View more
                        </Button>
                        <Button type="button" onClick={() => setStartJob(job)}>
                          <Printer className="size-4" />
                          {job.status === "IN_PROGRESS" ? "Resume printing" : "Start printing"}
                        </Button>
                        {job.status === "IN_PROGRESS" ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setProgressJob(job);
                              setProgressPrinted(job.printedQuantity);
                            }}
                          >
                            <Timer className="size-4" />
                            Update qty
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {startJob ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-8">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">Start printing</h2>
                <p className="mt-1 text-sm text-slate-600">{startJob.name}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => setStartJob(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <form className="grid gap-4 p-4" onSubmit={handleStartPrinting}>
              <div className="grid gap-2">
                <Label htmlFor="start-employeeId">Employee name</Label>
                <select
                  id="start-employeeId"
                  name="employeeId"
                  defaultValue={sessionState?.employee.id ?? ""}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                >
                  <option value="" disabled>
                    Choose employee
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start-pin">PIN</Label>
                <Input id="start-pin" name="pin" type="password" inputMode="numeric" placeholder="Enter PIN" autoFocus />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start-shiftDefinitionId">Shift</Label>
                <select
                  id="start-shiftDefinitionId"
                  name="shiftDefinitionId"
                  defaultValue={sessionState?.shift?.id ?? shiftDefinitions[0]?.id ?? ""}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                >
                  {shiftDefinitions.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setStartJob(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || employees.length === 0 || shiftDefinitions.length === 0}>
                  <Printer className="size-4" />
                  Start print
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {progressJob ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-8">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">Update progress</h2>
                <p className="mt-1 text-sm text-slate-600">{progressJob.name}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => setProgressJob(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <form className="grid gap-4 p-4" onSubmit={handleProgressUpdate}>
              <div className="grid gap-2">
                <Label htmlFor="printedQuantity">Printed quantity</Label>
                <Input
                  id="printedQuantity"
                  name="printedQuantity"
                  type="number"
                  min="0"
                  max={progressJob.quantity}
                  value={progressPrinted}
                  onChange={(event) => setProgressPrinted(Number(event.target.value))}
                  required
                />
                <p className="text-xs text-slate-600">
                  Total {progressJob.quantity}. Remaining {Math.max(progressJob.quantity - progressPrinted, 0)}.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="progress-note">Notes</Label>
                <textarea
                  id="progress-note"
                  name="note"
                  className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                  placeholder="Print quality, issue, material note..."
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setProgressJob(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Save progress
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
