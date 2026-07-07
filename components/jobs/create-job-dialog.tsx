"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";

import { createJob, type CreateJobState } from "@/app/admin/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Option = {
  id: string;
  name: string;
};

type ClientOption = Option & {
  company: string | null;
  phone: string | null;
};

type CreateJobDialogProps = {
  clients: ClientOption[];
  printers: Option[];
  employees: Option[];
};

const initialState: CreateJobState = { ok: false, message: "" };

export function CreateJobDialog({ clients, printers, employees }: CreateJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">(clients.length ? "existing" : "new");
  const [state, formAction, pending] = useActionState(createJob, initialState);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New job
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-8">
          <div className="w-full max-w-3xl rounded-lg border bg-background shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">Create job</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add job details, client information, and assignment.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form action={formAction} className="space-y-5 p-4">
              <input type="hidden" name="clientMode" value={clientMode} />

              <section className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={clientMode === "existing" ? "default" : "outline"}
                    onClick={() => setClientMode("existing")}
                    disabled={!clients.length}
                  >
                    Existing client
                  </Button>
                  <Button
                    type="button"
                    variant={clientMode === "new" ? "default" : "outline"}
                    onClick={() => setClientMode("new")}
                  >
                    Add client
                  </Button>
                </div>

                {clientMode === "existing" ? (
                  <Field label="Client" htmlFor="customerId">
                    <select
                      id="customerId"
                      name="customerId"
                      required
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {[client.name, client.company, client.phone].filter(Boolean).join(" - ")}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Client name" htmlFor="clientName">
                      <Input id="clientName" name="clientName" required={clientMode === "new"} />
                    </Field>
                    <Field label="Company" htmlFor="company">
                      <Input id="company" name="company" />
                    </Field>
                    <Field label="Phone" htmlFor="phone">
                      <Input id="phone" name="phone" />
                    </Field>
                    <Field label="WhatsApp" htmlFor="whatsapp">
                      <Input id="whatsapp" name="whatsapp" />
                    </Field>
                    <Field label="Email" htmlFor="email">
                      <Input id="email" name="email" type="email" />
                    </Field>
                    <Field label="Address" htmlFor="address">
                      <Input id="address" name="address" />
                    </Field>
                  </div>
                )}
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                <Field label="Job name" htmlFor="jobName">
                  <Input id="jobName" name="jobName" required />
                </Field>
                <Field label="Quantity" htmlFor="quantity">
                  <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" required />
                </Field>
                <Field label="Material" htmlFor="material">
                  <Input id="material" name="material" placeholder="PLA, ABS, Resin" required />
                </Field>
                <Field label="Color" htmlFor="color">
                  <Input id="color" name="color" />
                </Field>
                <Field label="Priority" htmlFor="priority">
                  <select
                    id="priority"
                    name="priority"
                    defaultValue="MEDIUM"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </Field>
                <Field label="Delivery date" htmlFor="deliveryDate">
                  <Input id="deliveryDate" name="deliveryDate" type="date" required />
                </Field>
                <Field label="Expected completion" htmlFor="expectedCompletionAt">
                  <Input id="expectedCompletionAt" name="expectedCompletionAt" type="datetime-local" />
                </Field>
                <Field label="Printer" htmlFor="assignedPrinterId">
                  <select
                    id="assignedPrinterId"
                    name="assignedPrinterId"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Unassigned</option>
                    {printers.map((printer) => (
                      <option key={printer.id} value={printer.id}>
                        {printer.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Employee" htmlFor="assignedEmployeeId">
                  <select
                    id="assignedEmployeeId"
                    name="assignedEmployeeId"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </section>

              <section className="grid gap-3">
                <Field label="3D and production files" htmlFor="files">
                  <Input
                    id="files"
                    name="files"
                    type="file"
                    multiple
                    accept=".stl,.obj,.glb,.gltf,.pdf,.zip,.png,.jpg,.jpeg,.webp"
                  />
                </Field>
                <p className="text-xs text-muted-foreground">STL, OBJ, GLB, GLTF, PDF, ZIP, and image files up to 250 MB each.</p>
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                <Field label="Description" htmlFor="description">
                  <Textarea id="description" name="description" />
                </Field>
                <Field label="Admin instructions" htmlFor="adminInstructions">
                  <Textarea id="adminInstructions" name="adminInstructions" />
                </Field>
                <Field label="Delivery notes" htmlFor="deliveryNotes" className="md:col-span-2">
                  <Textarea id="deliveryNotes" name="deliveryNotes" />
                </Field>
              </section>

              {state.message ? (
                <p className={`text-sm ${state.ok ? "text-green-600" : "text-destructive"}`}>{state.message}</p>
              ) : null}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating..." : "Create job"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
