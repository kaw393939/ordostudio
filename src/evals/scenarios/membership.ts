/**
 * Persona-01 Membership & Apprenticeship eval scenarios (4 total)
 *
 * P1-01: apply_for_apprenticeship — new application created in DB
 * P1-02: view_rank_requirements   — static requirements returned
 * P1-03: review_apprentice_application — admin reviews pending application
 * P1-04: get_apprentice_profile   — profile returned for a user
 */

import type Database from "better-sqlite3";
import type { EvalScenario } from "../types";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

const APPRENTICE_ROLE_ID = "role-apprentice-seed";
const SUBSCRIBER_ROLE_ID = "role-subscriber-seed";

function seedRoles(db: Database.Database): void {
  db.prepare(
    "INSERT OR IGNORE INTO roles (id, name) VALUES (?, ?)",
  ).run(APPRENTICE_ROLE_ID, "APPRENTICE");
  db.prepare(
    "INSERT OR IGNORE INTO roles (id, name) VALUES (?, ?)",
  ).run(SUBSCRIBER_ROLE_ID, "SUBSCRIBER");
}

function seedUser(
  db: Database.Database,
  id: string,
  email: string,
): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, status, created_at, updated_at)
     VALUES (?, ?, 'ACTIVE', ?, ?)`,
  ).run(id, email, now, now);
}

// ---------------------------------------------------------------------------
// P1-01: apply_for_apprenticeship — application submitted
// ---------------------------------------------------------------------------

export const p1ApplyForApprenticeship: EvalScenario = {
  id: "persona-membership-P1-01-apply",
  name: "Persona-01 P1-01: apply for apprenticeship",
  type: "maestro",
  description:
    "Agent submits an apprenticeship application for a user via apply_for_apprenticeship.",
  preSetup: (db, adminId) => {
    seedRoles(db);
    seedUser(db, "u-assoc-1", "associate@test.com");
    void adminId;
  },
  turns: [
    {
      userMessage: "Apply for the apprenticeship program for user u-assoc-1.",
      expectedBehavior:
        "Agent calls apply_for_apprenticeship with userId='u-assoc-1' and confirms submission.",
      responseChecks: [
        {
          type: "tool_called",
          name: "apply_for_apprenticeship",
          description: "Agent must call apply_for_apprenticeship",
        },
        {
          type: "regex",
          pattern: "submitted|pending|application|applied",
          flags: "i",
          description: "Response should confirm the application was submitted",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "A PENDING role_request should exist for u-assoc-1",
      query:
        "SELECT COUNT(*) AS result FROM role_requests WHERE user_id = 'u-assoc-1' AND status = 'PENDING'",
      expected: { result: 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// P1-02: view_rank_requirements — returns static requirements
// ---------------------------------------------------------------------------

export const p1ViewRankRequirements: EvalScenario = {
  id: "persona-membership-P1-02-view-rank",
  name: "Persona-01 P1-02: view rank requirements",
  type: "maestro",
  description:
    "Agent returns rank advancement requirements for SUBSCRIBER without hallucinating steps.",
  turns: [
    {
      userMessage:
        "What does a SUBSCRIBER need to do to advance in the program?",
      expectedBehavior:
        "Agent calls view_rank_requirements and lists real requirements without inventing steps.",
      responseChecks: [
        {
          type: "tool_called",
          name: "view_rank_requirements",
          description: "Agent must call view_rank_requirements",
        },
        {
          type: "regex",
          pattern: "intake|webinar|event|onboarding|request",
          flags: "i",
          description: "Response should mention a real advancement step",
        },
        {
          type: "not_contains",
          value: "pay $",
          description: "Must not invent payment requirements",
        },
        {
          type: "not_contains",
          value: "certification exam",
          description: "Must not invent exam requirements",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// P1-03: review_apprentice_application — admin reviews pending application
// ---------------------------------------------------------------------------

export const p1ReviewApplication: EvalScenario = {
  id: "persona-membership-P1-03-admin-review",
  name: "Persona-01 P1-03: admin reviews pending application",
  type: "maestro",
  description:
    "Admin asks to review application rr-1; agent returns applicant email and status.",
  preSetup: (db, adminId) => {
    seedRoles(db);
    seedUser(db, "u-sub-1", "subscriber@test.com");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT OR IGNORE INTO role_requests
         (id, user_id, requested_role_id, status, context, created_at, updated_at)
       VALUES ('rr-1', 'u-sub-1', ?, 'PENDING', '{}', ?, ?)`,
    ).run(APPRENTICE_ROLE_ID, now, now);
    void adminId;
  },
  turns: [
    {
      userMessage: "Show me the details of role request rr-1.",
      expectedBehavior:
        "Agent calls review_apprentice_application and returns subscriber@test.com.",
      responseChecks: [
        {
          type: "tool_called",
          name: "review_apprentice_application",
          description: "Agent must call review_apprentice_application",
        },
        {
          type: "contains",
          value: "subscriber@test.com",
          description: "Response should include the applicant's email",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// P1-04: get_apprentice_profile — returns user profile data
// ---------------------------------------------------------------------------

export const p1GetApprenticeProfile: EvalScenario = {
  id: "persona-membership-P1-04-profile",
  name: "Persona-01 P1-04: get apprentice profile",
  type: "maestro",
  description:
    "Agent retrieves the apprentice profile for user u-appr-1 including roles and submission count.",
  preSetup: (db, adminId) => {
    seedUser(db, "u-appr-1", "apprentice@test.com");
    void adminId;
  },
  turns: [
    {
      userMessage: "Show me the apprentice profile for user u-appr-1.",
      expectedBehavior:
        "Agent calls get_apprentice_profile and returns profile data for u-appr-1.",
      responseChecks: [
        {
          type: "tool_called",
          name: "get_apprentice_profile",
          description: "Agent must call get_apprentice_profile",
        },
        {
          type: "regex",
          pattern: "u-appr-1|apprentice@test.com|profile|joined",
          flags: "i",
          description: "Response should contain profile information",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const membershipScenarios: EvalScenario[] = [
  p1ApplyForApprenticeship,
  p1ViewRankRequirements,
  p1ReviewApplication,
  p1GetApprenticeProfile,
];
