import { randomUUID } from "node:crypto";

import { localStorageProvider } from "@/server/storage/local-storage";
import { r2StorageProvider } from "@/server/storage/r2-storage";
import type { StorageObject, StorageProvider } from "@/server/storage/types";

const allowedExtensions = new Set(["stl", "obj", "glb", "gltf", "pdf", "zip", "png", "jpg", "jpeg", "webp"]);
const maxUploadBytes = 250 * 1024 * 1024;

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER?.toUpperCase();

  if (!provider || provider === "LOCAL") {
    return localStorageProvider;
  }

  if (provider === "R2" || provider === "CLOUDFLARE_R2") {
    return r2StorageProvider;
  }

  throw new Error(`Storage provider ${provider} is not configured yet. Use LOCAL or R2.`);
}

export function getFileKind(fileName: string) {
  const extension = getExtension(fileName);

  if (extension === "stl") return "STL";
  if (extension === "obj") return "OBJ";
  if (extension === "glb") return "GLB";
  if (extension === "gltf") return "GLTF";
  if (extension === "pdf") return "PDF";
  if (extension === "zip") return "ZIP";
  if (["png", "jpg", "jpeg", "webp"].includes(extension)) return "IMAGE";

  return "OTHER";
}

export function assertUploadableFile(file: File) {
  const extension = getExtension(file.name);

  if (!allowedExtensions.has(extension)) {
    throw new Error("Only STL, OBJ, GLB, GLTF, PDF, ZIP, and image files can be uploaded.");
  }

  if (file.size > maxUploadBytes) {
    throw new Error("Files must be 250 MB or smaller.");
  }
}

export async function buildStorageObject(file: File): Promise<StorageObject> {
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type || "application/octet-stream",
    fileName: file.name,
  };
}

export function buildUploadKey(projectId: string, fileName: string) {
  const extension = getExtension(fileName);
  const base = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `projects/${projectId}/${randomUUID()}-${base || "file"}.${extension}`;
}

export function buildBackupKey() {
  return `backups/printflow-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}
