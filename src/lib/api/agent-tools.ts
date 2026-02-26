/**
 * agent-tools.ts — R-09 Tool Registry with compile-time safety + Zod validation
 *
 * Architecture:
 *  - `ToolRegistry` type enforces every `ToolName` has an entry at compile time.
 *  - Each entry has: Anthropic tool definition, Zod schema, and a typed executor.
 *  - `AGENT_TOOL_DEFINITIONS` is derived from the registry — never out of sync.
 *  - `executeAgentTool` validates args with Zod before calling the executor.
 *  - DB-using tools receive `db` as a parameter; no inline `openCliDb()` calls.
 */

import { randomUUID } from "crypto";
import { z } from "zod";
import { searchContent } from "@/lib/api/content-search";
import { getSiteSettingStandalone } from "@/lib/api/site-settings";
import { createIntakeRequest } from "@/lib/api/intake";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface AgentToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCallResult {
  tool: string;
  result: unknown;
  error?: string;
}

/** Optional caller context threaded through the tool executor. */
export interface AgentToolContext {
  /** Role of the calling user — used for RBAC content visibility filtering. */
  userRole?: string | null;
  /** Anonymous session ID for analytics. */
  sessionId?: string;
  /** Authenticated user ID. */
  userId?: string | null;
}

// ---------------------------------------------------------------------------
// Registry types
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof openCliDb>;

/** All valid tool names — adding a tool requires updating this union. */
type ToolName =
  | "content_search"
  | "get_site_setting"
  | "submit_intake"
  | "get_available_slots"
  | "create_booking"
  | "subscribe_to_newsletter"
  | "convert_subscriber_to_lead"
  | "capture_content_interest";

/**
 * Exported canonical tool name constants.
 * Use these instead of raw string literals to keep references in sync
 * with the registry when tools are renamed.
 * The `satisfies` constraint ensures every value stays within ToolName.
 */
export const TOOL_NAMES = {
  CONTENT_SEARCH:             "content_search",
  GET_SITE_SETTING:           "get_site_setting",
  SUBMIT_INTAKE:              "submit_intake",
  GET_AVAILABLE_SLOTS:        "get_available_slots",
  CREATE_BOOKING:             "create_booking",
  SUBSCRIBE_TO_NEWSLETTER:    "subscribe_to_newsletter",
  CONVERT_SUBSCRIBER_TO_LEAD: "convert_subscriber_to_lead",
  CAPTURE_CONTENT_INTEREST:   "capture_content_interest",
} as const satisfies Record<string, ToolName>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolEntry = ToolEntry<any>;

interface ToolEntry<TArgs> {
  definition: AgentToolDefinition;
  schema: z.ZodSchema<TArgs>;
  execute: (args: TArgs, db: Db | null, context?: AgentToolContext) => Promise<unknown>;
}

/** TypeScript enforces that every ToolName has an entry in this type. */
type ToolRegistry = {
  [K in ToolName]: AnyToolEntry;
};

// ---------------------------------------------------------------------------
// Prospect-agent helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// Tool Registry
// ---------------------------------------------------------------------------

