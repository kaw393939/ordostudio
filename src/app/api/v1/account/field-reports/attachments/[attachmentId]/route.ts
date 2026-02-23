import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../../lib/api/rate-limit-wrapper";
import { resolveFileStorage } from "../../../../../../../platform/file-storage";
import { resolveConfig } from "../../../../../../../platform/config";
import { openCliDb } from "../../../../../../../platform/runtime";

interface AttachmentRow {
  id: string;
  entity_type: string;
  entity_id: string;
  file_key: string;
  file_url: string;
  uploaded_by: string;
}

interface ReportRow {
  id: string;
  user_id: string;
}

async function _DELETE(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
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

  const { attachmentId } = await params;

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const attachment = db
      .prepare(
        "SELECT id, entity_type, entity_id, file_key, file_url, uploaded_by FROM file_attachments WHERE id = ? AND entity_type = 'field_report'",
      )
      .get(attachmentId) as AttachmentRow | undefined;

    if (!attachment) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Attachment not found.",
        },
        request,
      );
    }

    // Verify the user owns the field report
    const report = db
      .prepare("SELECT id, user_id FROM field_reports WHERE id = ?")
      .get(attachment.entity_id) as ReportRow | undefined;

    if (!report || report.user_id !== user.id) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Attachment not found.",
        },
        request,
      );
    }

    const storage = resolveFileStorage();
    await storage.delete(attachment.file_key);

    db.prepare("DELETE FROM file_attachments WHERE id = ?").run(attachmentId);

    return hal(
      { deleted: true },
      {
        self: {
          href: `/api/v1/account/field-reports/attachments/${attachmentId}`,
        },
      },
    );
  } finally {
    db.close();
  }
}

export const DELETE = withRequestLogging(
  withRateLimit("user:write", _DELETE),
);
