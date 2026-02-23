import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../../lib/api/auth";
import { hal, problem } from "../../../../../../lib/api/response";
import { parsePayload } from "../../../../../../lib/api/validate";
import { addVocabularySchema } from "../../../../../../lib/api/schemas";
import {
  listVocabulary,
  addVocabularyTerm,
  VocabularyTermAlreadyExistsError,
} from "../../../../../../lib/api/apprentice-progress";
import { getPublicApprenticeByHandle, ApprenticeProfileNotFoundError } from "../../../../../../lib/api/apprentices";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

async function _GET(request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;

  try {
    const profile = getPublicApprenticeByHandle(handle);
    const terms = listVocabulary(profile.user_id);

    return hal(
      {
        handle,
        count: terms.length,
        items: terms.map((t) => ({
          term_slug: t.term_slug,
          term_name: t.term_name,
          demonstrated_at: t.demonstrated_at,
          context: t.context,
        })),
      },
      {
        self: { href: `/api/v1/apprentices/${handle}/vocabulary` },
        profile: { href: `/api/v1/apprentices/${handle}` },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApprenticeProfileNotFoundError) {
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
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load vocabulary.",
      },
      request,
    );
  }
}

async function _POST(request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;

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

  const sameOrigin = await isSameOriginMutation(request);
  if (!sameOrigin) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Cross-origin mutation rejected.",
      },
      request,
    );
  }

  let profile;
  try {
    profile = getPublicApprenticeByHandle(handle);
  } catch (error) {
    if (error instanceof ApprenticeProfileNotFoundError) {
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
    throw error;
  }

  // Only the apprentice or an admin can add vocabulary
  const isOwner = profile.user_id === user.id;
  const isAdmin = user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN");
  if (!isOwner && !isAdmin) {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "You can only add vocabulary for your own profile (or as admin).",
      },
      request,
    );
  }

  const raw = await request.json();
  const parsed = parsePayload(addVocabularySchema, raw, request);
  if (!parsed.success) {
    return parsed.response;
  }

  const requestId = crypto.randomUUID();

  try {
    const term = addVocabularyTerm({
      userId: profile.user_id,
      termSlug: parsed.data.term_slug,
      termName: parsed.data.term_name,
      context: parsed.data.context ?? undefined,
      requestId,
    });

    return hal(
      {
        term_slug: term.term_slug,
        term_name: term.term_name,
        demonstrated_at: term.demonstrated_at,
        context: term.context,
      },
      {
        self: { href: `/api/v1/apprentices/${handle}/vocabulary` },
        profile: { href: `/api/v1/apprentices/${handle}` },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof VocabularyTermAlreadyExistsError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "This vocabulary term has already been recorded.",
        },
        request,
      );
    }
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to add vocabulary term.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("user:write", _POST));
