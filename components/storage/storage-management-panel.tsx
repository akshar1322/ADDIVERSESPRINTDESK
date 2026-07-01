"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadResponse = {
  ok: boolean;
  error?: string;
  files?: Array<{ id: string; name: string; size: number | null; storageKey: string | null }>;
};

export function StorageManagementPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function uploadFiles(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const form = event.currentTarget;
    const projectId = String(new FormData(form).get("projectId") ?? "").trim();
    const filesInput = form.elements.namedItem("files");

    if (!(filesInput instanceof HTMLInputElement) || !filesInput.files?.length) {
      setMessage("Choose at least one file.");
      return;
    }

    const payload = new FormData();
    for (const file of filesInput.files) {
      payload.append("files", file);
    }

    startUploadTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as UploadResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.error ?? "Upload failed.");
        return;
      }

      form.reset();
      setMessage(`Uploaded ${result.files?.length ?? 0} file(s).`);
    });
  }

  function scheduleFileDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const fileId = String(formData.get("fileId") ?? "").trim();
    const scheduleAt = String(formData.get("scheduleAt") ?? "").trim();
    const query = scheduleAt ? `?scheduleAt=${encodeURIComponent(new Date(scheduleAt).toISOString())}` : "";

    startDeleteTransition(async () => {
      const response = await fetch(`/api/files/${fileId}${query}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as UploadResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.error ?? "Delete failed.");
        return;
      }

      setMessage(scheduleAt ? "File deletion scheduled." : "File deleted from storage.");
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upload files only</CardTitle>
          <CardDescription>Allowed: STL, OBJ, GLB, GLTF, PDF, ZIP, PNG, JPG, JPEG, WEBP.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={uploadFiles}>
            <div className="grid gap-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input id="projectId" name="projectId" required placeholder="Project cuid" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="files">Files</Label>
              <Input id="files" name="files" type="file" multiple required />
            </div>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
              Upload
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete or schedule file deletion</CardTitle>
          <CardDescription>Leave schedule empty to delete immediately from storage.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={scheduleFileDelete}>
            <div className="grid gap-2">
              <Label htmlFor="fileId">File ID</Label>
              <Input id="fileId" name="fileId" required placeholder="ProjectFile cuid" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scheduleAt">Schedule at</Label>
              <Input id="scheduleAt" name="scheduleAt" type="datetime-local" />
            </div>
            <Button type="submit" variant="outline" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Save delete action
            </Button>
          </form>
        </CardContent>
      </Card>
      {message ? <p className="text-sm text-muted-foreground xl:col-span-2">{message}</p> : null}
    </div>
  );
}
