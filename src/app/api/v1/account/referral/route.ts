import { getSessionUserFromRequest } from "../../../../../lib/api/auth";
import { hal, problem } from "../../../../../lib/api/response";
import { getOrCreateReferralCode } from "../../../../../lib/api/referrals";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

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

  try {
    const referral = getOrCreateReferralCode({ userId: user.id, requestId: crypto.randomUUID() });
    return hal(
      {
        code: referral.code,
        url: `/r/${referral.code}`,
        commission_rate: 0.25,
        disclosure:
          "This link sets a referral cookie so we can attribute consult requests back to you.",
      },
      {
        self: { href: "/api/v1/account/referral" },
        me: { href: "/api/v1/me" },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/internal",
        title: "Internal Server Error",
        status: 500,
        detail: "Unable to load referral code.",
      },
      request,
    );
  }
}

export const GET = withRequestLogging(_GET);
