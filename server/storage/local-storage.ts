import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageObject, StorageProvider } from "@/server/storage/types";

const storageRoot = path.join(process.cwd(), ".storage");

function safeStoragePath(key: string) {
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(storageRoot, normalized);
}

export const localStorageProvider: StorageProvider = {
  name: "LOCAL",
  async put(key: string, object: StorageObject) {
    const target = safeStoragePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, object.bytes);

    return {
      key,
      url: null,
      size: object.bytes.byteLength,
      checksum: createHash("sha256").update(object.bytes).digest("hex"),
    };
  },
  async delete(key: string) {
    await rm(safeStoragePath(key), { force: true });
  },
};
