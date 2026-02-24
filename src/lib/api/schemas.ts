/**
 * Zod schemas for all mutation API route request bodies.
 * Organized by domain area. Used with parsePayload() from validate.ts.
 */
import { z } from "zod";

/* ── Shared refinements ───────────────────────────── */

export const emailField = z.string().trim().toLowerCase().email();
export const nonEmptyString = z.string().trim().min(1);
export const optionalString = z.string().optional();
export const optionalNullableString = z.string().nullable().optional();
export const slug = z.string().trim().min(1).max(200).regex(/^[a-z0-9][a-z0-9-]*$/, "Must be lowercase alphanumeric with hyphens");
export const isoDatetime = z.string().trim().min(1);
export const positiveInt = z.number().int().positive();

/* ── AUTH ──────────────────────────────────────────── */

export const loginSchema = z.object({
  email: emailField,
  password: nonEmptyString,
}).strict();

export const registerSchema = z.object({
  email: emailField,
  password: nonEmptyString,
  terms_accepted: z.boolean().optional(),
}).strict();

export const passwordResetRequestSchema = z.object({
  email: emailField,
}).strict();

export const passwordResetConfirmSchema = z.object({
  token: nonEmptyString,
  password: nonEmptyString,
}).strict();

export const verifyRequestSchema = z.object({
  email: emailField,
}).strict();

export const verifyConfirmSchema = z.object({
  token: nonEmptyString,
}).strict();

/* ── EVENTS ───────────────────────────────────────── */

export const createEventSchema = z.object({
  slug: nonEmptyString,
  title: nonEmptyString,
  start: isoDatetime,
  end: isoDatetime,
  timezone: nonEmptyString,
  capacity: z.number().int().min(0).nullable().optional(),
  engagement_type: z.enum(["INDIVIDUAL", "GROUP"]).optional(),
  delivery_mode: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).optional(),
  location_text: optionalNullableString,
  meeting_url: optionalNullableString,
  description: optionalNullableString,
  metadata_json: optionalNullableString,
}).strict();

export const updateEventSchema = z.object({
  title: optionalString,
  start: optionalString,
  end: optionalString,
  capacity: z.number().int().min(0).nullable().optional(),
  engagement_type: z.enum(["INDIVIDUAL", "GROUP"]).optional(),
  delivery_mode: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).optional(),
  location_text: optionalNullableString,
  meeting_url: optionalNullableString,
  description: optionalNullableString,
  metadata_json: optionalNullableString,
}).strict();

export const cancelEventSchema = z.object({
  reason: nonEmptyString,
}).strict();

export const registrationSchema = z.object({
  user_id: optionalString,
  user_email: optionalString,
  display_name: optionalString,
  organization: optionalString,
}).strict();

export const substitutionSchema = z.object({
  from_user_id: nonEmptyString,
  to_user_id: nonEmptyString,
}).strict();

export const checkinSchema = z.object({
  user_id: optionalString,
  user_email: optionalString,
}).strict();

export const instructorUpdateSchema = z.object({
  state: optionalString,
  instructor_id: optionalNullableString,
  note: optionalNullableString,
}).strict();

export const outcomeSchema = z.object({
  title: optionalString,
  session_at: optionalString,
  summary: optionalString,
  status: optionalString,
  outcomes: z.array(z.string()).optional(),
  action_items: z.array(z.object({
    description: z.string(),
    due_at: optionalString,
  })).optional(),
  next_step: optionalString,
}).strict();

export const artifactSchema = z.object({
  title: optionalString,
  resource_url: optionalString,
  scope: optionalString,
  user_id: optionalString,
}).strict();

/* ── ACCOUNT ──────────────────────────────────────── */

export const deleteAccountSchema = z.object({
  confirm_text: optionalString,
}).strict();

export const apprenticeProfileSchema = z.object({
  handle: optionalString,
  display_name: optionalString,
  headline: optionalNullableString,
  bio: optionalNullableString,
  location: optionalNullableString,
  website_url: optionalNullableString,
  tags: optionalNullableString,
}).strict();

/* ── GATE SUBMISSIONS ────────────────────────────── */

export const gateSubmissionSchema = z.object({
  gate_project_slug: nonEmptyString,
  submission_url: optionalNullableString,
  submission_notes: optionalNullableString,
}).strict();

export const reviewGateSubmissionSchema = z.object({
  status: z.enum(["PASSED", "REVISION_NEEDED"]),
  reviewer_notes: optionalNullableString,
}).strict();

/* ── VOCABULARY ──────────────────────────────────── */

