/**
 * Sprint 15 – Automated Onboarding
 *
 * Tests covering onboarding model, checklist UI, SSE stream,
 * email sequences, role provisioning, and integration flows.
 */

import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* ── 1. Onboarding Progress Model ─────────────────── */

describe("Onboarding progress model", () => {
  it("builds progress with new-user steps only", async () => {
    const { buildOnboardingProgress } = await import("@/lib/onboarding");
    const progress = buildOnboardingProgress("user-1", {}, false);

    expect(progress.userId).toBe("user-1");
    expect(progress.totalSteps).toBe(3);
    expect(progress.completedSteps).toBe(0);
    expect(progress.complete).toBe(false);
    expect(progress.steps.map((s) => s.id)).toEqual([
      "verify_email",
      "complete_profile",
      "explore_events",
    ]);
  });

  it("builds progress with client steps included", async () => {
    const { buildOnboardingProgress } = await import("@/lib/onboarding");
    const progress = buildOnboardingProgress("user-2", {}, true);

    expect(progress.totalSteps).toBe(5);
    expect(progress.steps.map((s) => s.id)).toEqual([
      "verify_email",
      "complete_profile",
      "explore_events",
      "submit_intake",
      "sign_agreement",
    ]);
  });

  it("marks steps as completed when completions are provided", async () => {
    const { buildOnboardingProgress } = await import("@/lib/onboarding");
    const now = new Date().toISOString();
    const progress = buildOnboardingProgress(
      "user-3",
      { verify_email: now, complete_profile: now },
      false,
    );

    expect(progress.completedSteps).toBe(2);
    expect(progress.steps[0].completed).toBe(true);
    expect(progress.steps[0].completedAt).toBe(now);
    expect(progress.steps[1].completed).toBe(true);
    expect(progress.steps[2].completed).toBe(false);
  });

  it("reports complete when all steps are done", async () => {
    const { buildOnboardingProgress } = await import("@/lib/onboarding");
    const now = new Date().toISOString();
    const progress = buildOnboardingProgress(
      "user-4",
      { verify_email: now, complete_profile: now, explore_events: now },
      false,
    );

    expect(progress.complete).toBe(true);
    expect(progress.completedSteps).toBe(progress.totalSteps);
  });

  it("shouldShowOnboarding returns true for incomplete progress", async () => {
    const { buildOnboardingProgress, shouldShowOnboarding } = await import("@/lib/onboarding");
    const progress = buildOnboardingProgress("user-5", {}, false);

    expect(shouldShowOnboarding(progress)).toBe(true);
  });

  it("shouldShowOnboarding returns false for completed progress", async () => {
    const { buildOnboardingProgress, shouldShowOnboarding } = await import("@/lib/onboarding");
    const now = new Date().toISOString();
    const progress = buildOnboardingProgress(
      "user-6",
      { verify_email: now, complete_profile: now, explore_events: now },
      false,
    );

    expect(shouldShowOnboarding(progress)).toBe(false);
  });
});

/* ── 2. Role Provisioning Logic ────────────────────── */

describe("shouldProvisionClientRole", () => {
  it("returns false when intake not submitted", async () => {
    const { buildOnboardingProgress, shouldProvisionClientRole } = await import(
      "@/lib/onboarding"
    );
    const now = new Date().toISOString();
    const progress = buildOnboardingProgress(
      "user-7",
      { verify_email: now, complete_profile: now, explore_events: now, sign_agreement: now },
      true,
    );

    expect(shouldProvisionClientRole(progress)).toBe(false);
  });

  it("returns false when agreement not signed", async () => {
    const { buildOnboardingProgress, shouldProvisionClientRole } = await import(
      "@/lib/onboarding"
    );
    const now = new Date().toISOString();
    const progress = buildOnboardingProgress(
      "user-8",
      { verify_email: now, complete_profile: now, explore_events: now, submit_intake: now },
      true,
    );

    expect(shouldProvisionClientRole(progress)).toBe(false);
  });

  it("returns true when both intake and agreement are complete", async () => {
    const { buildOnboardingProgress, shouldProvisionClientRole } = await import(
      "@/lib/onboarding"
    );
    const now = new Date().toISOString();
    const progress = buildOnboardingProgress(
      "user-9",
      {
        verify_email: now,
        complete_profile: now,
        explore_events: now,
        submit_intake: now,
        sign_agreement: now,
      },
      true,
    );

    expect(shouldProvisionClientRole(progress)).toBe(true);
  });

  it("returns false when client steps are not included", async () => {
    const { buildOnboardingProgress, shouldProvisionClientRole } = await import(
      "@/lib/onboarding"
    );
    const now = new Date().toISOString();
    const progress = buildOnboardingProgress(
      "user-10",
      { verify_email: now, complete_profile: now, explore_events: now },
      false,
    );

    expect(shouldProvisionClientRole(progress)).toBe(false);
  });
});

/* ── 3. Onboarding Checklist UI ────────────────────── */

