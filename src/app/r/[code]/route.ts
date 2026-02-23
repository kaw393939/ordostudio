import { recordReferralClick, ReferralCodeNotFoundError } from "../../../lib/api/referrals";

const COOKIE_NAME = "so_ref";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;

  const url = new URL(request.url);
  const redirectTarget = "/services";

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
      `${COOKIE_NAME}=${encodeURIComponent(code.toUpperCase())}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`,
    );
    return response;
  } catch (error) {
    if (error instanceof ReferralCodeNotFoundError) {
      return Response.redirect(new URL(redirectTarget, url.origin), 302);
    }

    return Response.redirect(new URL(redirectTarget, url.origin), 302);
  }
}
