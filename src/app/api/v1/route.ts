import { hal } from "../../../lib/api/response";
import { withRequestLogging } from "../../../lib/api/request-logging";

async function _GET() {
  return hal(
    {
      name: "lms_219_api",
      version: "v1",
    },
    {
      self: { href: "/api/v1" },
      docs: { href: "/api/v1/docs" },
      terms: { href: "/terms" },
      privacy: { href: "/privacy" },
      auth_register: { href: "/api/v1/auth/register" },
      auth_login: { href: "/api/v1/auth/login" },
      me: { href: "/api/v1/me" },
      account_delete: { href: "/api/v1/account/delete" },
      account_engagements: { href: "/api/v1/account/engagements" },
      events: { href: "/api/v1/events" },
      instructors: { href: "/api/v1/instructors" },
      commercial: { href: "/api/v1/commercial" },
      admin_engagement_feedback: { href: "/api/v1/admin/engagement-feedback" },
      admin_engagement_followup: { href: "/api/v1/admin/engagement-followup" },
      offers: { href: "/api/v1/offers" },
      intake: { href: "/api/v1/intake" },
    },
  );
}

export const GET = withRequestLogging(_GET);