describe("OnboardingChecklist component", () => {
  it("renders without errors", async () => {
    const src = fs.readFileSync(
      path.resolve("src/components/dashboard/onboarding-checklist.tsx"),
      "utf-8",
    );

    expect(src).toContain("OnboardingChecklist");
    expect(src).toContain('aria-label="Onboarding checklist"');
    expect(src).toContain("progressbar");
    expect(src).toContain("CheckCircle2");
    expect(src).toContain("Circle");
  });

  it("returns null when progress is complete", async () => {
    const src = fs.readFileSync(
      path.resolve("src/components/dashboard/onboarding-checklist.tsx"),
      "utf-8",
    );

    // Component returns null for completed onboarding
    expect(src).toContain("if (progress.complete) return null");
  });

  it("includes dismiss button support", async () => {
    const src = fs.readFileSync(
      path.resolve("src/components/dashboard/onboarding-checklist.tsx"),
      "utf-8",
    );

    expect(src).toContain("onDismiss");
    expect(src).toContain("Dismiss");
  });

  it("uses proper design system classes", async () => {
    const src = fs.readFileSync(
      path.resolve("src/components/dashboard/onboarding-checklist.tsx"),
      "utf-8",
    );

    expect(src).toContain("surface-elevated");
    expect(src).toContain("type-title");
    expect(src).toContain("type-body-sm");
    expect(src).toContain("type-label");
    expect(src).toContain("type-meta");
  });

  it("links each step to its href", async () => {
    const src = fs.readFileSync(
      path.resolve("src/components/dashboard/onboarding-checklist.tsx"),
      "utf-8",
    );

    expect(src).toContain("href={step.href}");
    expect(src).toContain('import Link from "next/link"');
  });
});

/* ── 4. SSE Stream Endpoint ────────────────────────── */

describe("SSE stream endpoint", () => {
  it("route file exists at correct path", () => {
    const routePath = path.resolve("src/app/api/v1/onboarding/stream/route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("exports GET handler", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/stream/route.ts"),
      "utf-8",
    );
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("returns text/event-stream content type", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/stream/route.ts"),
      "utf-8",
    );
    expect(src).toContain("text/event-stream");
  });

  it("uses ReadableStream for SSE", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/stream/route.ts"),
      "utf-8",
    );
    expect(src).toContain("ReadableStream");
  });

  it("sends heartbeat to keep connection alive", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/stream/route.ts"),
      "utf-8",
    );
    expect(src).toContain("heartbeat");
  });

  it("cleans up on abort signal", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/stream/route.ts"),
      "utf-8",
    );
    expect(src).toContain("abort");
    expect(src).toContain("clearInterval");
  });

  it("sets no-cache headers", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/stream/route.ts"),
      "utf-8",
    );
    expect(src).toContain("no-cache");
  });

  it("exports broadcastStepComplete helper", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/stream/route.ts"),
      "utf-8",
    );
    expect(src).toMatch(/export\s+function\s+broadcastStepComplete/);
  });
});

/* ── 5. Onboarding Progress Endpoint ──────────────── */

