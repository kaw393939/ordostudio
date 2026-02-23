/**
 * FileStorage port — abstraction for file upload/storage backends.
 *
 * Implementations:
 *  - LocalFileStorage (dev): stores files on disk, served via API route
 *  - S3FileStorage (prod): stores files in S3-compatible bucket
 *  - FakeFileStorage (test): in-memory Map for testing
 */

export type UploadResult = {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
};

export type FileMetadata = {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export interface FileStoragePort {
  upload(key: string, data: Buffer, contentType: string): Promise<UploadResult>;
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
