import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";

/**
 * GET /api/v1/onboarding/progress
 *
 * Returns the current user's onboarding progress.
 * Placeholder: uses in-memory stub until onboarding_progress table is created.
 */
export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      { status: 401 },
    );
  }

  // Stub: determine completions from session context
  const completions: Record<string, string> = {};

  return NextResponse.json({
    userId: user.id,
    completions,
    _links: {
      self: { href: "/api/v1/onboarding/progress" },
      stream: { href: "/api/v1/onboarding/stream" },
    },
  });
}
