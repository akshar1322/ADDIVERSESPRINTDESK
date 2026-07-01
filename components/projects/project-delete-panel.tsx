"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeleteResponse = {
  ok: boolean;
  error?: string;
};

export function ProjectDeletePanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function deleteProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const projectId = String(formData.get("projectId") ?? "").trim();
    const scheduleAt = String(formData.get("scheduleAt") ?? "").trim();
    const query = scheduleAt ? `?scheduleAt=${encodeURIComponent(new Date(scheduleAt).toISOString())}` : "";

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}${query}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as DeleteResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.error ?? "Project delete failed.");
        return;
      }

      setMessage(scheduleAt ? "Project deletion scheduled." : "Project soft deleted.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete project</CardTitle>
        <CardDescription>Soft delete immediately or schedule deletion for the nightly retention job.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]" onSubmit={deleteProject}>
          <div className="grid gap-2">
            <Label htmlFor="projectId">Project ID</Label>
            <Input id="projectId" name="projectId" required placeholder="Project cuid" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scheduleAt">Schedule at</Label>
            <Input id="scheduleAt" name="scheduleAt" type="datetime-local" />
          </div>
          <Button type="submit" variant="outline" className="self-end" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Save
          </Button>
        </form>
        {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
