/**
 * Intake agent eval scenarios
 *
 * 5 scenarios testing the conversational intake agent via real Anthropic API calls.
 * Each scenario drives a multi-turn conversation and checks:
 *   - Response quality (what Claude says)
 *   - Tool usage (which tools were called)
 *   - DB state (what got written to the database)
 */

import { randomUUID } from "node:crypto";
import type { EvalScenario } from "../types";

export const intakeAgentScenarios: EvalScenario[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // S1: Prospect asks about pricing — should call content_search
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "intake-agent-pricing-lookup",
    name: "Prospect asks about pricing",
    type: "intake-agent",
    description:
      "When a prospect asks about pricing, the agent must call content_search " +
      "before supplying an answer, and the response should reference cost or training.",
    turns: [
      {
        userMessage: "Hi, how much does your Maestro Training program cost?",
        expectedBehavior:
          "Agent calls content_search and returns a response mentioning pricing / cost / dollars.",
        responseChecks: [
          { type: "tool_called", name: "content_search", description: "must look up pricing in knowledge base" },
          {
            type: "regex",
            pattern: "\\$|cost|price|trainin|maestro",
            description: "response references pricing or the training program",
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // S2: Full qualification flow → intake submitted → row in DB
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "intake-agent-full-qualification",
    name: "Full 4-turn qualification → submit_intake",
    type: "intake-agent",
    description:
      "The prospect provides all four qualification signals across 3–4 turns. " +
      "The agent should call submit_intake and an intake_requests row should " +
      "appear in the database.",
    turns: [
      {
        userMessage:
          "I run a 12-person software consultancy. We want to start delivering AI-assisted products to our clients and need to build internal capability.",
        expectedBehavior:
          "Agent acknowledges the context and asks a follow-up qualification question.",
        responseChecks: [
          { type: "not_contains", value: "submit_intake", description: "not submitting yet — missing timeline and fit signal" },
        ],
      },
      {
        userMessage:
          "We're aiming to have our first team trained within the next 2 months. Budget is flexible — we care more about outcomes.",
        expectedBehavior:
          "Agent probes for fit signal (role in the guild hierarchy, previous experience, etc.).",
        responseChecks: [
          { type: "tool_not_called", name: "submit_intake", description: "still gathering signals" },
        ],
      },
      {
        userMessage:
          "I'm Jamie Chen, CTO at SoftCorp. My email is jamie.chen@softcorp.io. We have 3 senior engineers who will be going through the program." +
          " Timeline is within 2 months. We've done some internal POCs with LLMs but nothing production-ready. This is exactly what we need.",
        expectedBehavior:
          "Agent has all four signals (name, email, goal, timeline) and calls submit_intake with the contact details.",
        responseChecks: [
          { type: "tool_called", name: "submit_intake", description: "all four signals present — must submit intake now" },
        ],
      },
    ],
    dbAssertions: [
      {
        description: "intake_requests row was created",
        query: "SELECT COUNT(*) AS result FROM intake_requests",
        expected: 1,
      },
      {
        description: "intake status is NEW (awaiting triage)",
        query: "SELECT status AS result FROM intake_requests LIMIT 1",
        expected: "NEW",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // S3: Prospect asks for contact information — should call get_site_setting
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "intake-agent-contact-info",
    name: "Prospect asks for phone/contact details",
    type: "intake-agent",
    description:
      "When a prospect asks for a phone number or contact email, the agent " +
      "must call get_site_setting to look it up rather than fabricating it.",
    turns: [
      {
        userMessage:
          "Can I get a phone number to call someone? I prefer to talk before filling out forms.",
        expectedBehavior:
          "Agent calls get_site_setting with a contact key and provides the number.",
        responseChecks: [
          { type: "tool_called", name: "get_site_setting", description: "must look up contact info" },
          {
            type: "not_contains",
            value: "555",
            description: "must not fabricate a fake number",
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // S4: Off-topic message — agent should redirect to qualification
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "intake-agent-offtopic-redirect",
    name: "Off-topic input — agent stays on qualification",
    type: "intake-agent",
    description:
      "When a prospect says something unrelated to the studio, the agent " +
      "should acknowledge briefly and redirect back to the qualification conversation.",
    turns: [
      {
        userMessage: "What's the weather like in New York today?",
        expectedBehavior:
          "Agent does not attempt to answer the weather question and redirects to qualification.",
        responseChecks: [
          { type: "tool_not_called", name: "content_search", description: "no need to search for weather" },
          { type: "tool_not_called", name: "submit_intake", description: "no intake — no qualification signals" },
          {
            type: "not_contains",
            value: "°",
            description: "agent does not return a weather forecast",
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // S5: Guild hierarchy question — should call content_search
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "intake-agent-guild-info",
    name: "Prospect asks about the guild hierarchy",
    type: "intake-agent",
    description:
      "Agent should consult the knowledge base when asked about guild ranks " +
      "rather than relying solely on the system prompt.",
    turns: [
      {
        userMessage:
          "I heard you have a guild system. Can you explain the different levels and what it takes to move up?",
        expectedBehavior:
          "Agent calls content_search and explains the Affiliate → Apprentice → Journeyman → Maestro hierarchy.",
        responseChecks: [
          { type: "tool_called", name: "content_search", description: "must look up guild hierarchy details" },
          {
            type: "regex",
            pattern: "affiliate|apprentice|journeyman|maestro",
            description: "response mentions guild ranks",
          },
        ],
      },
    ],
  },
];
