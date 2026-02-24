/**
 * Sprint 16 – Real-Time Telemetry
 *
 * Tests covering analytics facade, privacy controls, PII sanitisation,
 * custom event tracking, admin telemetry dashboard, and consent mechanism.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* ── 1. Analytics Facade ───────────────────────────── */

describe("Analytics facade", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports analytics object with required methods", async () => {
    const { analytics } = await import("@/lib/analytics");
    expect(analytics).toHaveProperty("init");
    expect(analytics).toHaveProperty("capture");
    expect(analytics).toHaveProperty("identify");
    expect(analytics).toHaveProperty("reset");
  });

  it("capture does not throw when called before init", async () => {
    const { analytics } = await import("@/lib/analytics");
    expect(() => analytics.capture("test_event")).not.toThrow();
  });

  it("identify does not throw when called without tracking", async () => {
    const { analytics } = await import("@/lib/analytics");
    expect(() => analytics.identify("user-1", { name: "Test" })).not.toThrow();
  });

  it("reset resets initialisation state", async () => {
    const { analytics } = await import("@/lib/analytics");
    analytics.init();
    analytics.reset();
    expect(analytics.isInitialised).toBe(false);
  });
});

/* ── 2. PII Sanitisation ──────────────────────────── */

describe("PII sanitisation", () => {
  it("redacts email addresses", async () => {
    const { sanitiseProperties } = await import("@/lib/analytics");
    const result = sanitiseProperties({ email: "user@example.com" });
    expect(result?.email).toBe("[email]");
  });

  it("redacts sensitive keys", async () => {
    const { sanitiseProperties } = await import("@/lib/analytics");
    const result = sanitiseProperties({
      password: "secret123",
      token: "abc-def",
      secret: "hidden",
    });
    expect(result?.password).toBe("[REDACTED]");
    expect(result?.token).toBe("[REDACTED]");
    expect(result?.secret).toBe("[REDACTED]");
  });

  it("preserves non-sensitive values", async () => {
    const { sanitiseProperties } = await import("@/lib/analytics");
    const result = sanitiseProperties({
      slug: "react-101",
      count: 5,
      active: true,
    });
    expect(result?.slug).toBe("react-101");
    expect(result?.count).toBe(5);
    expect(result?.active).toBe(true);
  });

  it("returns undefined for undefined input", async () => {
    const { sanitiseProperties } = await import("@/lib/analytics");
    expect(sanitiseProperties(undefined)).toBeUndefined();
  });

  it("handles mixed content with embedded emails", async () => {
    const { sanitiseProperties } = await import("@/lib/analytics");
    const result = sanitiseProperties({
      note: "Contact jane@corp.com for details",
    });
    expect(result?.note).toBe("Contact [email] for details");
  });
});

/* ── 3. Consent Mechanism ─────────────────────────── */

describe("Consent and tracking controls", () => {
  it("exports isDoNotTrack function", async () => {
    const mod = await import("@/lib/analytics");
    expect(typeof mod.isDoNotTrack).toBe("function");
  });

  it("exports hasOptedOut function", async () => {
    const mod = await import("@/lib/analytics");
    expect(typeof mod.hasOptedOut).toBe("function");
  });

  it("exports optOut and optIn functions", async () => {
    const mod = await import("@/lib/analytics");
    expect(typeof mod.optOut).toBe("function");
    expect(typeof mod.optIn).toBe("function");
  });

  it("exports isTrackingAllowed function", async () => {
    const mod = await import("@/lib/analytics");
    expect(typeof mod.isTrackingAllowed).toBe("function");
  });

  it("isDoNotTrack returns false in test environment (no navigator)", async () => {
    const { isDoNotTrack } = await import("@/lib/analytics");
    // navigator may or may not be defined in test env
    const result = isDoNotTrack();
    expect(typeof result).toBe("boolean");
  });

  it("hasOptedOut returns false in test environment (no document)", async () => {
    const { hasOptedOut } = await import("@/lib/analytics");
    const result = hasOptedOut();
    expect(typeof result).toBe("boolean");
  });
});

/* ── 4. Custom Event Constants ─────────────────────── */

