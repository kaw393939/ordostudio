import { NextResponse } from "next/server";
import { listActionProposals } from "@/lib/api/action-proposals";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";

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

  if (!user.roles.includes("ADMIN") && !user.roles.includes("SUPER_ADMIN") && !user.roles.includes("MAESTRO")) {
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

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | null;
  const limit = searchParams.has("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
  const offset = searchParams.has("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

  const proposals = listActionProposals({ status: status || undefined, limit: limit || 50, offset: offset || 0 });

  return NextResponse.json({
    _links: {
      self: { href: request.url },
    },
    count: proposals.count,
    items: proposals.items,
  });
}
