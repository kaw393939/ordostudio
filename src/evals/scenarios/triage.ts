/**
 * Triage eval scenarios
 *
 * 4 scenarios testing the LLM triage classifier using real Anthropic API calls.
 * Each scenario passes a text input and asserts on the output fields.
 */

import type { EvalScenario } from "../types";

export const triageScenarios: EvalScenario[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // T1: Clear billing issue → billing_support, high confidence
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "triage-billing",
    name: "Billing dispute → billing_support",
    type: "triage",
    description:
      "A message clearly about a billing dispute should be classified as " +
      "billing_support with high confidence.",
    input:
      "I was charged twice this month for my subscription. The double charge " +
      "showed up on my credit card statement on the 15th. I need a refund immediately.",
    triageChecks: [
      {
        field: "category",
        expected: "billing_support",
        description: "billing dispute → billing_support",
      },
      {
        field: "confidence_gte",
        expected: 0.7,
        description: "high confidence for unambiguous billing request",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T2: System outage → urgent_escalation
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "triage-urgent",
    name: "System outage → urgent_escalation",
    type: "triage",
    description:
      "A message indicating a production outage should be classified as " +
      "urgent_escalation with high confidence.",
    input:
      "CRITICAL: Our entire platform is down right now. No one can log in. " +
      "We have clients waiting. This is an emergency — need immediate response.",
    triageChecks: [
      {
        field: "category",
        expected: "urgent_escalation",
        description: "system outage → urgent_escalation",
      },
      {
        field: "confidence_gte",
        expected: 0.8,
        description: "very high confidence for clear emergency",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T3: Obvious spam → spam, any confidence
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "triage-spam",
    name: "Spam message → spam category",
    type: "triage",
    description:
      "An obviously spammy message should be categorised as spam.",
    input:
      "Congratulations!! You have been selected as a WINNER of our exclusive sweepstakes. " +
      "Click here to claim your FREE prize worth $10,000. Limited time offer!!!",
    triageChecks: [
      {
        field: "category",
        expected: "spam",
        description: "spam text → spam category",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T4: Ambiguous message → general_inquiry, lower confidence
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "triage-general-inquiry",
    name: "Vague/ambiguous message → general_inquiry + low confidence",
    type: "triage",
    description:
      "A vague message that doesn't fit a clear category should fall back to " +
      "general_inquiry with lower confidence.",
    input:
      "Hi, I just wanted to say hello and ask if I could maybe get some information at some point.",
    triageChecks: [
      {
        field: "category",
        expected: "general_inquiry",
        description: "ambiguous message → general_inquiry",
      },
      {
        field: "confidence_lte",
        expected: 0.75,
        description: "lower confidence for ambiguous input",
      },
    ],
  },
];
