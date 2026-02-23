import { describe, expect, it } from "vitest";
import { validateUpload, sanitizeFileName, buildFileKey } from "../api/upload-validation";

describe("validateUpload", () => {
  it("accepts a valid JPEG image under the size limit", () => {
    const result = validateUpload("image/jpeg", 1024, "image");
    expect(result).toEqual({ valid: true });
  });

  it("accepts a valid PNG image", () => {
    expect(validateUpload("image/png", 500_000, "image")).toEqual({ valid: true });
  });

  it("accepts a valid WebP image", () => {
    expect(validateUpload("image/webp", 500_000, "image")).toEqual({ valid: true });
  });

  it("accepts a valid GIF image", () => {
    expect(validateUpload("image/gif", 500_000, "image")).toEqual({ valid: true });
  });

  it("rejects an unsupported image content type", () => {
    const result = validateUpload("image/bmp", 1024, "image");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Unsupported image type");
      expect(result.error).toContain("image/bmp");
    }
  });

  it("rejects an image exceeding the 5 MB limit", () => {
    const result = validateUpload("image/jpeg", 6 * 1024 * 1024, "image");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("too large");
      expect(result.error).toContain("5 MB");
    }
  });

  it("accepts an image exactly at the 5 MB limit", () => {
    const result = validateUpload("image/png", 5 * 1024 * 1024, "image");
    expect(result).toEqual({ valid: true });
  });

  it("rejects an empty file", () => {
    const result = validateUpload("image/png", 0, "image");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("empty");
    }
  });

  it("accepts a valid PDF document", () => {
    expect(validateUpload("application/pdf", 1024, "document")).toEqual({ valid: true });
  });

  it("accepts a valid text document", () => {
    expect(validateUpload("text/plain", 1024, "document")).toEqual({ valid: true });
  });

  it("accepts a valid markdown document", () => {
    expect(validateUpload("text/markdown", 1024, "document")).toEqual({ valid: true });
  });

  it("rejects an unsupported document content type", () => {
    const result = validateUpload("application/zip", 1024, "document");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Unsupported document type");
    }
  });

  it("rejects a document exceeding the 10 MB limit", () => {
    const result = validateUpload("application/pdf", 11 * 1024 * 1024, "document");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("too large");
      expect(result.error).toContain("10 MB");
    }
  });

  it("accepts a document exactly at the 10 MB limit", () => {
    const result = validateUpload("application/pdf", 10 * 1024 * 1024, "document");
    expect(result).toEqual({ valid: true });
  });
});

describe("sanitizeFileName", () => {
  it("preserves alphanumeric characters and dots", () => {
    expect(sanitizeFileName("file.jpg")).toBe("file.jpg");
  });

  it("replaces spaces and special characters with underscores", () => {
    expect(sanitizeFileName("my photo (1).jpg")).toBe("my_photo_1_.jpg");
  });

  it("collapses consecutive underscores", () => {
    expect(sanitizeFileName("file---name!!!.png")).toBe("file---name_.png");
  });

  it("truncates to 200 characters", () => {
    const longName = "a".repeat(250) + ".jpg";
    const result = sanitizeFileName(longName);
    expect(result.length).toBe(200);
  });

  it("handles empty string", () => {
    expect(sanitizeFileName("")).toBe("");
  });
});

describe("buildFileKey", () => {
  it("constructs a key with entity type, id, and sanitized file name", () => {
    const key = buildFileKey("events", "spring-2025", "banner.jpg");
    expect(key).toBe("uploads/events/spring-2025/banner.jpg");
  });

  it("sanitizes the file name portion", () => {
    const key = buildFileKey("avatars", "user-123", "my photo (2).png");
    expect(key).toBe("uploads/avatars/user-123/my_photo_2_.png");
  });
});
