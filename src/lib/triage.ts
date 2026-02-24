/**
 * Triage Domain Model
 *
 * Types and business logic for AI-assisted request triage.
 * The triage system categorises incoming intake requests using
 * an LLM, stores confidence scores, and supports admin overrides
 * that feed back into future prompt tuning.
 */

/* ── categories ─────────────────────────────────────── */

export const TRIAGE_CATEGORIES = [
  "billing_support",
  "technical_issue",
  "general_inquiry",
  "feature_request",
  "partnership",
  "urgent_escalation",
  "spam",
] as const;

export type TriageCategory = (typeof TRIAGE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<TriageCategory, string> = {
  billing_support: "Billing Support",
  technical_issue: "Technical Issue",
  general_inquiry: "General Inquiry",
  feature_request: "Feature Request",
  partnership: "Partnership",
  urgent_escalation: "Urgent Escalation",
  spam: "Spam",
};

/* ── priority & status ──────────────────────────────── */

export const TRIAGE_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TriagePriority = (typeof TRIAGE_PRIORITIES)[number];

export const TRIAGE_STATUSES = [
  "pending",
  "triaged",
  "auto_responded",
  "escalated",
  "resolved",
  "closed",
] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];

/* ── ticket record ──────────────────────────────────── */

export interface TriageTicket {
  id: string;
  intake_request_id: string;
  /** AI-assigned category */
  category: TriageCategory;
  /** 0–1 confidence from the LLM */
  confidence: number;
  /** AI-generated one-line summary */
  summary: string;
  /** AI-suggested recommended action */
  recommended_action: string;
  priority: TriagePriority;
  status: TriageStatus;
  /** Admin-corrected category (null = AI was right) */
  admin_override_category: TriageCategory | null;
  /** Free-text rationale when an admin overrides */
  admin_override_reason: string | null;
  /** Who performed the override */
  overridden_by: string | null;
  overridden_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ── LLM triage result (returned by the facade) ────── */

export interface LlmTriageResult {
  category: TriageCategory;
  confidence: number;
  summary: string;
  recommended_action: string;
  priority: TriagePriority;
}

/* ── business rules ─────────────────────────────────── */

/** Minimum confidence to act on without manual review */
const CONFIDENCE_THRESHOLD = 0.7;

/** Categories that are never auto-responded to */
const NO_AUTO_RESPONSE_CATEGORIES: ReadonlySet<TriageCategory> = new Set([
  "urgent_escalation",
  "spam",
]);

/**
 * Whether the confidence score is high enough for automated action.
 */
export function isHighConfidence(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLD;
}

/**
 * Derive the effective category — prefers admin override when present.
 */
export function effectiveCategory(ticket: TriageTicket): TriageCategory {
  return ticket.admin_override_category ?? ticket.category;
}

/**
 * Whether this ticket should receive an automated email response.
 *
 * Rules:
 * - Must be high-confidence OR admin-overridden
 * - Must not be an urgent escalation or spam
 * - Must not already have been auto-responded or escalated
 */
export function shouldAutoRespond(ticket: TriageTicket): boolean {
  const cat = effectiveCategory(ticket);

  if (NO_AUTO_RESPONSE_CATEGORIES.has(cat)) return false;
  if (ticket.status !== "triaged") return false;

  const trusted =
    isHighConfidence(ticket.confidence) ||
    ticket.admin_override_category !== null;

  return trusted;
}

/**
 * Whether this ticket needs immediate human escalation.
 */
export function shouldEscalate(ticket: TriageTicket): boolean {
  const cat = effectiveCategory(ticket);
  if (cat === "urgent_escalation") return true;
  if (!isHighConfidence(ticket.confidence) && ticket.admin_override_category === null) return true;
  return false;
}

/**
 * Derive a sensible priority from category + confidence.
 */
export function derivePriority(
  category: TriageCategory,
  confidence: number,
): TriagePriority {
  if (category === "urgent_escalation") return "urgent";
  if (!isHighConfidence(confidence)) return "high"; // low confidence → needs attention
  if (category === "billing_support" || category === "technical_issue") return "medium";
  return "low";
}

/**
 * Whether an admin has supplied a corrective override.
 */
export function hasAdminOverride(ticket: TriageTicket): boolean {
  return ticket.admin_override_category !== null;
}

/**
 * Validate that a string is a known triage category.
 */
export function isValidCategory(value: string): value is TriageCategory {
  return (TRIAGE_CATEGORIES as readonly string[]).includes(value);
}
