import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import type { FileStoragePort, UploadResult } from "../../core/ports/file-storage";

export interface S3FileStorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrlBase?: string;
}

export class S3FileStorage implements FileStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor(config: S3FileStorageConfig) {
    this.bucket = config.bucket;

    const credentials =
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined;

    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      credentials,
      forcePathStyle: Boolean(config.endpoint), // MinIO/R2 compatibility
    });

    this.publicUrlBase = config.publicUrlBase
      ? config.publicUrlBase.replace(/\/$/, "")
      : config.endpoint
        ? `${config.endpoint}/${config.bucket}`
        : `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );

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
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
