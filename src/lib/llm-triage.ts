/**
 * LLM Triage Facade
 *
 * Abstraction over AI-powered request categorisation.
 * When `API__OPENAI_API_KEY` is set, uses OpenAI GPT for real
 * structured classification. Falls back to a deterministic
 * rule-based stub otherwise.
 */

import OpenAI from "openai";
import {
  type TriageCategory,
  type LlmTriageResult,
  TRIAGE_CATEGORIES,
  derivePriority,
  isValidCategory,
} from "./triage";
import { triageWithAnthropic } from "./llm-anthropic";

/* ── keyword rules (stub implementation) ────────────── */

const KEYWORD_RULES: ReadonlyArray<{
  pattern: RegExp;
  category: TriageCategory;
  action: string;
}> = [
  {
    pattern: /\b(bill|invoice|payment|charge|refund|subscription|pricing)\b/i,
    category: "billing_support",
    action: "Route to billing team; check account payment status.",
  },
  {
    pattern: /\b(bug|error|crash|broken|not working|500|404|outage)\b/i,
    category: "technical_issue",
    action: "Assign to engineering support; request reproduction steps.",
  },
  {
    pattern: /\b(urgent|emergency|critical|asap|immediately|down)\b/i,
    category: "urgent_escalation",
    action: "Page on-call engineer; do NOT auto-respond.",
  },
  {
    pattern: /\b(feature|request|wish|could you add|would be nice|suggestion)\b/i,
    category: "feature_request",
    action: "Log in feature backlog; send acknowledgement.",
  },
  {
    pattern: /\b(partner|collab|sponsor|affiliate|integration)\b/i,
    category: "partnership",
    action: "Forward to partnerships team.",
  },
  {
    pattern: /\b(free money|click here|winner|congratulations|nigerian)\b/i,
    category: "spam",
    action: "Mark as spam; no response required.",
  },
];

/**
 * Deterministic stub triage — scans text for keywords.
 *
 * Returns the first matching rule with a synthetic confidence,
 * or falls back to `general_inquiry` at low confidence so the
 * ticket is flagged for manual review.
 */
export function triageWithRules(text: string): LlmTriageResult {
  const normalised = text.toLowerCase();

  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(normalised)) {
      const confidence = 0.85;
      return {
        category: rule.category,
        confidence,
        summary: summariseText(text),
        recommended_action: rule.action,
        priority: derivePriority(rule.category, confidence),
      };
    }
  }

  // No keyword match → low-confidence general inquiry
  const confidence = 0.4;
  return {
    category: "general_inquiry",
    confidence,
    summary: summariseText(text),
    recommended_action:
      "Request more information from the submitter; flag for manual review.",
    priority: derivePriority("general_inquiry", confidence),
  };
}

/* ── helpers ─────────────────────────────────────────── */

/**
 * Create a one-line summary (first 120 chars of cleaned text).
 */
function summariseText(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 120) return cleaned;
  return cleaned.slice(0, 117) + "...";
}

/* ── public API ──────────────────────────────────────── */

export interface TriageInput {
  /** The raw text to classify (e.g. goals + constraints from intake) */
  text: string;
  /** Optional contact email for logging */
  contactEmail?: string;
  /** Optional intake request ID for linking */
  intakeRequestId?: string;
}

/**
 * Run triage on arbitrary text.
 *
 * Priority order:
 *  1. Anthropic Claude (when ANTHROPIC_API_KEY is set)
 *  2. OpenAI GPT (when API__OPENAI_API_KEY is set)
 *  3. Deterministic keyword rules (fallback, no API key required)
 */
export async function triageRequest(input: TriageInput): Promise<LlmTriageResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? process.env.API__ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      return await triageWithAnthropic(input.text, anthropicKey);
    } catch {
      // Fall through to OpenAI or rules
    }
  }

  const openaiKey = process.env.API__OPENAI_API_KEY;
  if (openaiKey) {
    return triageWithOpenAI(input.text, openaiKey);
  }
  return triageWithRules(input.text);
}

/* ── OpenAI implementation ──────────────────────────── */

const SYSTEM_PROMPT = `You are a customer service triage agent. Classify the incoming request into exactly one category.

Available categories: ${TRIAGE_CATEGORIES.join(", ")}

Respond ONLY with valid JSON matching this schema:
{
  "category": "<one of the categories above>",
  "confidence": <number 0-1>,
  "summary": "<one-line summary, max 120 chars>",
  "recommended_action": "<brief recommended next step>"
}

Rules:
- "urgent_escalation" is for outages, emergencies, or any request demanding immediate attention.
- "spam" is for obviously irrelevant or fraudulent messages.
- If the request is unclear or doesn't fit well, use "general_inquiry" with a lower confidence.
- Be conservative with confidence: only use >0.8 when the match is unambiguous.`;

async function triageWithOpenAI(text: string, apiKey: string): Promise<LlmTriageResult> {
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 256,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(raw) as {
      category?: string;
      confidence?: number;
      summary?: string;
      recommended_action?: string;
    };

    const category: TriageCategory = isValidCategory(parsed.category ?? "")
      ? (parsed.category as TriageCategory)
      : "general_inquiry";

    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

    return {
      category,
      confidence,
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 120) : summariseText(text),
      recommended_action: typeof parsed.recommended_action === "string"
        ? parsed.recommended_action
        : "Review manually.",
      priority: derivePriority(category, confidence),
    };
  } catch {
    // If JSON parsing fails, fall back to rules
    return triageWithRules(text);
  }
}

/**
 * Build a combined text block from intake fields for triage input.
 */
export function buildTriageText(intake: {
  goals: string;
  constraints?: string | null;
  timeline?: string | null;
  contact_name?: string;
  audience?: string;
}): string {
  const parts: string[] = [];
  if (intake.audience) parts.push(`Audience: ${intake.audience}`);
  if (intake.contact_name) parts.push(`Contact: ${intake.contact_name}`);
  parts.push(`Goals: ${intake.goals}`);
  if (intake.timeline) parts.push(`Timeline: ${intake.timeline}`);
  if (intake.constraints) parts.push(`Constraints: ${intake.constraints}`);
  return parts.join("\n");
}
