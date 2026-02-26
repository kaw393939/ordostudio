import { recordReferralClick, ReferralCodeNotFoundError, lookupReferralCode } from "../../../lib/api/referrals";
import { getSessionUserFromRequest } from "../../../lib/api/auth";

const COOKIE_NAME = "so_ref";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;

  const url = new URL(request.url);
  const redirectTarget = `/card?ref=${code.toUpperCase()}`;

  // Policy rule 3: self-referral must be blocked at click time.
  // If the logged-in user owns this referral code, redirect without setting the cookie.
  try {
    const sessionUser = getSessionUserFromRequest(request);
    if (sessionUser) {
      const referralRecord = lookupReferralCode(code);
      if (referralRecord.user_id === sessionUser.id) {
        return Response.redirect(new URL(redirectTarget, url.origin), 302);
      }
    }
  } catch {
    // Ignore session or code lookup errors — proceed normally.
  }

  try {
    recordReferralClick({
      code,
      path: url.pathname + url.search,
      referer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
      requestId: crypto.randomUUID(),
    });

    const response = Response.redirect(new URL(redirectTarget, url.origin), 302);
    response.headers.append(
      "set-cookie",
      `${COOKIE_NAME}=${encodeURIComponent(code.toUpperCase())}; Path=/; Max-Age=${60 * 60 * 24 * 90}; SameSite=Lax`,
    );
    return response;
  } catch (error) {
    if (error instanceof ReferralCodeNotFoundError) {
      return Response.redirect(new URL(redirectTarget, url.origin), 302);
    }

    return Response.redirect(new URL(redirectTarget, url.origin), 302);
  }
}
