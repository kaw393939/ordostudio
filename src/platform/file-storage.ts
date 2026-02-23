import type { FileStoragePort } from "../core/ports/file-storage";
import { LocalFileStorage } from "../adapters/local/local-file-storage";
import { S3FileStorage } from "../adapters/s3/s3-file-storage";

let _override: FileStoragePort | null = null;

export const resolveFileStorage = (): FileStoragePort => {
  if (_override) return _override;

  const provider = (process.env.FILE_STORAGE_PROVIDER ?? "local").toLowerCase();

  if (provider === "s3") {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET is required when FILE_STORAGE_PROVIDER=s3");

    return new S3FileStorage({
      bucket,
      region: process.env.S3_REGION ?? "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      publicUrlBase: process.env.FILE_PUBLIC_URL_BASE,
    });
  }

  const baseDir = process.env.FILE_STORAGE_LOCAL_DIR ?? "./data/uploads";
  const publicUrlBase = process.env.FILE_PUBLIC_URL_BASE ?? "/api/v1/files";
  return new LocalFileStorage(baseDir, publicUrlBase);
};

export const setFileStorage = (port: FileStoragePort): void => {
  _override = port;
};

export const resetFileStorage = (): void => {
  _override = null;
};
