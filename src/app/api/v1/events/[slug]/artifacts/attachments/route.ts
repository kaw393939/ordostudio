import { randomUUID } from "node:crypto";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";
import { validateUpload, buildFileKey } from "../../../../../../../lib/api/upload-validation";
import { resolveFileStorage } from "../../../../../../../platform/file-storage";
import { resolveConfig } from "../../../../../../../platform/config";
import { openCliDb } from "../../../../../../../platform/runtime";

async function _POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
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
  const artifactId = formData.get("artifact_id") as string | null;

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

  if (!artifactId) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-upload",
        title: "Unprocessable Entity",
        status: 422,
        detail: "artifact_id is required.",
      },
      request,
    );
  }

  // Allow both images and documents for artifact attachments
  const category = file.type.startsWith("image/") ? ("image" as const) : ("document" as const);
  const validation = validateUpload(file.type, file.size, category);
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
    // Verify event exists
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

    // Verify artifact exists and belongs to this event
    const artifact = db
      .prepare("SELECT id, event_id FROM event_artifacts WHERE id = ? AND event_id = ?")
      .get(artifactId, event.id) as { id: string; event_id: string } | undefined;

    if (!artifact) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Artifact not found for this event.",
        },
        request,
      );
    }

    const storage = resolveFileStorage();
    const key = buildFileKey(
      "artifacts",
      artifactId,
      file.name || `attachment-${randomUUID().substring(0, 8)}`,
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload(key, buffer, file.type);

    const attachmentId = randomUUID();
    db.prepare(
      `INSERT INTO file_attachments (id, entity_type, entity_id, file_key, file_url, content_type, size_bytes, original_name, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      attachmentId,
      "artifact",
      artifactId,
      result.key,
      result.url,
      result.contentType,
      result.sizeBytes,
      file.name || "attachment",
      user.id,
      new Date().toISOString(),
    );

    return hal(
      {
        id: attachmentId,
        url: result.url,
        key: result.key,
        content_type: result.contentType,
        size_bytes: result.sizeBytes,
        original_name: file.name || "attachment",
      },
      {
        self: { href: `/api/v1/events/${slug}/artifacts/attachments` },
        event: { href: `/api/v1/events/${slug}` },
      },
      { status: 201 },
    );
  } finally {
    db.close();
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