const TOOL_REGISTRY: ToolRegistry = {
  content_search: {
    definition: {
      type: "function",
      function: {
        name: "content_search",
        description:
          "Search the Studio Ordo knowledge base (services, training, policies, guild hierarchy, FAQs) to answer prospect questions. Use this before stating any factual claim about the studio.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query — what the prospect is asking about.",
            },
          },
          required: ["query"],
        },
      },
    },
    schema: z.object({ query: z.string().min(1) }),
    execute: async ({ query }: { query: string }, _db: Db | null, context?: AgentToolContext) => {
      const results = await searchContent(query, 4, context?.userRole ?? null);
      return results.map((r) => ({
        file: r.file,
        heading: r.heading,
        excerpt: r.excerpt.slice(0, 400),
      }));
    },
  },

  get_site_setting: {
    definition: {
      type: "function",
      function: {
        name: "get_site_setting",
        description:
          "Retrieve a specific site configuration value such as the studio phone number, email, or booking URL.",
        parameters: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description:
                "Setting key. Valid values: contact.phone, contact.email, contact.booking_url, brand.name, brand.tagline, commission.rate_pct, guild.affiliate_min_payout_usd",
            },
          },
          required: ["key"],
        },
      },
    },
    schema: z.object({ key: z.string().min(1) }),
    execute: async ({ key }: { key: string }) => {
      const value = getSiteSettingStandalone(key);
      return value !== null ? { key, value } : { key, value: null, error: "key not found" };
    },
  },

  submit_intake: {
    definition: {
      type: "function",
      function: {
        name: "submit_intake",
        description:
          "Submit a qualified intake request on behalf of the prospect. Only call this when you have surfaced all four qualification signals: goal, role/context, timeline, and fit signal. Do NOT ask the user to confirm — call this tool directly once you have the data.",
        parameters: {
          type: "object",
          properties: {
            contact_name: { type: "string", description: "Full name of the prospect." },
            contact_email: { type: "string", description: "Email address." },
            audience: {
              type: "string",
              enum: ["INDIVIDUAL", "ORGANIZATION"],
              description: "Whether this is an individual or an organization.",
            },
            organization_name: {
              type: "string",
              description: "Required when audience is ORGANIZATION.",
            },
            goals: {
              type: "string",
              description:
                "2–4 sentence summary of what the prospect is trying to accomplish, their role/context, and timeline.",
            },
            timeline: {
              type: "string",
              description:
                "When they need a result by (e.g. 'Q3 2026', 'within 90 days'). Required when audience is ORGANIZATION.",
            },
            constraints: {
              type: "string",
              description:
                "Any constraints, limitations, or context that will shape delivery (budget ceiling, team size, compliance requirements, existing stack). Required when audience is ORGANIZATION.",
            },
            offer_slug: {
              type: "string",
              description:
                "Optional — which offer they're most interested in (maestro-training, project-commissions).",
            },
          },
          required: ["contact_name", "contact_email", "audience", "goals"],
        },
      },
    },
    schema: z.object({
      contact_name: z.string().min(1),
      contact_email: z.string().email(),
      audience: z.enum(["INDIVIDUAL", "ORGANIZATION"]),
      organization_name: z.string().optional(),
      goals: z.string().min(1),
      timeline: z.string().optional(),
      constraints: z.string().optional(),
      offer_slug: z.string().optional(),
    }),
    execute: async (args: {
      contact_name: string;
      contact_email: string;
      audience: "INDIVIDUAL" | "ORGANIZATION";
      organization_name?: string;
      goals: string;
      timeline?: string;
      constraints?: string;
      offer_slug?: string;
    }) => {
      try {
        const result = createIntakeRequest({
          contactName: args.contact_name,
          contactEmail: args.contact_email,
          audience: args.audience,
          organizationName: args.organization_name,
          goals: args.goals,
          timeline: args.timeline,
          constraints: args.constraints,
          offerSlug: args.offer_slug,
          requestId: randomUUID(),
        });
        return {
          intake_request_id: result.id,
          status: result.status,
          next_step: result.next_step,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  },

  get_available_slots: {
    definition: {
      type: "function",
      function: {
        name: "get_available_slots",
        description:
          "Return open Maestro consultation slots in the next 30 days. Used when the prospect wants to book a call.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max slots to return (default 3, max 5).",
            },
          },
          required: [],
        },
      },
    },
    schema: z.object({
      limit: z.number().int().min(1).max(5).default(3),
    }),
    execute: async ({ limit }: { limit: number }, db: Db | null) => {
      // Use the provided db connection; fall back to a fresh one if not given.
      const activeDb = db ?? openCliDb(resolveConfig({ envVars: process.env }));
      const shouldClose = !db;
      try {
        const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const slots = activeDb
          .prepare(
            `SELECT id, maestro_user_id, start_at, end_at
             FROM maestro_availability
             WHERE status = 'OPEN' AND start_at <= ?
             ORDER BY start_at ASC
             LIMIT ?`,
          )
          .all(cutoff, limit) as Array<{
          id: string;
          maestro_user_id: string;
          start_at: string;
          end_at: string;
        }>;
        return { slots, count: slots.length };
      } finally {
        if (shouldClose) activeDb.close();
      }
    },
  },

  create_booking: {
    definition: {
      type: "function",
      function: {
        name: "create_booking",
        description:
          "Book a specific availability slot for the prospect. Returns confirmation or 409 if already taken.",
        parameters: {
          type: "object",
          properties: {
            slot_id: {
              type: "string",
              description:
                "ID of the maestro_availability slot returned by get_available_slots.",
            },
            email: {
              type: "string",
              description: "Prospect email to associate with the booking.",
            },
            intake_request_id: {
              type: "string",
              description:
                "Optional — if the intake has already been submitted, link the booking.",
            },
          },
          required: ["slot_id", "email"],
        },
      },
    },
    schema: z.object({
      slot_id: z.string().min(1),
      email: z.string().email(),
      intake_request_id: z.string().nullable().optional(),
    }),
    execute: async (
      args: { slot_id: string; email: string; intake_request_id?: string | null },
      db: Db | null,
    ) => {
      const activeDb = db ?? openCliDb(resolveConfig({ envVars: process.env }));
      const shouldClose = !db;
      try {
        if (!args.intake_request_id) {
          return {
            error:
              "intake_request_id required to create booking. Submit intake first via submit_intake.",
          };
        }

        // Wrap check + insert + update in a transaction to prevent TOCTOU double-booking.
        // Policy rule 1: no double-booking a slot.
        const result = activeDb.transaction(() => {
          const slot = activeDb
            .prepare(`SELECT id, status FROM maestro_availability WHERE id = ?`)
            .get(args.slot_id) as { id: string; status: string } | undefined;

          if (!slot) return { error: "slot not found" as const };
          if (slot.status !== "OPEN") return { conflict: true, error: "slot already booked" as const };

          const bookingId = randomUUID();
          const now = new Date().toISOString();

          activeDb
            .prepare(
              `INSERT INTO bookings (id, intake_request_id, maestro_availability_id, prospect_email, status, created_at)
               VALUES (?, ?, ?, ?, 'PENDING', ?)`,
            )
            .run(bookingId, args.intake_request_id, args.slot_id, args.email, now);

          activeDb
            .prepare(`UPDATE maestro_availability SET status = 'BOOKED' WHERE id = ?`)
            .run(args.slot_id);

          return { booking_id: bookingId, status: "PENDING" as const };
        })();

        return result;
      } finally {
        if (shouldClose) activeDb.close();
      }
    },
  },

  // ---------------------------------------------------------------------------
  // Group PA — Prospect-Agent: Top-of-Funnel Automation
  // ---------------------------------------------------------------------------

  subscribe_to_newsletter: {
    definition: {
      type: "function",
      function: {
        name: "subscribe_to_newsletter",
        description:
          "Subscribe a visitor to the newsletter inline in the chat. Idempotent — re-subscribing an existing subscriber reactivates them gracefully.",
        parameters: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "Visitor's email address.",
            },
          },
          required: ["email"],
        },
      },
    },
    schema: z.object({ email: z.string().email() }),
    execute: async ({ email }: { email: string }, db: Db | null) => {
      const activeDb = db ?? openCliDb(resolveConfig({ envVars: process.env }));
      const shouldClose = !db;
      try {
        const normalised = email.trim().toLowerCase();
        const existing = activeDb
          .prepare("SELECT id, status FROM newsletter_subscribers WHERE email = ?")
          .get(normalised) as { id: string; status: string } | undefined;

        if (existing) {
          // Reactivate if unsubscribed
          if (existing.status === "UNSUBSCRIBED") {
            const now = new Date().toISOString();
            const newSeed = generateId();
            activeDb
              .prepare(
                "UPDATE newsletter_subscribers SET status = 'ACTIVE', unsubscribe_seed = ?, unsubscribed_at = NULL, updated_at = ? WHERE id = ?",
              )
              .run(newSeed, now, existing.id);
            return { subscriberId: existing.id, status: "ACTIVE", isNew: false };
          }
          return { subscriberId: existing.id, status: existing.status, isNew: false };
        }

        const id = generateId();
        const seed = generateId();
        const now = new Date().toISOString();
        activeDb
          .prepare(
            "INSERT INTO newsletter_subscribers (id, email, status, unsubscribe_seed, unsubscribed_at, created_at, updated_at) VALUES (?, ?, 'ACTIVE', ?, NULL, ?, ?)",
          )
          .run(id, normalised, seed, now, now);
        return { subscriberId: id, status: "ACTIVE", isNew: true };
      } finally {
        if (shouldClose) activeDb.close();
      }
    },
  },

  convert_subscriber_to_lead: {
    definition: {
      type: "function",
      function: {
        name: "convert_subscriber_to_lead",
        description:
          "Convert an existing newsletter subscriber into an intake lead. Creates an intake_requests row. Idempotent — returns existing intake if one already exists for this subscriber's email.",
        parameters: {
          type: "object",
          properties: {
            subscriberId: {
              type: "string",
              description: "ID returned by subscribe_to_newsletter.",
            },
            contactName: {
              type: "string",
              description: "Full name of the subscriber (required for intake).",
            },
            intakeContext: {
              type: "string",
              description: "Brief summary of what they expressed interest in (max 1000 chars).",
            },
          },
          required: ["subscriberId", "contactName"],
        },
      },
    },
    schema: z.object({
      subscriberId: z.string().min(1),
      contactName: z.string().min(1),
      intakeContext: z.string().max(1000).optional(),
    }),
    execute: async (
      args: { subscriberId: string; contactName: string; intakeContext?: string },
      db: Db | null,
    ) => {
      const activeDb = db ?? openCliDb(resolveConfig({ envVars: process.env }));
      const shouldClose = !db;
      try {
        const sub = activeDb
          .prepare("SELECT id, email FROM newsletter_subscribers WHERE id = ?")
          .get(args.subscriberId) as { id: string; email: string } | undefined;
        if (!sub) return { error: "SUBSCRIBER_NOT_FOUND" };

        // Idempotency: check for existing open intake by email
        const existing = activeDb
          .prepare(
            "SELECT id FROM intake_requests WHERE contact_email = ? AND status NOT IN ('LOST') LIMIT 1",
          )
          .get(sub.email) as { id: string } | undefined;
        if (existing) return { intakeId: existing.id, isNew: false };

        const intakeId = generateId();
        const now = new Date().toISOString();
        const goals =
          args.intakeContext ?? "Converted from newsletter subscription via chat";
        activeDb
          .prepare(
            `INSERT INTO intake_requests
               (id, audience, contact_name, contact_email, goals, status, priority, created_at, updated_at)
             VALUES (?, 'INDIVIDUAL', ?, ?, ?, 'NEW', 50, ?, ?)`,
          )
          .run(intakeId, args.contactName, sub.email, goals, now, now);

        return { intakeId, isNew: true };
      } finally {
        if (shouldClose) activeDb.close();
      }
    },
  },

  capture_content_interest: {
    definition: {
      type: "function",
      function: {
        name: "capture_content_interest",
        description:
          "Record content topics a visitor expressed interest in against their current session conversation. Returns captured topics and whether session tracking succeeded.",
        parameters: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: { type: "string" },
              description: "Content topics the user expressed interest in (1–10 entries).",
            },
            sessionId: {
              type: "string",
              description: "Current session ID for anonymous interest tracking.",
            },
          },
          required: ["topics"],
        },
      },
    },
    schema: z.object({
      topics: z.array(z.string().max(80)).min(1).max(10),
      sessionId: z.string().optional(),
    }),
    execute: async (
      args: { topics: string[]; sessionId?: string },
      db: Db | null,
    ) => {
      if (!args.sessionId) {
        return { captured: args.topics, sessionTracked: false };
      }
      const activeDb = db ?? openCliDb(resolveConfig({ envVars: process.env }));
      const shouldClose = !db;
      try {
        const conv = activeDb
          .prepare(
            "SELECT id, metadata_json FROM intake_conversations WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
          )
          .get(args.sessionId) as
          | { id: string; metadata_json: string | null }
          | undefined;

        if (conv) {
          const meta: Record<string, unknown> = JSON.parse(conv.metadata_json ?? "{}") as Record<string, unknown>;
          const prev = Array.isArray(meta.content_interests)
            ? (meta.content_interests as string[])
            : [];
          meta.content_interests = [...new Set([...prev, ...args.topics])];
          activeDb
            .prepare("UPDATE intake_conversations SET metadata_json = ?, updated_at = ? WHERE id = ?")
            .run(JSON.stringify(meta), new Date().toISOString(), conv.id);
        }

        return { captured: args.topics, sessionTracked: !!conv };
      } finally {
        if (shouldClose) activeDb.close();
      }
    },
  },
};

