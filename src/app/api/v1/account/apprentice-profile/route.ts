import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { apprenticeProfileSchema } from "../../../../../lib/api/schemas";
import {
  ApprenticeHandleConflictError,
  getMyApprenticeProfile,
  suggestHandleFromDisplayName,
  upsertMyApprenticeProfile,
} from "../../../../../lib/api/apprentices";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

async function _GET(request: Request) {
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

  const profile = getMyApprenticeProfile(user.id);
  return hal(
    {
      profile,
      suggested_handle: profile ? profile.handle : suggestHandleFromDisplayName(user.email.split("@")[0] ?? "apprentice"),
    },
    {
      self: { href: "/api/v1/account/apprentice-profile" },
      me: { href: "/api/v1/me" },
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

async function _PUT(request: Request) {
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-json",
        title: "Bad Request",
        status: 400,
        detail: "Request body must be valid JSON.",
      },
      request,
    );
  }

  const parsed = parsePayload(apprenticeProfileSchema, raw, request);
  if (!parsed.success) return parsed.response;

  try {
    const updated = upsertMyApprenticeProfile({
      userId: user.id,
      handle: parsed.data.handle ?? suggestHandleFromDisplayName(parsed.data.display_name ?? user.email.split("@")[0] ?? "apprentice"),
      displayName: parsed.data.display_name ?? "",
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      location: parsed.data.location,
      websiteUrl: parsed.data.website_url,
      tags: parsed.data.tags,
      requestId: crypto.randomUUID(),
    });

    return hal(
      { profile: updated },
      {
        self: { href: "/api/v1/account/apprentice-profile" },
        me: { href: "/api/v1/me" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ApprenticeHandleConflictError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "That handle is already in use.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "Invalid apprentice profile input.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const PUT = withRequestLogging(withRateLimit("user:write", _PUT));
