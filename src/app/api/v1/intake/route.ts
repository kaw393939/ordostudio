import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../lib/api/auth";
import { hal, problem } from "../../../../lib/api/response";
import { parsePayload } from "../../../../lib/api/validate";
import { createIntakeSchema } from "../../../../lib/api/schemas";
import { createIntakeRequest, InvalidIntakeInputError, listIntakeRequests, type IntakeAudience } from "../../../../lib/api/intake";
import { parseCookieHeader, recordReferralConversionForIntake } from "../../../../lib/api/referrals";
import { withRequestLogging } from "../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../lib/api/rate-limit-wrapper";

const requireAdmin = (request: Request) => {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return {
      error: problem(
        {
          type: "https://lms-219.dev/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Active session required.",
        },
        request,
      ),
    };
  }

  if (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN")) {
    return {
      error: problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin role required.",
        },
        request,
      ),
    };
  }

  return { user };
};

async function _GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const audience = searchParams.get("audience") ?? undefined;
  const ownerUserId = searchParams.get("owner_user_id") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  try {
    const result = listIntakeRequests({
      status,
      audience,
      ownerUserId,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return hal(
      {
        count: result.count,
        limit: result.limit,
        offset: result.offset,
        items: result.items.map((item) => ({
          ...item,
          _links: {
            self: { href: `/api/v1/intake/${item.id}` },
          },
        })),
      },
      {
        self: { href: "/api/v1/intake" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof InvalidIntakeInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid intake queue filters.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load intake queue.",
      },
      request,
    );
  }
}

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

  const parsed = parsePayload(createIntakeSchema, raw, request);
  if (!parsed.success) {
    console.error("Validation failed:", parsed.response);
    return parsed.response;
  }

  try {
    const created = createIntakeRequest({
      offerSlug: parsed.data.offer_slug,
      audience: parsed.data.audience as IntakeAudience,
      organizationName: parsed.data.organization_name,
      contactName: parsed.data.contact_name ?? "",
      contactEmail: parsed.data.contact_email ?? "",
      goals: parsed.data.goals ?? "",
      timeline: parsed.data.timeline,
      constraints: parsed.data.constraints,
      requestId: crypto.randomUUID(),
    });

    const cookies = parseCookieHeader(request.headers.get("cookie"));
    const referralCode = cookies.so_ref;
    if (referralCode && referralCode.trim().length > 0) {
      try {
        recordReferralConversionForIntake({
          referralCode,
          intakeRequestId: created.id,
          requestId: crypto.randomUUID(),
        });
      } catch {
        // Ignore referral attribution failures (e.g., unknown code).
      }
    }

    return hal(
      {
        ...created,
      },
      {
        self: { href: `/api/v1/intake/${created.id}` },
        collection: { href: "/api/v1/intake" },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Intake creation error:", error);
    if (error instanceof InvalidIntakeInputError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: "Invalid intake request payload.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to submit intake request.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(withRateLimit("public:write", _POST));
