/**
 * Sprint 36 — Agent Tool Library
 *
 * Defines the tools available to the conversational intake agent.
 * Each tool corresponds to an OpenAI function definition plus an executor.
 */

import { randomUUID } from "crypto";
import { searchContent } from "@/lib/api/content-search";
import { getSiteSettingStandalone } from "@/lib/api/site-settings";
import { createIntakeRequest } from "@/lib/api/intake";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";

// ---------------------------------------------------------------------------
// Types
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

// ---------------------------------------------------------------------------
// OpenAI function definitions (passed to chat.completions.create)
// ---------------------------------------------------------------------------

export const AGENT_TOOL_DEFINITIONS: AgentToolDefinition[] = [
  {
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
  {
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
  {
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
            description: "When they need a result by (e.g. 'Q3 2026', 'within 90 days'). Required when audience is ORGANIZATION.",
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
  {
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
  {
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
            description: "ID of the maestro_availability slot returned by get_available_slots.",
          },
          email: {
            type: "string",
            description: "Prospect email to associate with the booking.",
          },
          intake_request_id: {
            type: "string",
            description: "Optional — if the intake has already been submitted, link the booking.",
          },
        },
        required: ["slot_id", "email"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executors
// ---------------------------------------------------------------------------

export async function executeAgentTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case "content_search": {
      const query = String(args.query ?? "");
      const results = await searchContent(query, 4);
      return results.map((r) => ({
        file: r.file,
        heading: r.heading,
        excerpt: r.excerpt.slice(0, 400),
      }));
    }

    case "get_site_setting": {
      const key = String(args.key ?? "");
      const value = getSiteSettingStandalone(key);
      return value !== null ? { key, value } : { key, value: null, error: "key not found" };
    }

    case "submit_intake": {
      try {
        const result = createIntakeRequest({
          contactName: String(args.contact_name ?? ""),
          contactEmail: String(args.contact_email ?? ""),
          audience: (args.audience as "INDIVIDUAL" | "ORGANIZATION") ?? "INDIVIDUAL",
          organizationName: args.organization_name
            ? String(args.organization_name)
            : undefined,
          goals: String(args.goals ?? ""),
          timeline: args.timeline ? String(args.timeline) : undefined,
          constraints: args.constraints ? String(args.constraints) : undefined,
          offerSlug: args.offer_slug ? String(args.offer_slug) : undefined,
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
    }

    case "get_available_slots": {
      const rawLimit = args.limit !== undefined ? Number(args.limit) : 3;
      const limit = Math.min(Math.max(1, rawLimit), 5);

      const config = resolveConfig({ envVars: process.env });
      const db = openCliDb(config);
      try {
        const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const slots = db
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
        db.close();
      }
    }

    case "create_booking": {
      const slotId = String(args.slot_id ?? "");
      const email = String(args.email ?? "");
      const intakeRequestId = args.intake_request_id ? String(args.intake_request_id) : null;

      const config = resolveConfig({ envVars: process.env });
      const db = openCliDb(config);
      try {
        const slot = db
          .prepare(`SELECT id, status FROM maestro_availability WHERE id = ?`)
          .get(slotId) as { id: string; status: string } | undefined;

        if (!slot) return { error: "slot not found" };
        if (slot.status !== "OPEN") return { conflict: true, error: "slot already booked" };

        const bookingId = randomUUID();
        const now = new Date().toISOString();

        // intake_request_id may be null — use a placeholder if not provided
        // (booking still requires the FK; use a sentinel if missing)
        if (!intakeRequestId) {
          return {
            error:
              "intake_request_id required to create booking. Submit intake first via submit_intake.",
          };
        }

        db.prepare(
          `INSERT INTO bookings (id, intake_request_id, maestro_availability_id, prospect_email, status, created_at)
           VALUES (?, ?, ?, ?, 'PENDING', ?)`,
        ).run(bookingId, intakeRequestId, slotId, email, now);

        db.prepare(
          `UPDATE maestro_availability SET status = 'BOOKED' WHERE id = ?`,
        ).run(slotId);

        return { booking_id: bookingId, status: "PENDING" };
      } finally {
        db.close();
      }
    }

    default:
      return { error: `unknown tool: ${toolName}` };
  }
}
