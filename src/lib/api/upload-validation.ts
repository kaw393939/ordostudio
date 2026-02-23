export type UploadCategory = "image" | "document";

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export const validateUpload = (
  contentType: string,
  sizeBytes: number,
  category: UploadCategory,
): ValidationResult => {
  if (sizeBytes === 0) {
    return { valid: false, error: "File is empty." };
  }

  const allowedTypes = category === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
  const maxSize = category === "image" ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;

  if (!allowedTypes.includes(contentType)) {
    const typeLabel = category === "image" ? "image" : "document";
    return {
      valid: false,
      error: `Unsupported ${typeLabel} type: ${contentType}. Allowed: ${allowedTypes.join(", ")}.`,
    };
  }

  if (sizeBytes > maxSize) {
    const maxMb = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB). Maximum: ${maxMb} MB.`,
    };
  }

  return { valid: true };
};

export const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 200);
};

export const buildFileKey = (
  entityType: string,
  entityId: string,
  fileName: string,
): string => {
  const safe = sanitizeFileName(fileName);
  return `uploads/${entityType}/${entityId}/${safe}`;
};
