import { NextResponse } from "next/server";
import { getActionProposal, reviewActionProposal } from "@/lib/api/action-proposals";
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const proposal = getActionProposal(id);

  if (!proposal) {
    return NextResponse.json({ type: "about:blank", title: "Not Found", status: 404 }, { status: 404 });
  }

  return NextResponse.json(proposal);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();

  if (!body.status || !["APPROVED", "DENIED"].includes(body.status)) {
    return NextResponse.json({ type: "about:blank", title: "Bad Request", status: 400, detail: "Invalid status" }, { status: 400 });
  }

  try {
    const proposal = reviewActionProposal({
      id,
      status: body.status,
      rationale: body.rationale,
      reviewed_by: auth.user!.id,
    });

    return NextResponse.json(proposal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ type: "about:blank", title: "Bad Request", status: 400, detail: message }, { status: 400 });
  }
}
