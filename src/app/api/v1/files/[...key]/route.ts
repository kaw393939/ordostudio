import { problem } from "../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { resolveFileStorage } from "../../../../../platform/file-storage";
import { LocalFileStorage } from "../../../../../adapters/local/local-file-storage";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

function guessContentType(key: string): string {
  const ext = key.substring(key.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

async function _GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await context.params;
  if (!segments || segments.length === 0) {
    return problem(
      {
        type: "https://lms-219.dev/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: "No file key specified.",
      },
      request,
    );
  }

  const fileKey = segments.join("/");

  // Prevent path traversal
  if (fileKey.includes("..")) {
    return problem(
      {
        type: "https://lms-219.dev/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: "Invalid file key.",
      },
      request,
    );
  }

  const storage = resolveFileStorage();

  // Only LocalFileStorage can serve files directly
  if (!(storage instanceof LocalFileStorage)) {
    // For S3, files are served directly from the S3 URL, not via this route
    return problem(
      {
        type: "https://lms-219.dev/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: "File serving is only available for local storage.",
      },
      request,
    );
  }

  const data = storage.readFile(fileKey);
  if (!data) {
    return problem(
      {
        type: "https://lms-219.dev/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: "File not found.",
      },
      request,
    );
  }

  const contentType = guessContentType(fileKey);

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export const GET = withRequestLogging(_GET);
