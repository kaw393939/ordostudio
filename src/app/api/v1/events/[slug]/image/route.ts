import { randomUUID } from "node:crypto";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { validateUpload, buildFileKey } from "../../../../../../lib/api/upload-validation";
import { resolveFileStorage } from "../../../../../../platform/file-storage";
import { resolveConfig } from "../../../../../../platform/config";
import { openCliDb } from "../../../../../../platform/runtime";

async function _POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginMutation(request)) {
    return problem(
      {
        type: "https://lms-219.dev/problems/csrf-check-failed",
        title: "Forbidden",
        status: 403,
        detail: "Cross-origin mutation request rejected.",
      },
      request,
    );
  }

  const user = getSessionUserFromRequest(request);
  if (!user || (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN"))) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Admin access required.",
      },
      request,
    );
  }

  const { slug } = await context.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-upload",
        title: "Bad Request",
        status: 400,
        detail: "Request must be multipart form data.",
      },
      request,
    );
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-upload",
        title: "Unprocessable Entity",
        status: 422,
        detail: "A non-empty file is required in the 'file' field.",
      },
      request,
    );
  }

  const validation = validateUpload(file.type, file.size, "image");
  if (!validation.valid) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-upload",
        title: "Unprocessable Entity",
        status: 422,
        detail: validation.error,
      },
      request,
    );
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = db
      .prepare("SELECT id FROM events WHERE slug = ?")
      .get(slug) as { id: string } | undefined;

    if (!event) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: `Event '${slug}' not found.`,
        },
        request,
      );
    }

    const storage = resolveFileStorage();
    const key = buildFileKey("events", slug, `banner-${randomUUID().substring(0, 8)}${getExtension(file.type)}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload(key, buffer, file.type);

    db.prepare("UPDATE events SET image_url = ?, updated_at = ? WHERE slug = ?").run(
      result.url,
      new Date().toISOString(),
      slug,
    );

    return hal(
      {
        url: result.url,
        key: result.key,
        content_type: result.contentType,
        size_bytes: result.sizeBytes,
      },
      {
        self: { href: `/api/v1/events/${slug}/image` },
        event: { href: `/api/v1/events/${slug}` },
      },
      { status: 201 },
    );
  } finally {
    db.close();
  }
}

async function _DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginMutation(request)) {
    return problem(
      {
        type: "https://lms-219.dev/problems/csrf-check-failed",
        title: "Forbidden",
        status: 403,
        detail: "Cross-origin mutation request rejected.",
      },
      request,
    );
  }

  const user = getSessionUserFromRequest(request);
  if (!user || (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN"))) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Admin access required.",
      },
      request,
    );
  }

  const { slug } = await context.params;
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = db
      .prepare("SELECT id, image_url FROM events WHERE slug = ?")
      .get(slug) as { id: string; image_url: string | null } | undefined;

    if (!event) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: `Event '${slug}' not found.`,
        },
        request,
      );
    }

    if (event.image_url) {
      const storage = resolveFileStorage();
      // Extract key from URL — strip the public URL base prefix
      const key = event.image_url.replace(/^\/api\/v1\/files\//, "");
      await storage.delete(key);
    }

    db.prepare("UPDATE events SET image_url = NULL, updated_at = ? WHERE slug = ?").run(
      new Date().toISOString(),
      slug,
    );

    return new Response(null, { status: 204 });
  } finally {
    db.close();
  }
}

const getExtension = (contentType: string): string => {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return map[contentType] ?? ".bin";
};

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
export const DELETE = withRequestLogging(withRateLimit("admin:write", _DELETE));
