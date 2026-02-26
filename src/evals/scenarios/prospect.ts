/**
 * Prospect-Agent eval scenarios (3 total)
 *
 * PA-01: subscribe_to_newsletter      — captures new email subscription
 * PA-02: duplicate subscribe          — gracefully handles existing subscriber
 * PA-03: convert_subscriber_to_lead   — converts subscriber to intake request
 *
 * These tools live in agent-tools.ts (public chat), so scenarios use
 * type: "intake-agent" which runs against AGENT_TOOL_DEFINITIONS.
 */

import type Database from "better-sqlite3";
import type { EvalScenario } from "../types";

// ---------------------------------------------------------------------------
// PA-01: subscribe_to_newsletter — new email
// ---------------------------------------------------------------------------

export const paSubscribeCapturesEmail: EvalScenario = {
  id: "prospect-PA-01-subscribe",
  name: "Prospect-Agent PA-01: subscribe captures email",
  type: "intake-agent",
  description: "Agent captures email via subscribe_to_newsletter.",
  turns: [
    {
      userMessage:
        "I'd like to stay informed about the program. My email is testlead-pa01@example.com",
      expectedBehavior:
        "Agent should call subscribe_to_newsletter and confirm the subscription.",
      responseChecks: [
        {
          type: "tool_called",
          name: "subscribe_to_newsletter",
          description: "Agent must call subscribe_to_newsletter",
        },
        {
          type: "regex",
          pattern: "subscrib|newsletter|added|signed|kept|informd",
          flags: "i",
          description: "Response should confirm the subscription",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "newsletter_subscriber row should be created",
      query:
        "SELECT COUNT(*) AS result FROM newsletter_subscribers WHERE email = 'testlead-pa01@example.com'",
      expected: { result: 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// PA-02: duplicate subscribe — graceful idempotency
// ---------------------------------------------------------------------------

export const paDuplicateSubscribeGraceful: EvalScenario = {
  id: "prospect-PA-02-duplicate-subscribe",
  name: "Prospect-Agent PA-02: duplicate subscribe is graceful",
  type: "intake-agent",
  description:
    "Agent subscribes an already-subscribed email without error, still confirms to user.",
  preSetup: (db: Database.Database, userId: string, adminId: string) => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT OR IGNORE INTO newsletter_subscribers
         (id, email, status, unsubscribe_seed, unsubscribed_at, created_at, updated_at)
       VALUES ('sub-seed-pa02', 'existing-pa02@example.com', 'ACTIVE', 'seed-pa02', NULL, ?, ?)`,
    ).run(now, now);
    void userId; void adminId;
  },
  turns: [
    {
      userMessage:
        "Can you subscribe me to the newsletter? My email is existing-pa02@example.com",
      expectedBehavior:
        "Agent should call subscribe_to_newsletter and confirm without showing an error.",
      responseChecks: [
        {
          type: "tool_called",
          name: "subscribe_to_newsletter",
          description: "Agent must call subscribe_to_newsletter",
        },
        {
          type: "not_contains",
          value: "error",
          description: "Response should not contain the word 'error'",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "subscriber count should remain exactly 1 (no duplicate row)",
      query:
        "SELECT COUNT(*) AS result FROM newsletter_subscribers WHERE email = 'existing-pa02@example.com'",
      expected: { result: 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// PA-03: convert_subscriber_to_lead
// ---------------------------------------------------------------------------

export const paConvertSubscriberToLead: EvalScenario = {
  id: "prospect-PA-03-convert-to-lead",
  name: "Prospect-Agent PA-03: convert subscriber to lead",
  type: "intake-agent",
  description:
    "Agent converts an existing newsletter subscriber into an intake request.",
  preSetup: (db: Database.Database, userId: string, adminId: string) => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT OR IGNORE INTO newsletter_subscribers
         (id, email, status, unsubscribe_seed, unsubscribed_at, created_at, updated_at)
       VALUES ('sub-seed-pa03', 'newlead-pa03@example.com', 'ACTIVE', 'seed-pa03', NULL, ?, ?)`,
    ).run(now, now);
    void userId; void adminId;
  },
  turns: [
    {
      userMessage:
        "I subscribed earlier as newlead-pa03@example.com — my name is Alex Rivera. I'm interested in the apprenticeship. Can you start my application?",
      expectedBehavior:
        "Agent should call convert_subscriber_to_lead (after possibly calling subscribe_to_newsletter first) and confirm the intake was created.",
      responseChecks: [
        {
          type: "tool_called",
          name: "convert_subscriber_to_lead",
          description: "Agent must call convert_subscriber_to_lead",
        },
        {
          type: "regex",
          pattern: "application|intake|started|submitted|created|registered",
          flags: "i",
          description: "Response should confirm the intake was created",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "intake_requests row should be created for the lead email",
      query:
        "SELECT COUNT(*) AS result FROM intake_requests WHERE contact_email = 'newlead-pa03@example.com' AND status = 'NEW'",
      expected: { result: 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const prospectScenarios: EvalScenario[] = [
  paSubscribeCapturesEmail,
  paDuplicateSubscribeGraceful,
  paConvertSubscriberToLead,
];
