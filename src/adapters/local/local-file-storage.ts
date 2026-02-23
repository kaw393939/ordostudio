import { mkdirSync, existsSync, unlinkSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { FileStoragePort, UploadResult } from "../../core/ports/file-storage";

export class LocalFileStorage implements FileStoragePort {
  private readonly baseDir: string;
  private readonly publicUrlBase: string;

  constructor(baseDir: string, publicUrlBase = "/api/v1/files") {
    this.baseDir = resolve(baseDir);
    this.publicUrlBase = publicUrlBase.replace(/\/$/, "");
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<UploadResult> {
    const filePath = this.keyToPath(key);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, data);
    return {
      key,
      url: this.getUrl(key),
      contentType,
      sizeBytes: data.byteLength,
    };
  }

  getUrl(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.keyToPath(key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(this.keyToPath(key));
  }

  /** Read a file from disk (used by the file-serving route). */
  readFile(key: string): Buffer | null {
    const filePath = this.keyToPath(key);
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath);
  }

  private keyToPath(key: string): string {
    // Prevent path traversal
    const normalized = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return join(this.baseDir, normalized);
  }
}
