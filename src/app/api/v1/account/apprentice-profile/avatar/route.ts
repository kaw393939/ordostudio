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
    const profile = db
      .prepare("SELECT user_id FROM apprentice_profiles WHERE user_id = ?")
      .get(user.id) as { user_id: string } | undefined;

    if (!profile) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Apprentice profile not found. Create a profile first.",
        },
        request,
      );
    }

    const storage = resolveFileStorage();
    const ext = getExtension(file.type);
    const key = buildFileKey("avatars", user.id, `avatar-${randomUUID().substring(0, 8)}${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload(key, buffer, file.type);

    db.prepare("UPDATE apprentice_profiles SET avatar_url = ?, updated_at = ? WHERE user_id = ?").run(
      result.url,
      new Date().toISOString(),
      user.id,
    );

    return hal(
      {
        url: result.url,
        key: result.key,
        content_type: result.contentType,
        size_bytes: result.sizeBytes,
      },
      {
        self: { href: "/api/v1/account/apprentice-profile/avatar" },
        profile: { href: "/api/v1/account/apprentice-profile" },
      },
      { status: 201 },
    );
  } finally {
    db.close();
  }
}

async function _DELETE(request: Request) {
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

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const profile = db
      .prepare("SELECT user_id, avatar_url FROM apprentice_profiles WHERE user_id = ?")
      .get(user.id) as { user_id: string; avatar_url: string | null } | undefined;

    if (!profile) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Apprentice profile not found.",
        },
        request,
      );
    }

    if (profile.avatar_url) {
      const storage = resolveFileStorage();
      const key = profile.avatar_url.replace(/^\/api\/v1\/files\//, "");
      await storage.delete(key);
    }

    db.prepare("UPDATE apprentice_profiles SET avatar_url = NULL, updated_at = ? WHERE user_id = ?").run(
      new Date().toISOString(),
      user.id,
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

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
export const DELETE = withRequestLogging(withRateLimit("user:write", _DELETE));
