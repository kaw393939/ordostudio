import { getSessionUserFromRequest, isSameOriginMutation } from "../../../../../lib/api/auth";
import { problem } from "../../../../../lib/api/response";
import { parsePayload } from "../../../../../lib/api/validate";
import { measureEventSchema } from "../../../../../lib/api/schemas";
import { InvalidMeasurementEventError, recordMeasurementEvent } from "../../../../../lib/api/measurement";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";

const ANON_COOKIE = "so_anon";

const parseCookies = (header: string | null): Record<string, string> => {
  if (!header) return {};
  const parts = header.split(";").map((part) => part.trim());
  const out: Record<string, string> = {};
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (!key) continue;
    out[key] = rest.join("=");
  }
  return out;
};

const ensureAnonId = (request: Request): { anonId: string; setCookie?: string } => {
  const cookies = parseCookies(request.headers.get("cookie"));
  const existing = cookies[ANON_COOKIE];
  if (existing && existing.trim().length > 0) {
    return { anonId: existing.trim() };
  }

  const anonId = crypto.randomUUID();
  return {
    anonId,
    setCookie: `${ANON_COOKIE}=${anonId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
  };
};

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

  const parsed = parsePayload(measureEventSchema, raw, request);
  if (!parsed.success) return parsed.response;

  const user = getSessionUserFromRequest(request);
  const { anonId, setCookie } = ensureAnonId(request);

  try {
    recordMeasurementEvent({
      key: parsed.data.key,
      path: parsed.data.path,
      actorUserId: user?.id ?? null,
      anonymousId: anonId,
      metadata: parsed.data.metadata,
    });

    return new Response(null, {
      status: 204,
      headers: setCookie ? { "set-cookie": setCookie } : undefined,
    });
  } catch (error) {
    if (error instanceof InvalidMeasurementEventError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/invalid-input",
          title: "Bad Request",
          status: 400,
          detail: `Invalid measurement event: ${error.reason}`,
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to record measurement event.",
      },
      request,
    );
  }
}

export const POST = withRequestLogging(withRateLimit("user:write", _POST));