export const addVocabularySchema = z.object({
  term_slug: nonEmptyString,
  term_name: nonEmptyString,
  context: optionalNullableString,
}).strict();

export const fieldReportSchema = z.object({
  event_slug: optionalString,
  key_insights: optionalString,
  models: optionalString,
  money: optionalString,
  people: optionalString,
  what_i_tried: optionalString,
  client_advice: optionalString,
  summary: optionalString,
}).strict();

export const accountDealUpdateSchema = z.object({
  status: optionalString,
  note: optionalNullableString,
}).strict();

export const feedbackSchema = z.object({
  rating: z.number().optional(),
  comment: optionalString,
}).strict();

export const actionUpdateSchema = z.object({
  status: optionalString,
  due_at: optionalNullableString,
  owner_user_id: optionalNullableString,
}).strict();

export const reminderUpdateSchema = z.object({
  snooze_days: z.number().int().min(1).optional(),
});

/* ── USERS ────────────────────────────────────────── */

export const updateUserStatusSchema = z.object({
  status: optionalString,
  confirm: z.boolean().optional(),
}).strict();

export const assignRoleSchema = z.object({
  role: nonEmptyString,
  confirm: z.boolean().optional(),
}).strict();

/* ── OFFERS ───────────────────────────────────────── */

export const createOfferSchema = z.object({
  slug: nonEmptyString,
  title: nonEmptyString,
  summary: nonEmptyString,
  price_cents: z.number().int().min(0),
  currency: nonEmptyString,
  duration_label: nonEmptyString,
  refund_policy_key: nonEmptyString,
  audience: z.enum(["INDIVIDUAL", "GROUP", "TEAM", "ENTERPRISE"]).optional(),
  delivery_mode: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).optional(),
  booking_url: z.string().default(""),
  outcomes: z.array(z.string()).optional(),
  status: optionalString,
}).strict();

export const updateOfferSchema = z.object({
  title: optionalString,
  summary: optionalString,
  price_cents: z.number().int().min(0).nullable().optional(),
  currency: optionalString,
  duration_label: optionalString,
  refund_policy_key: optionalString,
  audience: z.enum(["INDIVIDUAL", "GROUP", "TEAM", "ENTERPRISE"]).optional(),
  delivery_mode: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).optional(),
  booking_url: optionalString,
  outcomes: z.array(z.string()).optional(),
  status: optionalString,
  confirm_price_change: z.boolean().optional(),
}).strict();

export const createPackageSchema = z.object({
  name: nonEmptyString,
  scope: nonEmptyString,
  price_label: nonEmptyString,
  sort_order: z.number().int().optional(),
}).strict();

export const updatePackageSchema = z.object({
  name: optionalString,
  scope: optionalString,
  price_label: optionalString,
  sort_order: z.number().int().optional(),
}).strict();

/* ── INTAKE ───────────────────────────────────────── */

export const createIntakeSchema = z.object({
  offer_slug: optionalString,
  audience: z.enum(["INDIVIDUAL", "ORGANIZATION", "TEAM", "ENTERPRISE"]),
  organization_name: optionalString,
  contact_name: nonEmptyString,
  contact_email: emailField,
  goals: nonEmptyString,
  timeline: optionalString,
  constraints: optionalString,
}).strict().superRefine((data, ctx) => {
  if (data.audience === "ORGANIZATION" || data.audience === "TEAM" || data.audience === "ENTERPRISE") {
    if (!data.organization_name || data.organization_name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organization name is required for this audience.",
        path: ["organization_name"],
      });
    }
    if (!data.timeline || data.timeline.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Timeline is required for this audience.",
        path: ["timeline"],
      });
    }
  }
});

export const updateIntakeSchema = z.object({
  status: optionalString,
  owner_user_id: optionalNullableString,
  priority: z.number().int().optional(),
  note: optionalString,
}).strict();

/* ── INSTRUCTORS ──────────────────────────────────── */

export const createInstructorSchema = z.object({
  name: nonEmptyString,
  email: nonEmptyString,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  capabilities: z.array(z.string()).optional(),
}).strict();

export const instructorAvailabilitySchema = z.object({
  start: isoDatetime,
  end: isoDatetime,
  timezone: nonEmptyString,
  delivery_mode: nonEmptyString,
}).strict();

/* ── ADMIN — DEALS ────────────────────────────────── */

export const createDealSchema = z.object({
  intake_id: optionalString,
  requested_provider_user_id: optionalNullableString,
}).strict();

