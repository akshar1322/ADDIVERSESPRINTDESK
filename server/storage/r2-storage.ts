import { createHash } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { StorageObject, StorageProvider } from "@/server/storage/types";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string | null;
};

let r2Client: S3Client | null = null;
let r2Config: R2Config | null = null;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required when STORAGE_PROVIDER=R2.`);
  }

  return value;
}

function getR2Config() {
  if (!r2Config) {
    r2Config = {
      accountId: requireEnv("CLOUDFLARE_R2_ACCOUNT_ID"),
      accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
      bucket: requireEnv("CLOUDFLARE_R2_BUCKET"),
      publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL ?? process.env.CLOUDFLARE_R2 ?? null,
    };
  }

  return r2Config;
}

function getR2Client() {
  if (!r2Client) {
    const config = getR2Config();

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return r2Client;
}

function getPublicUrl(key: string) {
  const publicUrl = getR2Config().publicUrl;

  if (!publicUrl) {
    return null;
  }

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export const r2StorageProvider: StorageProvider = {
  name: "R2",
  async put(key: string, object: StorageObject) {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: getR2Config().bucket,
        Key: key,
        Body: object.bytes,
        ContentType: object.contentType,
      }),
    );

    return {
      key,
      url: getPublicUrl(key),
      size: object.bytes.byteLength,
      checksum: createHash("sha256").update(object.bytes).digest("hex"),
    };
  },
  async delete(key: string) {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: getR2Config().bucket,
        Key: key,
      }),
    );
  },
};
