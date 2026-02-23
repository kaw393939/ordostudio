import { getSessionUserFromRequest } from "../../../../../../lib/api/auth";
import { problem } from "../../../../../../lib/api/response";
import { withRequestLogging } from "../../../../../../lib/api/request-logging";
import { exportEventData } from "../../../../../../lib/api/registrations";
import { resolveConfig } from "@/platform/config";
import { EventNotFoundError } from "../../../../../../core/domain/errors";
import { withRateLimit } from "../../../../../../lib/api/rate-limit-wrapper";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

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

const toBool = (value: string | null): boolean => {
  if (!value) {
    return false;
  }
  return ["1", "true", "yes"].includes(value.toLowerCase());
};

async function _GET(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { slug } = await context.params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format")?.toLowerCase() ?? "json";
  const includeEmail = toBool(url.searchParams.get("include_email"));

  if (format !== "json" && format !== "csv") {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "format must be csv or json.",
      },
      request,
    );
  }

  const config = resolveConfig({ envVars: process.env });
  if (includeEmail && config.env !== "local") {
    return problem(
      {
        type: "https://lms-219.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "include_email is restricted outside local environment.",
      },
      request,
    );
  }

  try {
    const exported = exportEventData({
      slug,
      format,
      includeEmail,
      actorId: auth.user.id,
      requestId: crypto.randomUUID(),
    });

    return new Response(exported.body, {
      status: 200,
      headers: {
        "content-type":
          exported.format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      return problem(
        {
          type: "https://lms-219.dev/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Event not found.",
        },
        request,
      );
    }

    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to export event data.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(withRateLimit("export", _GET));