export const updateDealSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    provider_user_id: nonEmptyString,
    maestro_user_id: nonEmptyString,
    note: optionalString,
  }).strict(),
  z.object({
    action: z.literal("approve"),
    note: optionalString,
  }).strict(),
  z.object({
    action: z.literal("status"),
    status: nonEmptyString,
    note: optionalString,
  }).strict(),
]);

export const refundDealSchema = z.object({
  reason: optionalString,
  confirm: z.boolean().optional(),
}).strict();

/* ── ADMIN — NEWSLETTER ───────────────────────────── */

export const createNewsletterSchema = z.object({
  title: optionalString,
  issue_date: optionalString,
}).strict();

export const updateNewsletterSchema = z.object({
  title: optionalString,
  issue_date: optionalString,
  blocks: z.record(z.string(), z.string()).optional(),
}).strict();

export const generateNewsletterSchema = z.object({
  field_report_ids: z.array(z.string()).optional(),
  research_sources: z.array(z.object({
    url: z.string(),
    title: optionalNullableString,
  })).optional(),
}).strict();

export const publishNewsletterSchema = z.object({
  confirm: optionalString,
}).strict();

export const scheduleNewsletterSchema = z.object({
  scheduled_for: optionalString,
}).strict();

/* ── ADMIN — ENTITLEMENTS ─────────────────────────── */

export const entitlementActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("grant"),
    user_id: optionalString,
    entitlement_key: optionalString,
    reason: optionalString,
  }).strict(),
  z.object({
    action: z.literal("revoke"),
    user_id: optionalString,
    entitlement_key: optionalString,
    reason: optionalString,
  }).strict(),
]);

export const discordLinkSchema = z.object({
  user_id: optionalString,
  discord_user_id: optionalString,
}).strict();

export const discordSyncSchema = z.object({
  confirm: z.boolean().optional(),
}).strict();

/* ── ADMIN — INVITATIONS ──────────────────────────── */

export const createInvitationSchema = z.object({
  email: emailField,
}).strict();

export const acceptInvitationSchema = z.object({
  token: nonEmptyString,
  password: nonEmptyString,
}).strict();

/* ── ADMIN — APPRENTICES ──────────────────────────── */

export const updateApprenticeSchema = z.object({
  status: optionalString,
  reason: optionalNullableString,
}).strict();

/* ── ADMIN — FIELD REPORTS ────────────────────────── */

export const featureFieldReportSchema = z.object({
  featured: z.boolean().optional(),
}).strict();

/* ── ADMIN — EVENTS ───────────────────────────────── */

export const registrationCountsSchema = z.object({
  slugs: z.array(z.string()).optional(),
}).strict();

/* ── ADMIN — LEDGER ───────────────────────────────── */

export const ledgerApproveSchema = z.object({
  entry_ids: z.array(z.string()).optional(),
  confirm: z.boolean().optional(),
}).strict();

export const ledgerPayoutsSchema = z.object({
  entry_ids: z.array(z.string()).optional(),
  confirm: z.boolean().optional(),
}).strict();

/* ── COMMERCIAL ───────────────────────────────────── */

export const createProposalSchema = z.object({
  intake_request_id: optionalString,
  event_slug: optionalString,
  offer_slug: optionalString,
  client_email: emailField,
  title: nonEmptyString,
  amount_cents: z.number().int().min(0),
  currency: nonEmptyString,
  expires_at: optionalString,
}).strict();

export const updateProposalSchema = z.object({
  status: nonEmptyString,
  note: optionalString,
}).strict();

export const createInvoiceSchema = z.object({
  proposal_id: optionalString,
  event_slug: optionalString,
  intake_request_id: optionalString,
  client_email: optionalString,
  amount_cents: z.number().int().min(0).optional(),
  currency: optionalString,
  due_at: optionalString,
}).strict();

export const updateInvoiceSchema = z.object({
  status: nonEmptyString,
  note: optionalString,
}).strict();

export const createPaymentSchema = z.object({
  amount_cents: z.number().int().min(0),
  currency: nonEmptyString,
  paid_at: optionalString,
  reference: optionalString,
}).strict();

/* ── NEWSLETTER (public) ──────────────────────────── */

export const subscribeSchema = z.object({
  email: emailField,
}).strict();

export const unsubscribeSchema = z.object({
  token: nonEmptyString,
}).strict();

/* ── REFERRALS ────────────────────────────────────── */

export const createReferralCodeSchema = z.object({
  code: optionalString,
}).strict();

/* ── MEASUREMENT ──────────────────────────────────── */

export const measureEventSchema = z.object({
  key: nonEmptyString,
  path: nonEmptyString,
  metadata: z.unknown().optional(),
}).strict();
