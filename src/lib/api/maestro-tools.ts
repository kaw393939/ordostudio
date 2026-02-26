/**
 * maestro-tools.ts — Ops Agent Tool Registry
 *
 * 10 admin-only tools across 4 groups:
 *   A. Queue      — get_intake_queue, get_intake_detail, update_intake_status
 *   B. Approvals  — list_role_requests, approve_role_request, reject_role_request
 *   C. KPI        — get_revenue_summary, get_recent_activity
 *   D. Operations — get_ops_summary, get_audit_log
 *
 * All tools take an already-open `db` so callers control the DB lifecycle and
 * write tools can share a transaction with the surrounding request.
 */

import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { z } from "zod";
import { writeFeedEvent } from "./feed-events";
import type { AgentToolDefinition } from "./agent-tools";

type Db = Database.Database;

// ---------------------------------------------------------------------------
// Internal KPI helpers (reused by get_ops_summary)
// ---------------------------------------------------------------------------

function _getRevenueSummary(db: Db, days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const row = db
    .prepare(
      `
SELECT
  COALESCE(SUM(CASE WHEN entry_type = 'PLATFORM_REVENUE'    AND status != 'VOID' THEN amount_cents ELSE 0 END), 0) AS platform_revenue,
  COALESCE(SUM(CASE WHEN entry_type = 'REFERRER_COMMISSION' AND status != 'VOID' THEN amount_cents ELSE 0 END), 0) AS referrer_commissions,
  COALESCE(SUM(CASE WHEN entry_type = 'PROVIDER_PAYOUT'     AND status != 'VOID' THEN amount_cents ELSE 0 END), 0) AS provider_payouts,
  COUNT(DISTINCT deal_id) AS deal_count,
  COUNT(*)                AS entry_count
FROM ledger_entries
WHERE earned_at >= ?
`,
    )
    .get(since) as
    | {
        platform_revenue: number;
        referrer_commissions: number;
        provider_payouts: number;
        deal_count: number;
        entry_count: number;
      }
    | undefined;

  const pr = row?.platform_revenue ?? 0;
  const rc = row?.referrer_commissions ?? 0;
  const pp = row?.provider_payouts ?? 0;

  return {
    period_days: days,
    platform_revenue_cents: pr,
    referrer_commissions_cents: rc,
    provider_payouts_cents: pp,
    net_revenue_cents: pr - rc,
    gross_revenue_cents: pr + rc + pp,
    deal_count: row?.deal_count ?? 0,
    entry_count: row?.entry_count ?? 0,
  };
}

function _getRecentActivity(db: Db, days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = db
    .prepare(
      `
SELECT type, COUNT(*) AS count, MAX(created_at) AS last_at
FROM feed_events
WHERE created_at >= ?
GROUP BY type
ORDER BY count DESC
`,
    )
    .all(since) as Array<{ type: string; count: number; last_at: string }>;

  return { period_days: days, activity: rows };
}

// ---------------------------------------------------------------------------
// MAESTRO_TOOLS — Anthropic-compatible tool definitions
// ---------------------------------------------------------------------------

