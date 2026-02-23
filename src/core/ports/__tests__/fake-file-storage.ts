import type { FileStoragePort, UploadResult } from "../file-storage";

export class FakeFileStorage implements FileStoragePort {
  readonly files = new Map<string, { data: Buffer; contentType: string }>();
  readonly operations: { op: string; key: string; at: string }[] = [];

  async upload(key: string, data: Buffer, contentType: string): Promise<UploadResult> {
    this.files.set(key, { data, contentType });
    this.operations.push({ op: "upload", key, at: new Date().toISOString() });
    return {
      key,
      url: `/api/v1/files/${key}`,
      contentType,
      sizeBytes: data.byteLength,
    };
  }

  getUrl(key: string): string {
    return `/api/v1/files/${key}`;
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
    this.operations.push({ op: "delete", key, at: new Date().toISOString() });
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }
}
