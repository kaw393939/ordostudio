/**
 * Page Smoke Tests — PRD-13
 *
 * Validates that every page.tsx file:
 *  1. Has a default export
 *  2. The default export is a function (React component)
 *
 * This catches broken pages (syntax errors, missing exports, etc.)
 * without needing to render them in a full DOM environment.
 */

import { describe, it, expect } from "vitest";

/**
 * All page.tsx files in the app, with relative import paths
 * from this test file (src/app/__tests__/).
 */
const pages = [
  // ── Admin pages ────────────────────────────────────
  { path: "../(admin)/admin/page", label: "admin dashboard" },
  { path: "../(admin)/admin/apprentices/page", label: "admin/apprentices" },
  { path: "../(admin)/admin/audit/page", label: "admin/audit" },
  { path: "../(admin)/admin/commercial/page", label: "admin/commercial" },
  { path: "../(admin)/admin/deals/page", label: "admin/deals" },
  { path: "../(admin)/admin/deals/[id]/page", label: "admin/deals/[id]" },
  { path: "../(admin)/admin/engagements/page", label: "admin/engagements" },
  { path: "../(admin)/admin/entitlements/page", label: "admin/entitlements" },
  { path: "../(admin)/admin/events/page", label: "admin/events" },
  { path: "../(admin)/admin/events/[slug]/page", label: "admin/events/[slug]" },
  { path: "../(admin)/admin/events/[slug]/export/page", label: "admin/events/[slug]/export" },
  { path: "../(admin)/admin/events/[slug]/registrations/page", label: "admin/events/[slug]/registrations" },
  { path: "../(admin)/admin/field-reports/page", label: "admin/field-reports" },
  { path: "../(admin)/admin/field-reports/[id]/page", label: "admin/field-reports/[id]" },
  { path: "../(admin)/admin/intake/page", label: "admin/intake" },
  { path: "../(admin)/admin/ledger/page", label: "admin/ledger" },
  { path: "../(admin)/admin/measurement/page", label: "admin/measurement" },
  { path: "../(admin)/admin/newsletter/page", label: "admin/newsletter" },
  { path: "../(admin)/admin/newsletter/[id]/page", label: "admin/newsletter/[id]" },
  { path: "../(admin)/admin/offers/page", label: "admin/offers" },
  { path: "../(admin)/admin/offers/[slug]/page", label: "admin/offers/[slug]" },
  { path: "../(admin)/admin/referrals/page", label: "admin/referrals" },
  { path: "../(admin)/admin/registrations/page", label: "admin/registrations" },
  { path: "../(admin)/admin/settings/page", label: "admin/settings" },
  { path: "../(admin)/admin/users/page", label: "admin/users" },

  // ── Public pages ───────────────────────────────────
  { path: "../(public)/page", label: "home" },
  { path: "../(public)/about/page", label: "about" },
  { path: "../(public)/account/page", label: "account" },
  { path: "../(public)/apprentices/page", label: "apprentices" },
  { path: "../(public)/apprentices/[handle]/page", label: "apprentices/[handle]" },
  { path: "../(public)/events/page", label: "events" },
  { path: "../(public)/events/[slug]/page", label: "events/[slug]" },
  { path: "../(public)/insights/page", label: "insights" },
  { path: "../(public)/login/page", label: "login" },
  { path: "../(public)/newsletter/page", label: "newsletter" },
  { path: "../(public)/newsletter/unsubscribe/page", label: "newsletter/unsubscribe" },
  { path: "../(public)/privacy/page", label: "privacy" },
  { path: "../(public)/register/page", label: "register" },
  { path: "../(public)/services/page", label: "services" },
  { path: "../(public)/services/[slug]/page", label: "services/[slug]" },
  { path: "../(public)/services/advisory/page", label: "services/advisory" },
  { path: "../(public)/services/request/page", label: "services/request" },
  { path: "../(public)/services/team-program/page", label: "services/team-program" },
  { path: "../(public)/services/workshop/page", label: "services/workshop" },
  { path: "../(public)/studio/page", label: "studio" },
  { path: "../(public)/studio/report/page", label: "studio/report" },
  { path: "../(public)/terms/page", label: "terms" },

  // ── Dev pages ──────────────────────────────────────
  { path: "../dev/catalog/page", label: "dev/catalog" },
];

describe("page smoke tests", () => {
  it.each(pages)("$label — has a default export function", async ({ path }) => {
    const mod = await import(path);
    expect(mod).toHaveProperty("default");
    expect(typeof mod.default).toBe("function");
  }, 15_000);
});