export const MAESTRO_TOOLS: AgentToolDefinition[] = [
  // ---- Group A: Queue --------------------------------------------------
  {
    type: "function",
    function: {
      name: "get_intake_queue",
      description:
        "List intake requests in the ops queue. Use this to see what prospects are waiting for follow-up.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "array",
            items: {
              type: "string",
              enum: ["NEW", "TRIAGED", "QUALIFIED", "BOOKED", "LOST"],
            },
            description:
              "Filter by one or more statuses. Omit to return all statuses.",
          },
          limit: {
            type: "number",
            description: "Max rows to return (1–100, default 20).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_intake_detail",
      description:
        "Get full detail for a single intake request including status history and triage ticket.",
      parameters: {
        type: "object",
        properties: {
          intake_id: {
            type: "string",
            description: "The UUID of the intake request.",
          },
        },
        required: ["intake_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_intake_status",
      description:
        "Advance or change the status of an intake request. Optionally add a note explaining the change.",
      parameters: {
        type: "object",
        properties: {
          intake_id: {
            type: "string",
            description: "The UUID of the intake request.",
          },
          new_status: {
            type: "string",
            enum: ["TRIAGED", "QUALIFIED", "BOOKED", "LOST"],
            description: "The new status to assign.",
          },
          note: {
            type: "string",
            description:
              "Optional note explaining the status change (max 500 chars).",
          },
        },
        required: ["intake_id", "new_status"],
      },
    },
  },

  // ---- Group B: Role Approvals -----------------------------------------
  {
    type: "function",
    function: {
      name: "list_role_requests",
      description: "List user role requests filtered by status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["PENDING", "APPROVED", "REJECTED"],
            description: "Filter by status (default: PENDING).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_role_request",
      description:
        "Approve a pending role request. This will grant the user the requested role.",
      parameters: {
        type: "object",
        properties: {
          request_id: {
            type: "string",
            description: "The UUID of the role request to approve.",
          },
          note: {
            type: "string",
            description: "Optional approval note (max 500 chars).",
          },
        },
        required: ["request_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_role_request",
      description:
        "Reject a pending role request with a required reason.",
      parameters: {
        type: "object",
        properties: {
          request_id: {
            type: "string",
            description: "The UUID of the role request to reject.",
          },
          reason: {
            type: "string",
            description: "Required reason for rejection (max 500 chars).",
          },
        },
        required: ["request_id", "reason"],
      },
    },
  },

  // ---- Group C: KPI ---------------------------------------------------
  {
    type: "function",
    function: {
      name: "get_revenue_summary",
      description:
        "Get platform revenue, referrer commissions, provider payouts, and net revenue for a time period.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description:
              "Number of past days to aggregate (1–365, default 30).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_activity",
      description:
        "Get a breakdown of recent platform activity by event type (feed events grouped by type).",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description:
              "Number of past days to query (1–90, default 7).",
          },
        },
      },
    },
  },

  // ---- Group D: Operations --------------------------------------------
  {
    type: "function",
    function: {
      name: "get_ops_summary",
      description:
        "Get a combined ops overview: 7-day revenue summary + 7-day activity breakdown. Use this as a quick daily check.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_audit_log",
      description:
        "Retrieve recent audit log entries. Optionally filter by action prefix or actor type.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max number of entries (default 20).",
          },
          action: {
            type: "string",
            description: "Filter by action prefix (e.g. 'ledger', 'intake').",
          },
          actor_type: {
            type: "string",
            enum: ["USER", "SERVICE", "AGENT"],
            description: "Filter by actor type.",
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Group E — Journey-F: Urgent Escalation & Callback
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "flag_urgent_intake",
      description:
        "Flag an intake request as urgent and write an UrgentIntakeFlagged feed event. Use when a lead expresses urgency or immediate readiness to buy.",
      parameters: {
        type: "object",
        required: ["intakeId", "reason"],
        properties: {
          intakeId: {
            type: "string",
            description: "ID of the intake request to flag as urgent",
          },
          reason: {
            type: "string",
            description:
              "Why this intake needs urgent attention (5–500 chars)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_urgent_callback",
      description:
        "Book an urgent callback by reserving a maestro availability slot and creating a bookings row. Require operator confirmation before calling.",
      parameters: {
        type: "object",
        required: ["intakeId", "slotId"],
        properties: {
          intakeId: {
            type: "string",
            description: "Intake request ID to book callback for",
          },
          slotId: {
            type: "string",
            description: "Maestro availability slot ID to reserve",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_callback_outcome",
      description:
        "Record the outcome of a callback for an intake (converted, no_show, rescheduled, declined).",
      parameters: {
        type: "object",
        required: ["intakeId", "outcome"],
        properties: {
          intakeId: { type: "string", description: "Intake request ID" },
          outcome: {
            type: "string",
            enum: ["converted", "no_show", "rescheduled", "declined"],
            description: "Result of the callback",
          },
          notes: {
            type: "string",
            description: "Optional free text notes (max 1000 chars)",
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Group F — Commerce: Deal Pipeline
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "list_deals",
      description:
        "List deals in the pipeline. Returns intake contact info and current stage.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: [
              "QUEUED",
              "ASSIGNED",
              "MAESTRO_APPROVED",
              "PAID",
              "IN_PROGRESS",
              "DELIVERED",
              "CLOSED",
              "REFUNDED",
              "all",
            ],
            description: "Filter by status (default: QUEUED).",
          },
          limit: {
            type: "number",
            description: "Max rows (1–100, default 20).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deal_detail",
      description:
        "Get full details for a specific deal including intake and offer info.",
      parameters: {
        type: "object",
        required: ["dealId"],
        properties: {
          dealId: { type: "string", description: "Deal ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "advance_deal_stage",
      description:
        "Advance a deal to a new status stage. Enforces state machine rules. Always confirm with the operator before calling.",
      parameters: {
        type: "object",
        required: ["dealId", "newStatus"],
        properties: {
          dealId: { type: "string", description: "Deal ID to advance" },
          newStatus: {
            type: "string",
            enum: [
              "ASSIGNED",
              "MAESTRO_APPROVED",
              "PAID",
              "IN_PROGRESS",
              "DELIVERED",
              "CLOSED",
              "REFUNDED",
            ],
            description: "Target status",
          },
          note: {
            type: "string",
            description: "Optional note for audit trail (max 500 chars)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_timeline",
      description:
        "Get a chronological history of a user's activity (feed events, role requests). Returns empty + note for unknown users.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string", description: "User ID to look up" },
          limit: {
            type: "number",
            description: "Max events to return (1–50, default 20)",
          },
        },
      },
    },
  },
  // ---- Group G: Event Management ------------------------------------------
  {
    type: "function",
    function: {
      name: "create_event",
      description:
        "Create a new event (workshop, cohort, etc.) with a title, start time and capacity. Returns the new event ID.",
      parameters: {
        type: "object",
        required: ["title", "start_at"],
        properties: {
          title: {
            type: "string",
            description: "Event title (2–200 chars)",
          },
          start_at: {
            type: "string",
            description: "ISO 8601 start datetime",
          },
          capacity: {
            type: "number",
            description: "Max attendees (1–500, default 20)",
          },
          description: {
            type: "string",
            description: "Optional event description (max 2000 chars)",
          },
          end_at: {
            type: "string",
            description: "ISO 8601 end datetime (optional, defaults to start_at)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_event",
      description:
        "Update one or more fields of an existing event (title, times, capacity, status). At least one change field is required.",
      parameters: {
        type: "object",
        required: ["eventId", "changes"],
        properties: {
          eventId: { type: "string", description: "ID of the event to update" },
          changes: {
            type: "object",
            description:
              "Fields to update. At least one property must be provided.",
            properties: {
              title: { type: "string" },
              start_at: { type: "string" },
              end_at: { type: "string" },
              capacity: { type: "number" },
              status: {
                type: "string",
                enum: ["draft", "published", "cancelled"],
              },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_attendance",
      description:
        "Get current attendance statistics for an event: capacity, registered count, cancelled count, remaining spots and fill percentage.",
      parameters: {
        type: "object",
        required: ["eventId"],
        properties: {
          eventId: { type: "string", description: "ID of the event" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_registered_attendees",
      description:
        "List attendees of an event, optionally filtered by registration status (registered, cancelled, or all).",
      parameters: {
        type: "object",
        required: ["eventId"],
        properties: {
          eventId: { type: "string", description: "ID of the event" },
          status: {
            type: "string",
            enum: ["registered", "cancelled", "all"],
            description: "Registration status filter (default: registered)",
          },
        },
      },
    },
  },
  // ---- Group H: Membership & Apprenticeship ----------------------------------
  {
    type: "function",
    function: {
      name: "apply_for_apprenticeship",
      description:
        "Submit an apprenticeship application for a user. Idempotent — returns the existing request ID if one is already PENDING.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string", description: "ID of the user applying" },
          note: {
            type: "string",
            description: "Optional motivation note (max 500 chars)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "view_rank_requirements",
      description:
        "Return the static requirements a user must meet to advance past a given rank. Pass the current role to see what comes next.",
      parameters: {
        type: "object",
        properties: {
          targetRole: {
            type: "string",
            enum: [
              "SUBSCRIBER",
              "ASSOCIATE",
              "APPRENTICE",
              "CERTIFIED_CONSULTANT",
            ],
            description:
              "Role to view advancement requirements for (default: SUBSCRIBER)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_assigned_tasks",
      description:
        "List apprentice tasks assigned to a user. Returns an empty list with a note if the task module is not active.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string", description: "User whose tasks to list" },
          status: {
            type: "string",
            enum: ["all", "pending", "completed"],
            description: "Filter by task status (default: pending)",
          },
          limit: {
            type: "number",
            description: "Max tasks to return (1–50, default 20)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_apprentice_profile",
      description:
        "Get profile and progress summary for a user: current roles, gate submission count, and completed task count.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: {
            type: "string",
            description: "ID of the user to look up",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "review_apprentice_application",
      description:
        "Fetch full details of a pending apprenticeship application including user email and context notes. ADMIN/STAFF only.",
      parameters: {
        type: "object",
        required: ["requestId"],
        properties: {
          requestId: {
            type: "string",
            description: "ID of the role_requests row to review",
          },
        },
      },
    },
  },

  // ---- Group I: Affiliate --------------------------------------------------
  {
    type: "function",
    function: {
      name: "get_affiliate_link",
      description:
        "Return the unique referral code and shareable URL for a user. Creates the referral code if one does not yet exist.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: {
            type: "string",
            description: "ID of the affiliate user",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_affiliate_stats",
      description:
        "Return click, conversion, and commission summary for an affiliate over a configurable time window.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: {
            type: "string",
            description: "ID of the affiliate user",
          },
          days: {
            type: "number",
            description: "Lookback window in days (default 30, max 365)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_commissions",
      description:
        "List referral commissions for a user filtered by status. Status options: pending (EARNED), approved (APPROVED), voided (VOID), all.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: {
            type: "string",
            description: "ID of the affiliate user",
          },
          status: {
            type: "string",
            enum: ["pending", "approved", "voided", "all"],
            description: "Commission status filter (default: pending)",
          },
          limit: {
            type: "number",
            description: "Max entries to return (1–100, default 25)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "void_commission",
      description:
        "Void an EARNED referral commission entry. Cannot void already-approved or paid commissions. ADMIN only.",
      parameters: {
        type: "object",
        required: ["commissionId", "reason"],
        properties: {
          commissionId: {
            type: "string",
            description: "ID of the ledger_entries row to void",
          },
          reason: {
            type: "string",
            description: "Explanation for why the commission is being voided (5–300 chars)",
          },
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Zod schemas — runtime argument validation
// ---------------------------------------------------------------------------

const getIntakeQueueSchema = z.object({
  status: z
    .array(z.enum(["NEW", "TRIAGED", "QUALIFIED", "BOOKED", "LOST"]))
    .optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

const getIntakeDetailSchema = z.object({
  intake_id: z.string().min(1),
});

const updateIntakeStatusSchema = z.object({
  intake_id: z.string().min(1),
  new_status: z.enum(["TRIAGED", "QUALIFIED", "BOOKED", "LOST"]),
  note: z.string().max(500).optional(),
});

const listRoleRequestsSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

const approveRoleRequestSchema = z.object({
  request_id: z.string().min(1),
  note: z.string().max(500).optional(),
});

const rejectRoleRequestSchema = z.object({
  request_id: z.string().min(1),
  reason: z.string().min(1).max(500),
});

const getRevenueSummarySchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});

const getRecentActivitySchema = z.object({
  days: z.number().int().min(1).max(90).default(7),
});

const getAuditLogSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  actor_type: z.enum(["USER", "SERVICE", "AGENT"]).optional(),
});

// Journey-F schemas
const flagUrgentIntakeSchema = z.object({
  intakeId: z.string().min(1),
  reason: z.string().min(5).max(500),
});

const triggerUrgentCallbackSchema = z.object({
  intakeId: z.string().min(1),
  slotId: z.string().min(1),
});

const logCallbackOutcomeSchema = z.object({
  intakeId: z.string().min(1),
  outcome: z.enum(["converted", "no_show", "rescheduled", "declined"]),
  notes: z.string().max(1000).optional(),
});

// Commerce-Agent schemas
const listDealsSchema = z.object({
  status: z
    .enum([
      "QUEUED",
      "ASSIGNED",
      "MAESTRO_APPROVED",
      "PAID",
      "IN_PROGRESS",
      "DELIVERED",
      "CLOSED",
      "REFUNDED",
      "all",
    ])
    .default("QUEUED"),
  limit: z.number().int().min(1).max(100).default(20),
});

const getDealDetailSchema = z.object({
  dealId: z.string().min(1),
});

const advanceDealStageSchema = z.object({
  dealId: z.string().min(1),
  newStatus: z.enum([
    "ASSIGNED",
    "MAESTRO_APPROVED",
    "PAID",
    "IN_PROGRESS",
    "DELIVERED",
    "CLOSED",
    "REFUNDED",
  ]),
  note: z.string().max(500).optional(),
});

const getCustomerTimelineSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(20),
});

// Event Management schemas (Group G)
const createEventSchema = z.object({
  title: z.string().min(2).max(200),
  start_at: z.string().datetime(),
  capacity: z.number().int().min(1).max(500).default(20),
  description: z.string().max(2000).optional(),
  end_at: z.string().datetime().optional(),
});

const updateEventSchema = z.object({
  eventId: z.string().min(1),
  changes: z
    .object({
      title: z.string().min(2).max(200).optional(),
      start_at: z.string().datetime().optional(),
      end_at: z.string().datetime().optional(),
      capacity: z.number().int().min(1).optional(),
      status: z.enum(["draft", "published", "cancelled"]).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field required"),
});

const getEventAttendanceSchema = z.object({
  eventId: z.string().min(1),
});

const listRegisteredAttendeesSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["registered", "cancelled", "all"]).default("registered"),
});

// Membership & Apprenticeship schemas (Group H)
const applyForApprenticeshipSchema = z.object({
  userId: z.string().min(1),
  note: z.string().max(500).optional(),
});

const viewRankRequirementsSchema = z.object({
  targetRole: z
    .enum([
      "SUBSCRIBER",
      "ASSOCIATE",
      "APPRENTICE",
      "CERTIFIED_CONSULTANT",
    ])
    .optional(),
});

const listAssignedTasksSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["all", "pending", "completed"]).default("pending"),
  limit: z.number().int().min(1).max(50).default(20),
});

const getApprenticeProfileSchema = z.object({
  userId: z.string().min(1),
});

const reviewApprenticeApplicationSchema = z.object({
  requestId: z.string().min(1),
});

// Affiliate schemas (Group I)
const getAffiliateLinkSchema = z.object({
  userId: z.string().min(1),
});

const getAffiliateStatsSchema = z.object({
  userId: z.string().min(1),
  days: z.number().int().positive().max(365).default(30),
});

const listPendingCommissionsSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["pending", "approved", "voided", "all"]).default("pending"),
  limit: z.number().int().min(1).max(100).default(25),
});

const voidCommissionSchema = z.object({
  commissionId: z.string().min(1),
  reason: z.string().min(5).max(300),
});

// ---------------------------------------------------------------------------
// executeMaestroTool — tool dispatcher
// ---------------------------------------------------------------------------

export function executeMaestroTool(
  name: string,
  args: unknown,
  db: Db,
): Record<string, unknown> {
  try {
    switch (name) {
      // ------------------------------------------------------------------
      // Group A — Queue
      // ------------------------------------------------------------------

      case "get_intake_queue": {
        const { status, limit } = getIntakeQueueSchema.parse(args);
        const whereParts: string[] = [];
        const params: unknown[] = [];

        if (status && status.length > 0) {
          whereParts.push(
            `ir.status IN (${status.map(() => "?").join(", ")})`,
          );
          params.push(...status);
        }

        const where =
          whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
        params.push(limit);

        const rows = db
          .prepare(
            `
SELECT ir.id,
       ir.contact_name,
       ir.contact_email,
       ir.status,
       ir.audience,
       ir.owner_user_id,
       ir.priority,
       ir.created_at
FROM intake_requests ir
${where}
ORDER BY ir.created_at DESC
LIMIT ?
`,
          )
          .all(...params) as Array<{
          id: string;
          contact_name: string;
          contact_email: string;
          status: string;
          audience: string;
          owner_user_id: string | null;
          priority: number;
          created_at: string;
        }>;

        return { intakes: rows, count: rows.length };
      }

      case "get_intake_detail": {
        const { intake_id } = getIntakeDetailSchema.parse(args);

        const row = db
          .prepare(
            `
SELECT ir.*
FROM intake_requests ir
WHERE ir.id = ?
`,
          )
          .get(intake_id) as Record<string, unknown> | undefined;

        if (!row) {
          return { error: `Intake ${intake_id} not found` };
        }

        const history = db
          .prepare(
            `
SELECT id, from_status, to_status, note, changed_by, changed_at
FROM intake_status_history
WHERE intake_request_id = ?
ORDER BY changed_at ASC
`,
          )
          .all(intake_id) as Array<{
          id: string;
          from_status: string | null;
          to_status: string;
          note: string | null;
          changed_by: string | null;
          changed_at: string;
        }>;

        const ticket = db
          .prepare(
            `SELECT * FROM triage_tickets WHERE intake_request_id = ? LIMIT 1`,
          )
          .get(intake_id) as Record<string, unknown> | null | undefined;

        return {
          intake: row,
          history,
          triage_ticket: ticket ?? null,
        };
      }

      case "update_intake_status": {
        const { intake_id, new_status, note } =
          updateIntakeStatusSchema.parse(args);

        const now = new Date().toISOString();

        const existing = db
          .prepare(
            `SELECT id, status, owner_user_id FROM intake_requests WHERE id = ?`,
          )
          .get(intake_id) as
          | { id: string; status: string; owner_user_id: string | null }
          | undefined;

        if (!existing) {
          return { error: `Intake ${intake_id} not found` };
        }

        db.transaction(() => {
          db.prepare(
            `UPDATE intake_requests SET status = ?, updated_at = ? WHERE id = ?`,
          ).run(new_status, now, intake_id);

          db.prepare(
            `
INSERT INTO intake_status_history (id, intake_request_id, from_status, to_status, note, changed_by, changed_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`,
          ).run(
            randomUUID(),
            intake_id,
            existing.status,
            new_status,
            note ?? null,
            null,
            now,
          );

          // Write a feed event when the intake has an owner
          if (existing.owner_user_id) {
            writeFeedEvent(db, {
              userId: existing.owner_user_id,
              type: "IntakeStatusChanged",
              title: `Intake moved to ${new_status}`,
              description: `Intake ${intake_id} status changed from ${existing.status} to ${new_status}${note ? `: ${note}` : "."}`,
            });
          }
        })();

        return { success: true, intake_id, previous_status: existing.status, new_status };
      }

      // ------------------------------------------------------------------
      // Group B — Role Approvals
      // ------------------------------------------------------------------

      case "list_role_requests": {
        const { status } = listRoleRequestsSchema.parse(args);

        const rows = db
          .prepare(
            `
SELECT rr.id,
       rr.user_id,
       u.email              AS user_email,
       r.name               AS requested_role,
       rr.status,
       rr.created_at,
       rr.context
FROM role_requests rr
JOIN users u  ON u.id  = rr.user_id
JOIN roles r  ON r.id  = rr.requested_role_id
WHERE rr.status = ?
ORDER BY rr.created_at DESC
`,
          )
          .all(status) as Array<{
          id: string;
          user_id: string;
          user_email: string;
          requested_role: string;
          status: string;
          created_at: string;
          context: string | null;
        }>;

        return { requests: rows, count: rows.length };
      }

      case "approve_role_request": {
        const { request_id, note } = approveRoleRequestSchema.parse(args);
        const now = new Date().toISOString();

        const req = db
          .prepare(
            `
SELECT rr.id,
       rr.user_id,
       rr.requested_role_id,
       r.name AS role_name,
       rr.status
FROM role_requests rr
JOIN roles r ON r.id = rr.requested_role_id
WHERE rr.id = ?
`,
          )
          .get(request_id) as
          | {
              id: string;
              user_id: string;
              requested_role_id: string;
              role_name: string;
              status: string;
            }
          | undefined;

        if (!req) {
          return { error: `Role request ${request_id} not found` };
        }
        if (req.status !== "PENDING") {
          return { error: `Role request is already ${req.status}` };
        }

        db.transaction(() => {
          db.prepare(
            `UPDATE role_requests SET status = 'APPROVED', updated_at = ? WHERE id = ?`,
          ).run(now, request_id);

          db.prepare(
            `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          ).run(req.user_id, req.requested_role_id);

          writeFeedEvent(db, {
            userId: req.user_id,
            type: "RoleApproved",
            title: `Role approved: ${req.role_name}`,
            description: `Your request for the ${req.role_name} role has been approved${note ? `. Note: ${note}` : "."}`,
          });
        })();

        return { success: true, user_id: req.user_id, role: req.role_name };
      }

      case "reject_role_request": {
        const { request_id, reason } = rejectRoleRequestSchema.parse(args);
        const now = new Date().toISOString();

        const req = db
          .prepare(
            `
SELECT rr.id,
       rr.user_id,
       r.name AS role_name,
       rr.status
FROM role_requests rr
JOIN roles r ON r.id = rr.requested_role_id
WHERE rr.id = ?
`,
          )
          .get(request_id) as
          | { id: string; user_id: string; role_name: string; status: string }
          | undefined;

        if (!req) {
          return { error: `Role request ${request_id} not found` };
        }
        if (req.status !== "PENDING") {
          return { error: `Role request is already ${req.status}` };
        }

        db.prepare(
          `UPDATE role_requests SET status = 'REJECTED', updated_at = ? WHERE id = ?`,
        ).run(now, request_id);

        writeFeedEvent(db, {
          userId: req.user_id,
          type: "RoleRejected",
          title: `Role request rejected: ${req.role_name}`,
          description: `Your request for the ${req.role_name} role was rejected. Reason: ${reason}`,
        });

        return { success: true, user_id: req.user_id, role: req.role_name };
      }

      // ------------------------------------------------------------------
      // Group C — KPI
      // ------------------------------------------------------------------

      case "get_revenue_summary": {
        const { days } = getRevenueSummarySchema.parse(args);
        return _getRevenueSummary(db, days);
      }

      case "get_recent_activity": {
        const { days } = getRecentActivitySchema.parse(args);
        return _getRecentActivity(db, days);
      }

      // ------------------------------------------------------------------
      // Group D — Operations
      // ------------------------------------------------------------------

      case "get_ops_summary": {
        const revenue = _getRevenueSummary(db, 7);
        const activity = _getRecentActivity(db, 7);
        return {
          revenue_summary: revenue,
          activity_summary: activity,
        };
      }

      case "get_audit_log": {
        const { limit, action, actor_type } = getAuditLogSchema.parse(args);

        const whereParts: string[] = [];
        const params: unknown[] = [];

        if (action) {
          whereParts.push("action LIKE ?");
          params.push(`${action}%`);
        }
        if (actor_type) {
          whereParts.push("actor_type = ?");
          params.push(actor_type);
        }

        const where =
          whereParts.length > 0
            ? `WHERE ${whereParts.join(" AND ")}`
            : "";

        params.push(limit);

        const rows = db
          .prepare(
            `
SELECT id, actor_type, actor_id, action, target_type, target_id, created_at, request_id
FROM audit_log
${where}
ORDER BY created_at DESC
LIMIT ?
`,
          )
          .all(...params) as Array<{
          id: string;
          actor_type: string;
          actor_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          created_at: string;
          request_id: string;
        }>;

        return { entries: rows, count: rows.length };
      }

      // ------------------------------------------------------------------
      // Group E — Journey-F: Urgent Escalation & Callback
      // ------------------------------------------------------------------

      case "flag_urgent_intake": {
        const { intakeId, reason } = flagUrgentIntakeSchema.parse(args);

        const intake = db
          .prepare(
            "SELECT id, owner_user_id FROM intake_requests WHERE id = ?",
          )
          .get(intakeId) as
          | { id: string; owner_user_id: string | null }
          | undefined;
        if (!intake) return { error: "INTAKE_NOT_FOUND" };

        const now = new Date().toISOString();

        // Upsert triage_tickets: update if exists, insert if not
        const existingTicket = db
          .prepare(
            "SELECT id FROM triage_tickets WHERE intake_request_id = ?",
          )
          .get(intakeId);
        if (existingTicket) {
          db.prepare(
            "UPDATE triage_tickets SET priority = 'urgent', updated_at = ? WHERE intake_request_id = ?",
          ).run(now, intakeId);
        } else {
          db.prepare(
            `INSERT INTO triage_tickets
             (id, intake_request_id, category, confidence, summary, recommended_action, priority, status, created_at, updated_at)
             VALUES (?, ?, 'urgent_escalation', 1.0, ?, 'urgent_callback', 'urgent', 'pending', ?, ?)`,
          ).run(randomUUID(), intakeId, reason, now, now);
        }

        // Write feed event only when there is a valid user to attach it to
        if (intake.owner_user_id) {
          writeFeedEvent(db, {
            userId: intake.owner_user_id,
            type: "UrgentIntakeFlagged",
            title: `Intake ${intakeId} flagged as urgent`,
            description: `${reason} (intakeId: ${intakeId})`,
          });
        }

        return { intakeId, priority: "urgent", flaggedAt: now };
      }

      case "trigger_urgent_callback": {
        const { intakeId, slotId } = triggerUrgentCallbackSchema.parse(args);

        const result = (
          db.transaction(() => {
            const slot = db
              .prepare(
                "SELECT id, status FROM maestro_availability WHERE id = ?",
              )
              .get(slotId) as { id: string; status: string } | undefined;
            if (!slot) throw new Error("SLOT_NOT_FOUND");
            if (slot.status !== "OPEN") throw new Error("SLOT_CAPACITY_EXCEEDED");

            db.prepare(
              "UPDATE maestro_availability SET status = 'BOOKED' WHERE id = ?",
            ).run(slotId);

            const intakeRow = db
              .prepare(
                "SELECT contact_email FROM intake_requests WHERE id = ?",
              )
              .get(intakeId) as { contact_email: string } | undefined;

            const bookingId = randomUUID();
            db.prepare(
              `INSERT INTO bookings
               (id, intake_request_id, maestro_availability_id, prospect_email, status, created_at)
               VALUES (?, ?, ?, ?, 'CONFIRMED', strftime('%Y-%m-%dT%H:%M:%SZ','now'))`,
            ).run(
              bookingId,
              intakeId,
              slotId,
              intakeRow?.contact_email ?? "",
            );

            return { bookingId, slotId, intakeId };
          }) as () => { bookingId: string; slotId: string; intakeId: string }
        )();

        return { ...result, bookedAt: new Date().toISOString() };
      }

      case "log_callback_outcome": {
        const { intakeId, outcome, notes } = logCallbackOutcomeSchema.parse(args);
        const now = new Date().toISOString();

        const info = db
          .prepare(
            `UPDATE bookings
             SET outcome = ?, outcome_notes = ?, outcome_at = ?
             WHERE intake_request_id = ? AND status = 'CONFIRMED'`,
          )
          .run(outcome, notes ?? null, now, intakeId);

        if (info.changes === 0) return { error: "NO_BOOKING_FOUND" };
        return { intakeId, outcome, loggedAt: now };
      }

      // ------------------------------------------------------------------
      // Group F — Commerce: Deal Pipeline
      // ------------------------------------------------------------------

      case "list_deals": {
        const { status, limit } = listDealsSchema.parse(args);

        const rows = db
          .prepare(
            `
SELECT d.id,
       d.intake_id,
       d.offer_slug,
       d.status,
       d.maestro_user_id,
       d.created_at,
       d.updated_at,
       i.contact_name,
       i.contact_email,
       i.audience
FROM deals d
LEFT JOIN intake_requests i ON i.id = d.intake_id
WHERE (? = 'all' OR d.status = ?)
ORDER BY d.created_at DESC
LIMIT ?
`,
          )
          .all(status, status, limit) as Array<Record<string, unknown>>;

        return { deals: rows, count: rows.length };
      }

      case "get_deal_detail": {
        const { dealId } = getDealDetailSchema.parse(args);

        const row = db
          .prepare(
            `
SELECT d.id,
       d.intake_id,
       d.offer_slug,
       d.status,
       d.referrer_user_id,
       d.provider_user_id,
       d.maestro_user_id,
       d.created_at,
       d.updated_at,
       i.contact_name,
       i.contact_email,
       i.audience,
       i.goals,
       i.status AS intake_status,
       i.created_at AS intake_created_at,
       o.title AS offer_title
FROM deals d
LEFT JOIN intake_requests i ON i.id = d.intake_id
LEFT JOIN offers o ON o.slug = d.offer_slug
WHERE d.id = ?
`,
          )
          .get(dealId) as Record<string, unknown> | undefined;

        if (!row) return { error: "DEAL_NOT_FOUND" };
        return row;
      }

      case "advance_deal_stage": {
        const { dealId, newStatus, note } = advanceDealStageSchema.parse(args);

        const deal = db
          .prepare("SELECT id, status, maestro_user_id FROM deals WHERE id = ?")
          .get(dealId) as
          | { id: string; status: string; maestro_user_id: string | null }
          | undefined;

        if (!deal) return { error: "DEAL_NOT_FOUND" };

        // State machine guard — prevent skipping approval steps
        const needsApproval = newStatus === "MAESTRO_APPROVED";
        if (needsApproval && deal.status !== "ASSIGNED") {
          return {
            error: "INVALID_TRANSITION",
            message: `Deal must be ASSIGNED before MAESTRO_APPROVED. Current: ${deal.status}`,
          };
        }
        const needsMaestroApproval =
          newStatus === "PAID" || newStatus === "IN_PROGRESS";
        if (needsMaestroApproval && deal.status !== "MAESTRO_APPROVED") {
          return {
            error: "INVALID_TRANSITION",
            message: `Deal must be MAESTRO_APPROVED before ${newStatus}. Current: ${deal.status}`,
          };
        }

        const now = new Date().toISOString();
        db.prepare(
          "UPDATE deals SET status = ?, updated_at = ? WHERE id = ?",
        ).run(newStatus, now, dealId);

        // Audit log entry
        db.prepare(
          `INSERT INTO audit_log (id, actor_type, action, target_type, target_id, metadata, created_at, request_id)
           VALUES (?, 'AGENT', 'deal.advance_stage', 'deal', ?, ?, ?, ?)`,
        ).run(
          randomUUID(),
          dealId,
          JSON.stringify({
            from: deal.status,
            to: newStatus,
            note: note ?? null,
          }),
          now,
          randomUUID(),
        );

        // Feed event to maestro user if set
        if (deal.maestro_user_id) {
          writeFeedEvent(db, {
            userId: deal.maestro_user_id,
            type: "DealAdvanced",
            title: `Deal ${dealId} advanced to ${newStatus}`,
            description: `Stage changed from ${deal.status} to ${newStatus}${note ? `: ${note}` : ""}`,
          });
        }

        return {
          dealId,
          previousStatus: deal.status,
          newStatus,
          advancedAt: now,
        };
      }

      case "get_customer_timeline": {
        const { userId, limit } = getCustomerTimelineSchema.parse(args);

        // Check if user exists
        const user = db
          .prepare("SELECT id FROM users WHERE id = ?")
          .get(userId);
        if (!user) {
          return { events: [], count: 0, note: "No activity found" };
        }

        const rows = db
          .prepare(
            `
SELECT 'feed_event' AS type,
       f.id,
       f.type AS subtype,
       f.description AS description,
       f.created_at
FROM feed_events f
WHERE f.user_id = ?
UNION ALL
SELECT 'role_request',
       rr.id,
       rr.status || ' ' || COALESCE(rr.requested_role_id, ''),
       COALESCE(rr.context, ''),
       rr.created_at
FROM role_requests rr
WHERE rr.user_id = ?
ORDER BY created_at DESC
LIMIT ?
`,
          )
          .all(userId, userId, limit) as Array<Record<string, unknown>>;

        return {
          events: rows,
          count: rows.length,
          ...(rows.length === 0 ? { note: "No activity found" } : {}),
        };
      }

      // ------------------------------------------------------------------
      // Group G — Event Management
      // ------------------------------------------------------------------

      case "create_event": {
        const { title, start_at, capacity, end_at } =
          createEventSchema.parse(args);
        const now = new Date().toISOString();
        const eventId = `evt-${randomUUID().slice(0, 8)}`;
        // Derive a unique slug from title + short id
        const slugBase = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 60);
        const slug = `${slugBase}-${eventId.slice(4)}`;
        const resolvedEnd = end_at ?? start_at;

        db.prepare(
          `INSERT INTO events
             (id, slug, title, start_at, end_at, timezone, status, capacity, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'UTC', 'draft', ?, NULL, ?, ?)`,
        ).run(eventId, slug, title, start_at, resolvedEnd, capacity, now, now);

        return { eventId, title, start_at, capacity, status: "draft" };
      }

      case "update_event": {
        const { eventId, changes } = updateEventSchema.parse(args);

        const existing = db
          .prepare("SELECT id FROM events WHERE id = ?")
          .get(eventId);
        if (!existing) {
          return { error: `Event not found: ${eventId}` };
        }

        const now = new Date().toISOString();
        const setClauses: string[] = ["updated_at = ?"];
        const params: unknown[] = [now];

        const fieldMap: Record<string, string> = {
          title: "title",
          start_at: "start_at",
          end_at: "end_at",
          capacity: "capacity",
          status: "status",
        };

        const updatedFields: string[] = [];
        for (const [key, col] of Object.entries(fieldMap)) {
          const val = (changes as Record<string, unknown>)[key];
          if (val !== undefined) {
            setClauses.push(`${col} = ?`);
            params.push(val);
            updatedFields.push(key);
          }
        }

        params.push(eventId);
        db.transaction(() => {
          db.prepare(
            `UPDATE events SET ${setClauses.join(", ")} WHERE id = ?`,
          ).run(...params);
        })();

        return { eventId, updatedFields, updatedAt: now };
      }

      case "get_event_attendance": {
        const { eventId } = getEventAttendanceSchema.parse(args);

        const row = db
          .prepare(
            `
SELECT
  e.title,
  e.capacity,
  COUNT(er.id) FILTER (WHERE er.status = 'registered') AS registered,
  COUNT(er.id) FILTER (WHERE er.status = 'cancelled')  AS cancelled,
  e.capacity - COUNT(er.id) FILTER (WHERE er.status = 'registered') AS remaining
FROM events e
LEFT JOIN event_registrations er ON er.event_id = e.id
WHERE e.id = ?
GROUP BY e.id
`,
          )
          .get(eventId) as
          | {
              title: string;
              capacity: number;
              registered: number;
              cancelled: number;
              remaining: number;
            }
          | undefined;

        if (!row) {
          return { error: `Event not found: ${eventId}` };
        }

        const fillPct =
          row.capacity > 0
            ? Math.round((row.registered / row.capacity) * 100)
            : 0;

        return { ...row, fillPct };
      }

      case "list_registered_attendees": {
        const { eventId, status } =
          listRegisteredAttendeesSchema.parse(args);

        const rows = db
          .prepare(
            `
SELECT er.id, er.status, u.email, u.id AS user_id
FROM event_registrations er
JOIN users u ON u.id = er.user_id
WHERE er.event_id = ?
  AND (? = 'all' OR er.status = ?)
ORDER BY er.id ASC
`,
          )
          .all(eventId, status, status) as Array<{
          id: string;
          status: string;
          email: string;
          user_id: string;
        }>;

        const attendees = rows.map((r) => ({
          userId: r.user_id,
          email: r.email,
          status: r.status,
        }));

        return { eventId, attendees };
      }

      // ------------------------------------------------------------------
      // Group H — Membership & Apprenticeship
      // ------------------------------------------------------------------

      case "apply_for_apprenticeship": {
        const { userId, note } = applyForApprenticeshipSchema.parse(args);

        // Idempotency: check for existing PENDING request
        const existing = db
          .prepare(
            "SELECT id FROM role_requests WHERE user_id = ? AND status = 'PENDING' LIMIT 1",
          )
          .get(userId) as { id: string } | undefined;

        if (existing) {
          return {
            error: "APPLICATION_ALREADY_PENDING",
            existingRequestId: existing.id,
          };
        }

        // Resolve APPRENTICE role ID
        const role = db
          .prepare("SELECT id FROM roles WHERE name = 'APPRENTICE' LIMIT 1")
          .get() as { id: string } | undefined;

        if (!role) {
          return {
            error: "ROLE_NOT_FOUND",
            message: "APPRENTICE role not configured in this instance",
          };
        }

        const now = new Date().toISOString();
        const requestId = randomUUID();
        db.prepare(
          `INSERT INTO role_requests
             (id, user_id, requested_role_id, status, context, created_at, updated_at)
           VALUES (?, ?, ?, 'PENDING', ?, ?, ?)`,
        ).run(
          requestId,
          userId,
          role.id,
          JSON.stringify({ note: note ?? null }),
          now,
          now,
        );

        return { requestId, status: "pending", message: "Application submitted" };
      }

      case "view_rank_requirements": {
        const { targetRole } = viewRankRequirementsSchema.parse(args);

        const RANK_REQUIREMENTS: Record<string, string[]> = {
          SUBSCRIBER: [
            "Submit an intake request",
            "Attend one free webinar or event",
          ],
          ASSOCIATE: [
            "Complete onboarding intake",
            "Receive ASSOCIATE role assignment from Staff",
          ],
          APPRENTICE: [
            "Complete 3 assigned tasks",
            "Submit a gate submission reviewed by Admin",
          ],
          CERTIFIED_CONSULTANT: [
            "Complete full apprenticeship program",
            "Receive CERTIFIED_CONSULTANT promotion from Admin",
          ],
        };

        const RANK_ORDER = [
          "SUBSCRIBER",
          "ASSOCIATE",
          "APPRENTICE",
          "CERTIFIED_CONSULTANT",
        ];

        const role = targetRole ?? "SUBSCRIBER";
        const currentIdx = RANK_ORDER.indexOf(role);
        const nextRole =
          currentIdx >= 0 && currentIdx < RANK_ORDER.length - 1
            ? RANK_ORDER[currentIdx + 1]
            : null;

        return {
          currentRole: role,
          nextRole,
          requirementsToAdvance: nextRole ? RANK_REQUIREMENTS[role] : [],
        };
      }

      case "list_assigned_tasks": {
        const { userId, status, limit } = listAssignedTasksSchema.parse(args);

        try {
          const rows = db
            .prepare(
              `
SELECT id, title, description, status, due_date, created_at
FROM apprentice_tasks
WHERE assigned_to = ?
  AND (? = 'all' OR status = ?)
ORDER BY created_at DESC
LIMIT ?
`,
            )
            .all(userId, status, status, limit) as Array<
            Record<string, unknown>
          >;
          return { tasks: rows, count: rows.length };
        } catch {
          return { tasks: [], note: "task module not active" };
        }
      }

      case "get_apprentice_profile": {
        const { userId } = getApprenticeProfileSchema.parse(args);

        const user = db
          .prepare(
            `
SELECT u.id, u.created_at AS joined_at,
       COUNT(DISTINCT ags.id) AS gate_submissions_n
FROM users u
LEFT JOIN apprentice_gate_submissions ags ON ags.user_id = u.id
WHERE u.id = ?
GROUP BY u.id
`,
          )
          .get(userId) as
          | { id: string; joined_at: string; gate_submissions_n: number }
          | undefined;

        if (!user) {
          return { error: "USER_NOT_FOUND" };
        }

        // Fetch current roles
        const roles = db
          .prepare(
            `
SELECT r.name
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = ?
`,
          )
          .all(userId) as Array<{ name: string }>;

        // Tasks completed (graceful if apprentice_tasks absent)
        let tasksCompleted = 0;
        try {
          const t = db
            .prepare(
              "SELECT COUNT(*) AS n FROM apprentice_tasks WHERE assigned_to = ? AND status = 'completed'",
            )
            .get(userId) as { n: number };
          tasksCompleted = t.n;
        } catch {
          /* apprentice_tasks not yet active */
        }

        return {
          userId: user.id,
          joinedAt: user.joined_at,
          roles: roles.map((r) => r.name),
          gateSubmissionsN: user.gate_submissions_n,
          tasksCompletedN: tasksCompleted,
        };
      }

      case "review_apprentice_application": {
        const { requestId } = reviewApprenticeApplicationSchema.parse(args);

        const row = db
          .prepare(
            `
SELECT rr.id, rr.status, rr.context, rr.created_at, rr.updated_at,
       u.email, r.name AS requested_role
FROM role_requests rr
JOIN users u ON u.id = rr.user_id
JOIN roles r ON r.id = rr.requested_role_id
WHERE rr.id = ?
`,
          )
          .get(requestId) as
          | {
              id: string;
              status: string;
              context: string;
              created_at: string;
              updated_at: string;
              email: string;
              requested_role: string;
            }
          | undefined;

        if (!row) {
          return { error: "APPLICATION_NOT_FOUND" };
        }

        let context: unknown = null;
        try {
          context = JSON.parse(row.context);
        } catch {
          context = row.context;
        }

        return { ...row, context };
      }

      // Group I — Affiliate
      case "get_affiliate_link": {
        const { userId } = getAffiliateLinkSchema.parse(args);

        const existing = db
          .prepare(
            "SELECT id, code, created_at, updated_at FROM referral_codes WHERE user_id = ?",
          )
          .get(userId) as
          | { id: string; code: string; created_at: string; updated_at: string }
          | undefined;

        if (existing) {
          return {
            referralCode: existing.code,
            referralUrl: `https://studio-ordo.com/?ref=${existing.code}`,
            createdAt: existing.created_at,
          };
        }

        // Generate new code: 8-char alphanumeric from userId hash + random
        const newCode = (
          userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() +
          Math.random().toString(36).slice(2, 6).toUpperCase()
        ).slice(0, 8);
        const now = new Date().toISOString();
        const newId = `rc-${userId.slice(0, 8)}-${Date.now()}`;

        db.prepare(
          "INSERT INTO referral_codes (id, user_id, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ).run(newId, userId, newCode, now, now);

        return {
          referralCode: newCode,
          referralUrl: `https://studio-ordo.com/?ref=${newCode}`,
          createdAt: now,
        };
      }

      case "get_affiliate_stats": {
        const { userId, days } = getAffiliateStatsSchema.parse(args);

        // Look up the user's referral code
        const rc = db
          .prepare("SELECT id FROM referral_codes WHERE user_id = ?")
          .get(userId) as { id: string } | undefined;

        if (!rc) {
          return {
            userId,
            days,
            clicks: 0,
            conversions: 0,
            totalEarnedCents: 0,
            pendingPayoutCents: 0,
            note: "No referral code found for this user.",
          };
        }

        const since = new Date(
          Date.now() - days * 24 * 60 * 60 * 1000,
        ).toISOString();

        const clicks = (
          db
            .prepare(
              "SELECT COUNT(*) AS n FROM referral_clicks WHERE referral_code_id = ? AND created_at >= ?",
            )
            .get(rc.id, since) as { n: number }
        ).n;

        const conversions = (
          db
            .prepare(
              "SELECT COUNT(*) AS n FROM referral_conversions WHERE referral_code_id = ? AND created_at >= ?",
            )
            .get(rc.id, since) as { n: number }
        ).n;

        const ledger = db
          .prepare(
            `SELECT
              SUM(amount_cents) AS total_cents,
              SUM(CASE WHEN status = 'EARNED' THEN amount_cents ELSE 0 END) AS pending_cents
             FROM ledger_entries
             WHERE entry_type = 'REFERRER_COMMISSION'
               AND beneficiary_user_id = ?
               AND earned_at >= ?`,
          )
          .get(userId, since) as
          | { total_cents: number | null; pending_cents: number | null }
          | undefined;

        return {
          userId,
          days,
          clicks,
          conversions,
          totalEarnedCents: ledger?.total_cents ?? 0,
          pendingPayoutCents: ledger?.pending_cents ?? 0,
        };
      }

      case "list_pending_commissions": {
        const { userId, status, limit } =
          listPendingCommissionsSchema.parse(args);

        // Map spec status to DB status
        const statusMap: Record<string, string | null> = {
          pending: "EARNED",
          approved: "APPROVED",
          voided: "VOID",
          all: null,
        };
        const dbStatus = statusMap[status]!;

        const whereParts = [
          "entry_type = 'REFERRER_COMMISSION'",
          "beneficiary_user_id = ?",
        ];
        const params: unknown[] = [userId];

        if (dbStatus !== null) {
          whereParts.push("status = ?");
          params.push(dbStatus);
        }

        params.push(limit);

        const rows = db
          .prepare(
            `SELECT id, deal_id, amount_cents, currency, status, earned_at, approved_at, paid_at, created_at
             FROM ledger_entries
             WHERE ${whereParts.join(" AND ")}
             ORDER BY earned_at DESC
             LIMIT ?`,
          )
          .all(...params) as Array<{
          id: string;
          deal_id: string;
          amount_cents: number;
          currency: string;
          status: string;
          earned_at: string;
          approved_at: string | null;
          paid_at: string | null;
          created_at: string;
        }>;

        return { commissions: rows, count: rows.length };
      }

      case "void_commission": {
        const { commissionId, reason } = voidCommissionSchema.parse(args);

        const entry = db
          .prepare(
            "SELECT id, status, entry_type FROM ledger_entries WHERE id = ?",
          )
          .get(commissionId) as
          | { id: string; status: string; entry_type: string }
          | undefined;

        if (!entry) {
          return { error: "COMMISSION_NOT_FOUND" };
        }
        if (entry.entry_type !== "REFERRER_COMMISSION") {
          return { error: "NOT_A_REFERRER_COMMISSION" };
        }
        if (entry.status === "VOID") {
          return { error: "ALREADY_VOID" };
        }
        if (entry.status !== "EARNED") {
          return {
            error: `CANNOT_VOID_STATUS_${entry.status}`,
            details:
              "Only EARNED commissions may be voided. APPROVED or PAID commissions require a reversal.",
          };
        }

        const now = new Date().toISOString();
        db.prepare(
          "UPDATE ledger_entries SET status = 'VOID', updated_at = ? WHERE id = ?",
        ).run(now, commissionId);

        return { success: true, commissionId, reason, voidedAt: now };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: `Invalid arguments: ${err.message}` };
    }
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