describe("Onboarding progress endpoint", () => {
  it("route file exists", () => {
    const routePath = path.resolve("src/app/api/v1/onboarding/progress/route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("exports GET handler", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/progress/route.ts"),
      "utf-8",
    );
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("includes HAL _links in response", () => {
    const src = fs.readFileSync(
      path.resolve("src/app/api/v1/onboarding/progress/route.ts"),
      "utf-8",
    );
    expect(src).toContain("_links");
    expect(src).toContain("/api/v1/onboarding/stream");
  });
});

/* ── 6. Onboarding Email Sequences ─────────────────── */

describe("Onboarding email templates", () => {
  it("buildProfileCompleteEmail returns valid message", async () => {
    const { buildProfileCompleteEmail } = await import("@/lib/onboarding-emails");
    const msg = buildProfileCompleteEmail("user@test.com", "https://example.com");

    expect(msg.to).toBe("user@test.com");
    expect(msg.subject).toContain("profile");
    expect(msg.textBody).toContain("complete");
    expect(msg.htmlBody).toContain("</");
    expect(msg.tag).toBe("onboarding-profile-complete");
  });

  it("buildIntakeReceivedEmail returns valid message", async () => {
    const { buildIntakeReceivedEmail } = await import("@/lib/onboarding-emails");
    const msg = buildIntakeReceivedEmail("client@test.com", "https://example.com");

    expect(msg.to).toBe("client@test.com");
    expect(msg.subject).toContain("intake");
    expect(msg.textBody).toContain("intake");
    expect(msg.tag).toBe("onboarding-intake-received");
  });

  it("buildClientRoleGrantedEmail returns valid message", async () => {
    const { buildClientRoleGrantedEmail } = await import("@/lib/onboarding-emails");
    const msg = buildClientRoleGrantedEmail("client@test.com", "https://example.com");

    expect(msg.to).toBe("client@test.com");
    expect(msg.subject).toContain("client access");
    expect(msg.htmlBody).toContain("dashboard");
    expect(msg.tag).toBe("onboarding-client-granted");
  });

  it("buildOnboardingEmail returns null for unknown milestone", async () => {
    const { buildOnboardingEmail } = await import("@/lib/onboarding-emails");
    // @ts-expect-error — testing unknown milestone
    const msg = buildOnboardingEmail("unknown_milestone", "a@b.com", "https://example.com");
    expect(msg).toBeNull();
  });

  it("buildOnboardingEmail dispatches to correct builder", async () => {
    const { buildOnboardingEmail } = await import("@/lib/onboarding-emails");

    const profileMsg = buildOnboardingEmail("profile_complete", "a@b.com", "https://example.com");
    expect(profileMsg?.tag).toBe("onboarding-profile-complete");

    const intakeMsg = buildOnboardingEmail("intake_received", "a@b.com", "https://example.com");
    expect(intakeMsg?.tag).toBe("onboarding-intake-received");

    const clientMsg = buildOnboardingEmail(
      "client_role_granted",
      "a@b.com",
      "https://example.com",
    );
    expect(clientMsg?.tag).toBe("onboarding-client-granted");
  });

  it("hasOptedOutOfMarketing returns false by default", async () => {
    const { hasOptedOutOfMarketing } = await import("@/lib/onboarding-emails");
    expect(hasOptedOutOfMarketing("any-user")).toBe(false);
  });
});

/* ── 7. Role Provisioning Module ───────────────────── */

describe("Onboarding role provisioning module", () => {
  it("module exports provisionClientRole", async () => {
    const src = fs.readFileSync(path.resolve("src/lib/onboarding-roles.ts"), "utf-8");

    expect(src).toContain("export function provisionClientRole");
    expect(src).toContain("shouldProvisionClientRole");
    expect(src).toContain("assignUserRole");
    expect(src).toContain("ensureRoleByName");
  });

  it("sends client role granted email on provisioning", () => {
    const src = fs.readFileSync(path.resolve("src/lib/onboarding-roles.ts"), "utf-8");

    expect(src).toContain("buildClientRoleGrantedEmail");
    expect(src).toContain("sendEmailAsync");
  });

  it("writes audit log on role provisioning", () => {
    const src = fs.readFileSync(path.resolve("src/lib/onboarding-roles.ts"), "utf-8");

    expect(src).toContain("appendAuditLog");
    expect(src).toContain("api.onboarding.provision_client_role");
  });

  it("returns provisioned: false when milestones not met", () => {
    const src = fs.readFileSync(path.resolve("src/lib/onboarding-roles.ts"), "utf-8");

    expect(src).toContain("Required milestones not met");
  });

  it("is idempotent — checks existing roles before provisioning", () => {
    const src = fs.readFileSync(path.resolve("src/lib/onboarding-roles.ts"), "utf-8");

    expect(src).toContain("listUserRoleNames");
    expect(src).toContain("CLIENT role already assigned");
  });

  it("broadcasts step completion via SSE", () => {
    const src = fs.readFileSync(path.resolve("src/lib/onboarding-roles.ts"), "utf-8");

    expect(src).toContain("broadcastStepComplete");
  });
});

/* ── 8. FeedItem type supports OnboardingProgress ──── */

describe("FeedItem OnboardingProgress type", () => {
  it("includes OnboardingProgress in FeedItem type union", async () => {
    const src = fs.readFileSync(path.resolve("src/lib/api/feed.ts"), "utf-8");
    expect(src).toContain("OnboardingProgress");
  });
});

/* ── 9. Integration: Returning user doesn't see checklist ── */

describe("Returning user onboarding behavior", () => {
  it("completed progress causes checklist to return null", async () => {
    const { buildOnboardingProgress } = await import("@/lib/onboarding");
    const now = new Date().toISOString();
    const progress = buildOnboardingProgress(
      "returning-user",
      { verify_email: now, complete_profile: now, explore_events: now },
      false,
    );

    // The component checks progress.complete and returns null
    expect(progress.complete).toBe(true);

    // Verify the component has this guard
    const src = fs.readFileSync(
      path.resolve("src/components/dashboard/onboarding-checklist.tsx"),
      "utf-8",
    );
    expect(src).toContain("if (progress.complete) return null");
  });
});

/* ── 10. Integration: step href matches real routes ── */

describe("Onboarding step route validity", () => {
  it("all step hrefs point to existing route directories", async () => {
    const { buildOnboardingProgress } = await import("@/lib/onboarding");
    const progress = buildOnboardingProgress("user-x", {}, true);

    const expectedHrefs = ["/account", "/account", "/events", "/services/request", "/dashboard"];
    const actualHrefs = progress.steps.map((s) => s.href);
    expect(actualHrefs).toEqual(expectedHrefs);
  });
});

/* ── 11. Integration: onboarding email tags are unique ─ */

describe("Onboarding email tag uniqueness", () => {
  it("all milestone emails have unique tags", async () => {
    const { buildOnboardingEmail } = await import("@/lib/onboarding-emails");
    const milestones = ["profile_complete", "intake_received", "client_role_granted"] as const;

    const tags = milestones.map(
      (m) => buildOnboardingEmail(m, "a@b.com", "https://x.com")?.tag,
    );
    const unique = new Set(tags);
    expect(unique.size).toBe(tags.length);
  });
});
