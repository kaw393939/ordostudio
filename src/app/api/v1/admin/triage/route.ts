import { randomUUID } from "node:crypto";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { hal, problem } from "@/lib/api/response";
import { withRequestLogging } from "@/lib/api/request-logging";
import { withRateLimit } from "@/lib/api/rate-limit-wrapper";
import { triageRequest, buildTriageText } from "@/lib/llm-triage";
import {
  type TriageTicket,
  shouldAutoRespond,
  shouldEscalate,
  effectiveCategory,
  isValidCategory,
} from "@/lib/triage";
import { buildTriageResponseEmail } from "@/lib/triage-emails";
import { resolveConfig } from "@/platform/config";
import { openCliDb } from "@/platform/runtime";

/**
 * POST /api/v1/admin/triage
 *
 * Triages an intake request through the LLM pipeline.
 * Body: { intake_request_id: string }
 */
async function _POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user || !user.roles?.some((r: string) => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    return problem(
      { type: "https://lms-219.dev/problems/forbidden", title: "Forbidden", status: 403, detail: "Admin role required." },
      request,
    );
  }

  let body: { intake_request_id?: string };
  try {
    body = await request.json();
  } catch {
    return problem(
      { type: "https://lms-219.dev/problems/bad-request", title: "Bad Request", status: 400, detail: "Invalid JSON body." },
      request,
    );
  }

  if (!body.intake_request_id) {
    return problem(
      { type: "https://lms-219.dev/problems/bad-request", title: "Bad Request", status: 422, detail: "intake_request_id is required." },
      request,
    );
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const intake = db
      .prepare("SELECT id, goals, constraints, timeline, contact_name, contact_email, audience FROM intake_requests WHERE id = ?")
      .get(body.intake_request_id) as {
        id: string;
        goals: string;
        constraints: string | null;
        timeline: string | null;
        contact_name: string;
        contact_email: string;
        audience: string;
      } | undefined;

    if (!intake) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: "Intake request not found." },
        request,
      );
    }

    // Run LLM triage
    const text = buildTriageText(intake);
    const result = await triageRequest({ text, contactEmail: intake.contact_email, intakeRequestId: intake.id });

    // Store triage ticket
    const ticketId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO triage_tickets (
        id, intake_request_id, category, confidence, summary,
        recommended_action, priority, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticketId,
      intake.id,
      result.category,
      result.confidence,
      result.summary,
      result.recommended_action,
      result.priority,
      "triaged",
      now,
      now,
    );

    // Build ticket object
    const ticket: TriageTicket = {
      id: ticketId,
      intake_request_id: intake.id,
      category: result.category,
      confidence: result.confidence,
      summary: result.summary,
      recommended_action: result.recommended_action,
      priority: result.priority,
      status: "triaged",
      admin_override_category: null,
      admin_override_reason: null,
      overridden_by: null,
      overridden_at: null,
      created_at: now,
      updated_at: now,
    };

    // Determine actions
    const autoRespond = shouldAutoRespond(ticket);
    const escalate = shouldEscalate(ticket);
    let emailBuilt = false;

    if (autoRespond) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studioordo.com";
      const email = buildTriageResponseEmail(
        effectiveCategory(ticket),
        intake.contact_email,
        result.summary,
        baseUrl,
      );
      if (email) {
        emailBuilt = true;
        // In production, call sendEmailAsync(email) here
        db.prepare("UPDATE triage_tickets SET status = ?, updated_at = ? WHERE id = ?")
          .run("auto_responded", new Date().toISOString(), ticketId);
        ticket.status = "auto_responded";
      }
    }

    if (escalate) {
      db.prepare("UPDATE triage_tickets SET status = ?, updated_at = ? WHERE id = ?")
        .run("escalated", new Date().toISOString(), ticketId);
      ticket.status = "escalated";
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, actor_id, action, resource_type, resource_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      user.id,
      "triage.completed",
      "triage_ticket",
      ticketId,
      JSON.stringify({ category: result.category, confidence: result.confidence, auto_responded: emailBuilt, escalated: escalate }),
      now,
    );

    return hal(
      {
        ...ticket,
        auto_responded: emailBuilt,
        escalated: escalate,
      },
      {
        self: { href: `/api/v1/admin/triage/${ticketId}` },
        intake: { href: `/api/v1/intake/${intake.id}` },
      },
      { status: 201 },
    );
  } finally {
    db.close();
  }
}

/**
 * PATCH /api/v1/admin/triage
 *
 * Admin feedback: override the AI's category.
 * Body: { ticket_id, override_category, reason }
 */
async function _PATCH(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user || !user.roles?.some((r: string) => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    return problem(
      { type: "https://lms-219.dev/problems/forbidden", title: "Forbidden", status: 403, detail: "Admin role required." },
      request,
    );
  }

  let body: { ticket_id?: string; override_category?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return problem(
      { type: "https://lms-219.dev/problems/bad-request", title: "Bad Request", status: 400, detail: "Invalid JSON body." },
      request,
    );
  }

  if (!body.ticket_id || !body.override_category) {
    return problem(
      { type: "https://lms-219.dev/problems/bad-request", title: "Bad Request", status: 422, detail: "ticket_id and override_category required." },
      request,
    );
  }

  if (!isValidCategory(body.override_category)) {
    return problem(
      { type: "https://lms-219.dev/problems/bad-request", title: "Bad Request", status: 422, detail: `Invalid category: ${body.override_category}` },
      request,
    );
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const existing = db
      .prepare("SELECT id, category FROM triage_tickets WHERE id = ?")
      .get(body.ticket_id) as { id: string; category: string } | undefined;

    if (!existing) {
      return problem(
        { type: "https://lms-219.dev/problems/not-found", title: "Not Found", status: 404, detail: "Triage ticket not found." },
        request,
      );
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE triage_tickets SET
        admin_override_category = ?,
        admin_override_reason = ?,
        overridden_by = ?,
        overridden_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      body.override_category,
      body.reason ?? null,
      user.id,
      now,
      now,
      body.ticket_id,
    );

    // Audit log for feedback loop
    db.prepare(`
      INSERT INTO audit_log (id, actor_id, action, resource_type, resource_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      user.id,
      "triage.override",
      "triage_ticket",
      body.ticket_id,
      JSON.stringify({
        original_category: existing.category,
        override_category: body.override_category,
        reason: body.reason ?? null,
      }),
      now,
    );

    return hal(
      {
        ticket_id: body.ticket_id,
        original_category: existing.category,
        override_category: body.override_category,
        reason: body.reason ?? null,
        overridden_by: user.id,
        overridden_at: now,
      },
      {
        self: { href: `/api/v1/admin/triage/${body.ticket_id}` },
      },
    );
  } finally {
    db.close();
  }
}

export const POST = withRequestLogging(withRateLimit("admin:write", _POST));
export const PATCH = withRequestLogging(withRateLimit("admin:write", _PATCH));