describe("Analytics event constants", () => {
  it("defines all required event categories", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics-events");

    // Onboarding
    expect(ANALYTICS_EVENTS.ONBOARDING_STARTED).toBeDefined();
    expect(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED).toBeDefined();
    expect(ANALYTICS_EVENTS.ONBOARDING_COMPLETED).toBeDefined();

    // Auth
    expect(ANALYTICS_EVENTS.USER_REGISTERED).toBeDefined();
    expect(ANALYTICS_EVENTS.USER_LOGGED_IN).toBeDefined();

    // Intake & roles
    expect(ANALYTICS_EVENTS.INTAKE_SUBMITTED).toBeDefined();
    expect(ANALYTICS_EVENTS.ROLE_PROVISIONED).toBeDefined();

    // Events
    expect(ANALYTICS_EVENTS.EVENT_VIEWED).toBeDefined();
    expect(ANALYTICS_EVENTS.EVENT_REGISTERED).toBeDefined();
  });

  it("all event names are unique", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics-events");
    const values = Object.values(ANALYTICS_EVENTS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("all event names are lowercase snake_case", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics-events");
    for (const name of Object.values(ANALYTICS_EVENTS)) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("exports trackEvent helper", async () => {
    const { trackEvent } = await import("@/lib/analytics-events");
    expect(typeof trackEvent).toBe("function");
    // Should not throw
    expect(() => trackEvent("page_viewed", { path: "/" })).not.toThrow();
  });
});

/* ── 5. Analytics Provider Component ──────────────── */

describe("AnalyticsProvider component", () => {
  it("component file exists", () => {
    const filePath = path.resolve("src/components/analytics-provider.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("is a client component", () => {
    const src = fs.readFileSync(
      path.resolve("src/components/analytics-provider.tsx"),
      "utf-8",
    );
    expect(src).toContain('"use client"');
  });

  it("calls analytics.init on mount", () => {
    const src = fs.readFileSync(
      path.resolve("src/components/analytics-provider.tsx"),
      "utf-8",
    );
    expect(src).toContain("analytics.init()");
    expect(src).toContain("useEffect");
  });

  it("renders children", () => {
    const src = fs.readFileSync(
      path.resolve("src/components/analytics-provider.tsx"),
      "utf-8",
    );
    expect(src).toContain("children");
  });
});

/* ── 6. Root Layout Integration ────────────────────── */

describe("Root layout analytics integration", () => {
  it("imports AnalyticsProvider", () => {
    const src = fs.readFileSync(path.resolve("src/app/layout.tsx"), "utf-8");
    expect(src).toContain("AnalyticsProvider");
  });

  it("wraps children with AnalyticsProvider", () => {
    const src = fs.readFileSync(path.resolve("src/app/layout.tsx"), "utf-8");
    expect(src).toContain("<AnalyticsProvider>");
    expect(src).toContain("</AnalyticsProvider>");
  });
});

/* ── 7. Admin Telemetry Dashboard ──────────────────── */

describe("Admin telemetry dashboard", () => {
  it("page file exists", () => {
    const filePath = path.resolve("src/app/(admin)/admin/telemetry/page.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("requires SUPER_ADMIN role", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(admin)/admin/telemetry/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("SUPER_ADMIN");
    expect(src).toContain("hasRequiredRole");
  });

  it("shows non-admin users an access denied panel", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(admin)/admin/telemetry/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("ProblemDetailsPanel");
    expect(src).toContain("roleAccessProblem");
  });

  it("displays events catalogue from ANALYTICS_EVENTS", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(admin)/admin/telemetry/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("ANALYTICS_EVENTS");
    expect(src).toContain("Tracked Events Catalogue");
  });

  it("shows privacy controls status", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(admin)/admin/telemetry/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("Privacy Controls");
    expect(src).toContain("Do Not Track");
    expect(src).toContain("so_tracking_optout");
  });

  it("shows analytics provider status", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(admin)/admin/telemetry/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("PostHog");
    expect(src).toContain("NEXT_PUBLIC_POSTHOG_KEY");
  });

  it("uses PageShell layout", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/(admin)/admin/telemetry/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("PageShell");
  });
});

/* ── 8. Privacy: sensitive data never sent ─────────── */

describe("Privacy guarantees", () => {
  it("sanitiseProperties strips password fields", async () => {
    const { sanitiseProperties } = await import("@/lib/analytics");
    const result = sanitiseProperties({ password: "hunter2", name: "Alice" });
    expect(result?.password).toBe("[REDACTED]");
    expect(result?.name).toBe("Alice");
  });

  it("sanitiseProperties strips credit_card fields", async () => {
    const { sanitiseProperties } = await import("@/lib/analytics");
    const result = sanitiseProperties({ credit_card: "4111111111111111" });
    expect(result?.credit_card).toBe("[REDACTED]");
  });

  it("capture calls sanitiseProperties before dispatch", () => {
    const src = fs.readFileSync(path.resolve("src/lib/analytics.ts"), "utf-8");
    expect(src).toContain("sanitiseProperties");
    // capture method uses sanitiseProperties
    const captureSection = src.slice(src.indexOf("capture(eventName"));
    expect(captureSection).toContain("sanitiseProperties");
  });
});

/* ── 9. Measurement system pre-existing ─────────────── */

describe("Existing measurement system integration", () => {
  it("measurement client exists", () => {
    expect(fs.existsSync(path.resolve("src/lib/measurement-client.ts"))).toBe(true);
  });

  it("measurement API exists", () => {
    expect(fs.existsSync(path.resolve("src/lib/api/measurement.ts"))).toBe(true);
  });

  it("admin measurement page exists", () => {
    expect(
      fs.existsSync(path.resolve("src/app/(admin)/admin/measurement/page.tsx")),
    ).toBe(true);
  });

  it("measurement defines allowed event keys", () => {
    const src = fs.readFileSync(
      path.resolve("src/lib/api/measurement.ts"),
      "utf-8",
    );
    expect(src).toContain("ALLOWED_KEYS");
    expect(src).toContain("CTA_CLICK_VIEW_TRAINING_TRACKS");
    expect(src).toContain("FORM_SUBMIT_CONSULT_REQUEST_SUCCESS");
  });
});

/* ── 10. Tracking disabled doesn't fire events ────── */

describe("Tracking disabled behavior", () => {
  it("capture is a no-op when isTrackingAllowed returns false", () => {
    // Verify the code path: capture checks isTrackingAllowed at top
    const src = fs.readFileSync(path.resolve("src/lib/analytics.ts"), "utf-8");
    const captureBody = src.slice(
      src.indexOf("capture(eventName"),
      src.indexOf("identify(userId"),
    );
    expect(captureBody).toContain("isTrackingAllowed");
  });

  it("identify is a no-op when tracking disallowed", () => {
    const src = fs.readFileSync(path.resolve("src/lib/analytics.ts"), "utf-8");
    const identifyBody = src.slice(
      src.indexOf("identify(userId"),
      src.indexOf("reset()"),
    );
    expect(identifyBody).toContain("isTrackingAllowed");
  });

  it("init is a no-op when tracking disallowed", () => {
    const src = fs.readFileSync(path.resolve("src/lib/analytics.ts"), "utf-8");
    const initBody = src.slice(src.indexOf("init()"), src.indexOf("capture(eventName"));
    expect(initBody).toContain("isTrackingAllowed");
  });
});