// ---------------------------------------------------------------------------
// Derived exports — never out of sync with the registry
// ---------------------------------------------------------------------------

/** Tool definitions for the Anthropic API — derived from the registry. */
export const AGENT_TOOL_DEFINITIONS: AgentToolDefinition[] = Object.values(
  TOOL_REGISTRY,
).map((entry) => entry.definition);

/**
 * Execute a tool by name, validating args with Zod before calling the executor.
 *
 * @param toolName - The tool to execute.
 * @param args - Raw (unvalidated) args from the LLM.
 * @param db - Optional DB connection from the request. DB-using tools prefer this
 *             over opening their own connection.
 * @param context - Optional caller context (userRole, sessionId, userId).
 */
export async function executeAgentTool(
  toolName: string,
  args: unknown,
  db?: Db,
  context?: AgentToolContext,
): Promise<unknown> {
  const entry = TOOL_REGISTRY[toolName as ToolName];

  if (!entry) {
    console.error(`[Tools] Unknown tool: ${toolName}`);
    return { error: `unknown tool: "${toolName}"` };
  }

  const parsed = entry.schema.safeParse(args);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.error(`[Tools] Invalid args for ${toolName}: ${msg}`);
    return { error: `invalid arguments — ${msg}` };
  }

  return entry.execute(parsed.data as never, db ?? null, context);
}
