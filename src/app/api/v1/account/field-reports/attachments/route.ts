import { randomUUID } from "node:crypto";
import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";
import { validateUpload, buildFileKey } from "../../../../../../lib/api/upload-validation";
import { resolveFileStorage } from "../../../../../../platform/file-storage";
import { resolveConfig } from "../../../../../../platform/config";
import { openCliDb } from "../../../../../../platform/runtime";

async function _POST(request: Request) {
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
  if (!user) {
    return problem(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      request,
    );
  }

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
  const reportId = formData.get("report_id") as string | null;

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

  if (!reportId) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-upload",
        title: "Unprocessable Entity",
        status: 422,
        detail: "report_id is required.",
      },
      request,
    );
  }

  // Allow both images and documents for field report attachments
  const category = file.type.startsWith("image/") ? "image" as const : "document" as const;
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
    const report = db
      .prepare("SELECT id, user_id FROM field_reports WHERE id = ?")
      .get(reportId) as { id: string; user_id: string } | undefined;

    if (!report || report.user_id !== user.id) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Field report not found or not owned by you.",
        },
        request,
      );
    }

    const storage = resolveFileStorage();
    const key = buildFileKey("field-reports", reportId, file.name || `attachment-${randomUUID().substring(0, 8)}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload(key, buffer, file.type);

    const attachmentId = randomUUID();
    db.prepare(
      `INSERT INTO file_attachments (id, entity_type, entity_id, file_key, file_url, content_type, size_bytes, original_name, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      attachmentId,
      "field_report",
      reportId,
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
        self: { href: "/api/v1/account/field-reports/attachments" },
      },
      { status: 201 },
    );
  } finally {
    db.close();
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
