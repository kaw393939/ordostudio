/**
 * Sprint 18 – Agent Ops Triage
 *
 * Tests covering: triage domain model, LLM triage facade (rules & OpenAI),
 * automated email responses, admin feedback/override mechanism,
 * Agent Ops dashboard, user menu, avatar upload, and IA fixes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* ══════════════════════════════════════════════════════
   1. TRIAGE DOMAIN MODEL
   ══════════════════════════════════════════════════════ */

describe("Triage domain model", () => {
  it("exports all 7 categories", async () => {
    const { TRIAGE_CATEGORIES } = await import("@/lib/triage");
    expect(TRIAGE_CATEGORIES).toHaveLength(7);
    expect(TRIAGE_CATEGORIES).toContain("billing_support");
    expect(TRIAGE_CATEGORIES).toContain("urgent_escalation");
    expect(TRIAGE_CATEGORIES).toContain("spam");
  });

  it("provides human labels for every category", async () => {
    const { TRIAGE_CATEGORIES, CATEGORY_LABELS } = await import("@/lib/triage");
    for (const cat of TRIAGE_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });

  it("exports all 4 priority levels", async () => {
    const { TRIAGE_PRIORITIES } = await import("@/lib/triage");
    expect(TRIAGE_PRIORITIES).toEqual(["low", "medium", "high", "urgent"]);
  });

  it("exports all 6 statuses", async () => {
    const { TRIAGE_STATUSES } = await import("@/lib/triage");
    expect(TRIAGE_STATUSES).toHaveLength(6);
    expect(TRIAGE_STATUSES).toContain("pending");
    expect(TRIAGE_STATUSES).toContain("auto_responded");
  });

  it("isHighConfidence returns true for >= 0.7", async () => {
    const { isHighConfidence } = await import("@/lib/triage");
    expect(isHighConfidence(0.7)).toBe(true);
    expect(isHighConfidence(0.9)).toBe(true);
    expect(isHighConfidence(0.69)).toBe(false);
    expect(isHighConfidence(0.4)).toBe(false);
  });

  it("effectiveCategory prefers admin override", async () => {
    const { effectiveCategory } = await import("@/lib/triage");
    const ticket = {
      category: "general_inquiry" as const,
      admin_override_category: "billing_support" as const,
    };
    expect(effectiveCategory(ticket as any)).toBe("billing_support");
  });

  it("effectiveCategory falls back to AI category when no override", async () => {
    const { effectiveCategory } = await import("@/lib/triage");
    const ticket = { category: "technical_issue" as const, admin_override_category: null };
    expect(effectiveCategory(ticket as any)).toBe("technical_issue");
  });

  it("shouldAutoRespond returns true for high-confidence triaged ticket", async () => {
    const { shouldAutoRespond } = await import("@/lib/triage");
    const ticket = {
      category: "general_inquiry" as const,
      confidence: 0.85,
      status: "triaged" as const,
      admin_override_category: null,
    };
    expect(shouldAutoRespond(ticket as any)).toBe(true);
  });

  it("shouldAutoRespond returns false for urgent_escalation", async () => {
    const { shouldAutoRespond } = await import("@/lib/triage");
    const ticket = {
      category: "urgent_escalation" as const,
      confidence: 0.95,
      status: "triaged" as const,
      admin_override_category: null,
    };
    expect(shouldAutoRespond(ticket as any)).toBe(false);
  });

  it("shouldAutoRespond returns false for spam", async () => {
    const { shouldAutoRespond } = await import("@/lib/triage");
    const ticket = {
      category: "spam" as const,
      confidence: 0.99,
      status: "triaged" as const,
      admin_override_category: null,
    };
    expect(shouldAutoRespond(ticket as any)).toBe(false);
  });

  it("shouldAutoRespond returns false for non-triaged status", async () => {
    const { shouldAutoRespond } = await import("@/lib/triage");
    const ticket = {
      category: "general_inquiry" as const,
      confidence: 0.85,
      status: "auto_responded" as const,
      admin_override_category: null,
    };
    expect(shouldAutoRespond(ticket as any)).toBe(false);
  });

  it("shouldAutoRespond returns true when admin override makes it trusted", async () => {
    const { shouldAutoRespond } = await import("@/lib/triage");
    const ticket = {
      category: "general_inquiry" as const,
      confidence: 0.3,
      status: "triaged" as const,
      admin_override_category: "billing_support" as const,
    };
    expect(shouldAutoRespond(ticket as any)).toBe(true);
  });

  it("shouldEscalate returns true for urgent_escalation", async () => {
    const { shouldEscalate } = await import("@/lib/triage");
    const ticket = {
      category: "urgent_escalation" as const,
      confidence: 0.9,
      admin_override_category: null,
    };
    expect(shouldEscalate(ticket as any)).toBe(true);
  });

  it("shouldEscalate returns true for low confidence with no override", async () => {
    const { shouldEscalate } = await import("@/lib/triage");
    const ticket = {
      category: "general_inquiry" as const,
      confidence: 0.4,
      admin_override_category: null,
    };
    expect(shouldEscalate(ticket as any)).toBe(true);
  });

  it("shouldEscalate returns false for high confidence non-urgent", async () => {
    const { shouldEscalate } = await import("@/lib/triage");
    const ticket = {
      category: "billing_support" as const,
      confidence: 0.85,
      admin_override_category: null,
    };
    expect(shouldEscalate(ticket as any)).toBe(false);
  });

  it("derivePriority returns urgent for urgent_escalation", async () => {
    const { derivePriority } = await import("@/lib/triage");
    expect(derivePriority("urgent_escalation", 0.9)).toBe("urgent");
  });

  it("derivePriority returns high for low confidence", async () => {
    const { derivePriority } = await import("@/lib/triage");
    expect(derivePriority("general_inquiry", 0.4)).toBe("high");
  });

  it("derivePriority returns medium for billing/technical", async () => {
    const { derivePriority } = await import("@/lib/triage");
    expect(derivePriority("billing_support", 0.8)).toBe("medium");
    expect(derivePriority("technical_issue", 0.8)).toBe("medium");
  });

  it("derivePriority returns low for general high-confidence", async () => {
    const { derivePriority } = await import("@/lib/triage");
    expect(derivePriority("general_inquiry", 0.9)).toBe("low");
    expect(derivePriority("feature_request", 0.85)).toBe("low");
  });

  it("isValidCategory accepts valid categories", async () => {
    const { isValidCategory } = await import("@/lib/triage");
    expect(isValidCategory("billing_support")).toBe(true);
    expect(isValidCategory("spam")).toBe(true);
  });

  it("isValidCategory rejects invalid strings", async () => {
    const { isValidCategory } = await import("@/lib/triage");
    expect(isValidCategory("not_a_category")).toBe(false);
    expect(isValidCategory("")).toBe(false);
  });

  it("hasAdminOverride detects overrides", async () => {
    const { hasAdminOverride } = await import("@/lib/triage");
    expect(hasAdminOverride({ admin_override_category: "billing_support" } as any)).toBe(true);
    expect(hasAdminOverride({ admin_override_category: null } as any)).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════
   2. LLM TRIAGE FACADE (RULE-BASED)
   ══════════════════════════════════════════════════════ */

describe("LLM triage facade (rules)", () => {
  it("classifies billing keywords as billing_support", async () => {
    const { triageWithRules } = await import("@/lib/llm-triage");
    const result = triageWithRules("I need help with my billing and invoice");
    expect(result.category).toBe("billing_support");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("classifies technical keywords as technical_issue", async () => {
    const { triageWithRules } = await import("@/lib/llm-triage");
    const result = triageWithRules("The app is crashing with a 500 error");
    expect(result.category).toBe("technical_issue");
  });

  it("classifies urgent keywords as urgent_escalation", async () => {
    const { triageWithRules } = await import("@/lib/llm-triage");
    const result = triageWithRules("This is urgent, our system is down!");
    expect(result.category).toBe("urgent_escalation");
  });

  it("classifies feature keywords as feature_request", async () => {
    const { triageWithRules } = await import("@/lib/llm-triage");
    const result = triageWithRules("Could you add a dark mode feature?");
    expect(result.category).toBe("feature_request");
  });

  it("classifies partnership keywords", async () => {
    const { triageWithRules } = await import("@/lib/llm-triage");
    const result = triageWithRules("We'd like to partner on a collab");
    expect(result.category).toBe("partnership");
  });

  it("falls back to general_inquiry with low confidence for unrecognised text", async () => {
    const { triageWithRules } = await import("@/lib/llm-triage");
    const result = triageWithRules("Hello, I have a question about your services");
    expect(result.category).toBe("general_inquiry");
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("returns a summary capped at 120 chars", async () => {
    const { triageWithRules } = await import("@/lib/llm-triage");
    const longText = "A ".repeat(200);
    const result = triageWithRules(longText);
    expect(result.summary.length).toBeLessThanOrEqual(120);
  });

  it("returns all required fields in result", async () => {
    const { triageWithRules } = await import("@/lib/llm-triage");
    const result = triageWithRules("Test request");
    expect(result).toHaveProperty("category");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("recommended_action");
    expect(result).toHaveProperty("priority");
  });

  it("triageRequest falls back to rules when no API key", async () => {
    delete process.env.API__OPENAI_API_KEY;
    const { triageRequest } = await import("@/lib/llm-triage");
    const result = await triageRequest({ text: "I have a question about my invoice" });
    expect(result.category).toBe("billing_support");
  });

  it("buildTriageText combines intake fields", async () => {
    const { buildTriageText } = await import("@/lib/llm-triage");
    const text = buildTriageText({
      goals: "Learn AI",
      constraints: "Budget limited",
      timeline: "Q1 2026",
      contact_name: "John",
      audience: "INDIVIDUAL",
    });
    expect(text).toContain("Goals: Learn AI");
    expect(text).toContain("Constraints: Budget limited");
    expect(text).toContain("Timeline: Q1 2026");
    expect(text).toContain("Contact: John");
    expect(text).toContain("Audience: INDIVIDUAL");
  });
});

/* ══════════════════════════════════════════════════════
   3. TRIAGE EMAIL TEMPLATES
   ══════════════════════════════════════════════════════ */

describe("Triage email templates", () => {
  it("builds general inquiry response with FAQ link", async () => {
    const { buildTriageResponseEmail } = await import("@/lib/triage-emails");
    const email = buildTriageResponseEmail("general_inquiry", "user@test.com", "Test summary", "https://studio.com");
    expect(email).not.toBeNull();
    expect(email!.to).toBe("user@test.com");
    expect(email!.subject).toContain("received");
    expect(email!.textBody).toContain("FAQ");
    expect(email!.tag).toContain("general-inquiry");
  });

  it("builds billing support response with billing link", async () => {
    const { buildTriageResponseEmail } = await import("@/lib/triage-emails");
    const email = buildTriageResponseEmail("billing_support", "user@test.com", "Billing issue", "https://studio.com");
    expect(email).not.toBeNull();
    expect(email!.textBody).toContain("billing");
    expect(email!.tag).toContain("billing");
  });

  it("builds technical issue response", async () => {
    const { buildTriageResponseEmail } = await import("@/lib/triage-emails");
    const email = buildTriageResponseEmail("technical_issue", "user@test.com", "App crash", "https://studio.com");
    expect(email).not.toBeNull();
    expect(email!.subject).toContain("technical");
    expect(email!.tag).toContain("technical");
  });

  it("builds feature request response", async () => {
    const { buildTriageResponseEmail } = await import("@/lib/triage-emails");
    const email = buildTriageResponseEmail("feature_request", "user@test.com", "Dark mode", "https://studio.com");
    expect(email).not.toBeNull();
    expect(email!.subject).toContain("feature");
  });

  it("builds partnership response", async () => {
    const { buildTriageResponseEmail } = await import("@/lib/triage-emails");
    const email = buildTriageResponseEmail("partnership", "user@test.com", "Collab inquiry", "https://studio.com");
    expect(email).not.toBeNull();
    expect(email!.subject).toContain("Partnership");
  });

  it("returns null for urgent_escalation", async () => {
    const { buildTriageResponseEmail } = await import("@/lib/triage-emails");
    const email = buildTriageResponseEmail("urgent_escalation", "user@test.com", "Summary", "https://studio.com");
    expect(email).toBeNull();
  });

  it("returns null for spam", async () => {
    const { buildTriageResponseEmail } = await import("@/lib/triage-emails");
    const email = buildTriageResponseEmail("spam", "user@test.com", "Summary", "https://studio.com");
    expect(email).toBeNull();
  });

  it("hasAutoResponseTemplate returns correct values", async () => {
    const { hasAutoResponseTemplate } = await import("@/lib/triage-emails");
    expect(hasAutoResponseTemplate("general_inquiry")).toBe(true);
    expect(hasAutoResponseTemplate("billing_support")).toBe(true);
    expect(hasAutoResponseTemplate("urgent_escalation")).toBe(false);
    expect(hasAutoResponseTemplate("spam")).toBe(false);
  });

  it("email textBody includes the summary", async () => {
    const { buildTriageResponseEmail } = await import("@/lib/triage-emails");
    const email = buildTriageResponseEmail("general_inquiry", "u@t.com", "My specific request", "https://s.com");
    expect(email!.textBody).toContain("My specific request");
    expect(email!.htmlBody).toContain("My specific request");
  });
});

/* ══════════════════════════════════════════════════════
   4. AGENT OPS DASHBOARD (file checks)
   ══════════════════════════════════════════════════════ */

describe("Agent Ops dashboard", () => {
  const dashboardPath = path.resolve(
    __dirname,
    "../../app/(admin)/admin/agent-ops/page.tsx",
  );

  it("dashboard file exists", () => {
    expect(fs.existsSync(dashboardPath)).toBe(true);
  });

  it("dashboard imports triage categories", () => {
    const src = fs.readFileSync(dashboardPath, "utf-8");
    expect(src).toContain("TRIAGE_CATEGORIES");
    expect(src).toContain("CATEGORY_LABELS");
  });

  it("dashboard is RBAC-gated to SUPER_ADMIN", () => {
    const src = fs.readFileSync(dashboardPath, "utf-8");
    expect(src).toContain("SUPER_ADMIN");
    expect(src).toContain("hasRequiredRole");
  });

  it("dashboard shows triage provider status", () => {
    const src = fs.readFileSync(dashboardPath, "utf-8");
    expect(src).toContain("Triage Provider");
    expect(src).toContain("API__OPENAI_API_KEY");
  });

  it("dashboard shows priority levels", () => {
    const src = fs.readFileSync(dashboardPath, "utf-8");
    expect(src).toContain("TRIAGE_PRIORITIES");
    expect(src).toContain("Priority Levels");
  });

  it("dashboard shows triage rules", () => {
    const src = fs.readFileSync(dashboardPath, "utf-8");
    expect(src).toContain("Triage Rules");
    expect(src).toContain("Auto-Response");
  });
});

/* ══════════════════════════════════════════════════════
   5. TRIAGE API ENDPOINT (file checks)
   ══════════════════════════════════════════════════════ */

describe("Triage API endpoint", () => {
  const routePath = path.resolve(
    __dirname,
    "../../app/api/v1/admin/triage/route.ts",
  );

  it("triage API route file exists", () => {
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("exports POST handler for triage", () => {
    const src = fs.readFileSync(routePath, "utf-8");
    expect(src).toContain("export const POST");
  });

  it("exports PATCH handler for admin override", () => {
    const src = fs.readFileSync(routePath, "utf-8");
    expect(src).toContain("export const PATCH");
  });

  it("validates admin role", () => {
    const src = fs.readFileSync(routePath, "utf-8");
    expect(src).toContain("ADMIN");
    expect(src).toContain("SUPER_ADMIN");
  });

  it("uses triageRequest for LLM classification", () => {
    const src = fs.readFileSync(routePath, "utf-8");
    expect(src).toContain("triageRequest");
  });

  it("logs audit entries for triage actions", () => {
    const src = fs.readFileSync(routePath, "utf-8");
    expect(src).toContain("triage.completed");
    expect(src).toContain("triage.override");
    expect(src).toContain("audit_log");
  });

  it("validates override_category with isValidCategory", () => {
    const src = fs.readFileSync(routePath, "utf-8");
    expect(src).toContain("isValidCategory");
  });
});

/* ══════════════════════════════════════════════════════
   6. DATABASE MIGRATION
   ══════════════════════════════════════════════════════ */

describe("Triage tickets migration", () => {
  const dbPath = path.resolve(__dirname, "../../cli/db.ts");
  const src = fs.readFileSync(dbPath, "utf-8");

  it("migration 030_triage_tickets exists", () => {
    expect(src).toContain("030_triage_tickets");
  });

  it("creates triage_tickets table", () => {
    expect(src).toContain("CREATE TABLE IF NOT EXISTS triage_tickets");
  });

  it("includes category CHECK constraint", () => {
    expect(src).toContain("billing_support");
    expect(src).toContain("urgent_escalation");
  });

  it("includes status CHECK constraint", () => {
    expect(src).toContain("auto_responded");
    expect(src).toContain("escalated");
  });

  it("includes index on intake_request_id", () => {
    expect(src).toContain("idx_triage_tickets_intake");
  });

  it("includes index on status", () => {
    expect(src).toContain("idx_triage_tickets_status");
  });
});

/* ══════════════════════════════════════════════════════
   7. USER MENU COMPONENT
   ══════════════════════════════════════════════════════ */

describe("User menu component", () => {
  const menuPath = path.resolve(
    __dirname,
    "../../components/navigation/user-menu.tsx",
  );

  it("user-menu file exists", () => {
    expect(fs.existsSync(menuPath)).toBe(true);
  });

  it("is a client component", () => {
    const src = fs.readFileSync(menuPath, "utf-8");
    expect(src).toContain('"use client"');
  });

  it("uses DropdownMenu from Radix", () => {
    const src = fs.readFileSync(menuPath, "utf-8");
    expect(src).toContain("DropdownMenu");
    expect(src).toContain("DropdownMenuTrigger");
    expect(src).toContain("DropdownMenuContent");
  });

  it("uses Avatar component", () => {
    const src = fs.readFileSync(menuPath, "utf-8");
    expect(src).toContain("Avatar");
    expect(src).toContain("AvatarFallback");
    expect(src).toContain("AvatarImage");
  });

  it("includes links to dashboard, profile, billing, logout", () => {
    const src = fs.readFileSync(menuPath, "utf-8");
    expect(src).toContain("/dashboard");
    expect(src).toContain("/account");
    expect(src).toContain("/settings/billing");
    expect(src).toContain("/logout");
  });

  it("includes admin console link for admin users", () => {
    const src = fs.readFileSync(menuPath, "utf-8");
    expect(src).toContain("/admin");
    expect(src).toContain("Admin Console");
  });
});

/* ══════════════════════════════════════════════════════
   8. AVATAR UPLOAD
   ══════════════════════════════════════════════════════ */

describe("Avatar upload", () => {
  const uploadComponentPath = path.resolve(
    __dirname,
    "../../components/profile/avatar-upload.tsx",
  );
  const uploadRoutePath = path.resolve(
    __dirname,
    "../../app/api/v1/account/avatar/route.ts",
  );

  it("avatar upload component exists", () => {
    expect(fs.existsSync(uploadComponentPath)).toBe(true);
  });

  it("avatar upload API route exists", () => {
    expect(fs.existsSync(uploadRoutePath)).toBe(true);
  });

  it("upload component is a client component", () => {
    const src = fs.readFileSync(uploadComponentPath, "utf-8");
    expect(src).toContain('"use client"');
  });

  it("upload component accepts file input", () => {
    const src = fs.readFileSync(uploadComponentPath, "utf-8");
    expect(src).toContain('type="file"');
    expect(src).toContain("image/jpeg");
    expect(src).toContain("image/png");
  });

  it("upload route exports POST and DELETE", () => {
    const src = fs.readFileSync(uploadRoutePath, "utf-8");
    expect(src).toContain("export const POST");
    expect(src).toContain("export const DELETE");
  });

  it("upload route uses validateUpload", () => {
    const src = fs.readFileSync(uploadRoutePath, "utf-8");
    expect(src).toContain("validateUpload");
  });

  it("upload route uses file storage", () => {
    const src = fs.readFileSync(uploadRoutePath, "utf-8");
    expect(src).toContain("resolveFileStorage");
    expect(src).toContain("storage.upload");
  });

  it("proxy allows larger body for avatar route", () => {
    const proxyPath = path.resolve(__dirname, "../../proxy.ts");
    const src = fs.readFileSync(proxyPath, "utf-8");
    // The regex in the source escapes slashes: \/account\/avatar
    expect(src).toMatch(/account.*avatar/);
  });
});

/* ══════════════════════════════════════════════════════
   9. IA FIXES (no duplicate nav)
   ══════════════════════════════════════════════════════ */

describe("IA / navigation fixes", () => {
  it("public layout uses UserMenu instead of hardcoded links", () => {
    const layoutPath = path.resolve(
      __dirname,
      "../../app/(public)/layout.tsx",
    );
    const src = fs.readFileSync(layoutPath, "utf-8");
    expect(src).toContain("UserMenu");
    // Should NOT have hardcoded Dashboard/Logout text links in the header
    expect(src).not.toMatch(/href="\/dashboard".*className.*type-label/);
    expect(src).not.toMatch(/href="\/logout".*className.*type-label/);
  });

  it("user sidebar does not render logout", () => {
    const sidebarPath = path.resolve(
      __dirname,
      "../../components/navigation/user-sidebar.tsx",
    );
    const src = fs.readFileSync(sidebarPath, "utf-8");
    // Should filter out logout but NOT render it in the sidebar
    expect(src).toContain('i.id !== "logout"');
    // Should NOT pass logoutItem to child components
    expect(src).not.toContain("logoutItem");
  });

  it("profile page uses avatar upload instead of URL input", () => {
    const profilePath = path.resolve(
      __dirname,
      "../../app/(public)/account/page.tsx",
    );
    const src = fs.readFileSync(profilePath, "utf-8");
    expect(src).toContain("AvatarUpload");
    expect(src).not.toContain("Profile Picture URL");
  });
});

/* ══════════════════════════════════════════════════════
   10. OPENAI INTEGRATION (structural)
   ══════════════════════════════════════════════════════ */

describe("OpenAI integration", () => {
  it("llm-triage imports OpenAI", () => {
    const triagePath = path.resolve(__dirname, "../llm-triage.ts");
    const src = fs.readFileSync(triagePath, "utf-8");
    expect(src).toContain('from "openai"');
  });

  it("llm-triage checks API__OPENAI_API_KEY env", () => {
    const triagePath = path.resolve(__dirname, "../llm-triage.ts");
    const src = fs.readFileSync(triagePath, "utf-8");
    expect(src).toContain("API__OPENAI_API_KEY");
  });

  it("llm-triage uses gpt-4o-mini model", () => {
    const triagePath = path.resolve(__dirname, "../llm-triage.ts");
    const src = fs.readFileSync(triagePath, "utf-8");
    expect(src).toContain("gpt-4o-mini");
  });

  it("llm-triage uses json_object response format", () => {
    const triagePath = path.resolve(__dirname, "../llm-triage.ts");
    const src = fs.readFileSync(triagePath, "utf-8");
    expect(src).toContain("json_object");
  });

  it("llm-triage falls back to rules on JSON parse failure", () => {
    const triagePath = path.resolve(__dirname, "../llm-triage.ts");
    const src = fs.readFileSync(triagePath, "utf-8");
    expect(src).toContain("triageWithRules");
    expect(src).toMatch(/catch.*triageWithRules/s);
  });
});
