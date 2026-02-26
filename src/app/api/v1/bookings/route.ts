/**
 * POST /api/v1/bookings
 *
 * Creates a consultation booking and marks the slot as BOOKED.
 * Returns 409 if the slot is already taken.
 */

import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { withRequestLogging } from "@/lib/api/request-logging";

interface BookingBody {
  slot_id?: unknown;
  email?: unknown;
  intake_request_id?: unknown;
}

async function _POST(request: NextRequest) {
  let body: BookingBody;
  try {
    body = (await request.json()) as BookingBody;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const slotId = typeof body.slot_id === "string" ? body.slot_id.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const intakeRequestId =
    typeof body.intake_request_id === "string" ? body.intake_request_id.trim() : null;

  if (!slotId) return Response.json({ error: "slot_id is required" }, { status: 400 });
  if (!email) return Response.json({ error: "email is required" }, { status: 400 });
  if (!intakeRequestId)
    return Response.json({ error: "intake_request_id is required" }, { status: 400 });

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const slot = db
      .prepare(`SELECT id FROM maestro_availability WHERE id = ?`)
      .get(slotId) as { id: string } | undefined;

    if (!slot) {
      return Response.json({ error: "slot not found" }, { status: 404 });
    }

    const intakeExists = db
      .prepare(`SELECT id FROM intake_requests WHERE id = ?`)
      .get(intakeRequestId) as { id: string } | undefined;

    if (!intakeExists) {
      return Response.json({ error: "intake_request_id not found" }, { status: 422 });
    }

    const bookingId = randomUUID();
    const now = new Date().toISOString();

    // Atomic check-and-book: prevents double-booking under concurrent requests.
    const book = db.transaction(() => {
      const fresh = db
        .prepare(`SELECT status FROM maestro_availability WHERE id = ?`)
        .get(slotId) as { status: string } | undefined;

      if (!fresh || fresh.status !== "OPEN") {
        return { conflict: true, status: fresh?.status ?? "NOT_FOUND" };
      }

      db.prepare(
        `INSERT INTO bookings (id, intake_request_id, maestro_availability_id, prospect_email, status, created_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?)`,
      ).run(bookingId, intakeRequestId, slotId, email, now);

      db.prepare(`UPDATE maestro_availability SET status = 'BOOKED' WHERE id = ?`).run(slotId);

      return { conflict: false };
    });

    const result = book();
    if (result.conflict) {
      return Response.json(
        { error: "slot is no longer available", status: result.status },
        { status: 409 },
      );
    }

    return Response.json(
      {
        id: bookingId,
        intake_request_id: intakeRequestId,
        maestro_availability_id: slotId,
        prospect_email: email,
        status: "PENDING",
        created_at: now,
      },
      { status: 201 },
    );
  } finally {
    db.close();
  }
}

export const POST = withRequestLogging(_POST);
