export type StoredFile = {
  key: string;
  url: string | null;
  size: number;
  checksum: string;
};

export type StorageObject = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
};

export type StorageProviderName = "LOCAL" | "R2" | "SUPABASE";

export type StorageProvider = {
  name: StorageProviderName;
  put(key: string, object: StorageObject): Promise<StoredFile>;
  delete(key: string): Promise<void>;
};
