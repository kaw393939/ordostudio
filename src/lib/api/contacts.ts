/**
 * Sprint 37 — CRM Contacts Library
 *
 * Core CRUD for the contacts table.
 * Contacts are NOT users — they represent prospects/customers
 * at any lifecycle stage before (and after) account creation.
 */

import { randomUUID } from "crypto";
import type Database from "better-sqlite3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContactSource = "AGENT" | "FORM" | "REFERRAL" | "MANUAL";
export type ContactStatus = "LEAD" | "QUALIFIED" | "ONBOARDING" | "ACTIVE" | "CHURNED";

export interface ContactRecord {
  id: string;
  email: string;
  full_name: string | null;
  user_id: string | null;
  source: ContactSource;
  status: ContactStatus;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactWithIntakeCount extends ContactRecord {
  intake_count: number;
}

// ---------------------------------------------------------------------------
// Valid lifecycle transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<ContactStatus, readonly ContactStatus[]> = {
  LEAD: ["QUALIFIED", "CHURNED"],
  QUALIFIED: ["ONBOARDING", "CHURNED"],
  ONBOARDING: ["ACTIVE", "CHURNED"],
  ACTIVE: ["CHURNED"],
  CHURNED: [],
};

export function isValidTransition(from: ContactStatus, to: ContactStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// upsertContact
// ---------------------------------------------------------------------------

export function upsertContact(
  db: Database.Database,
  input: {
    email: string;
    fullName?: string | null;
    source: ContactSource;
    userId?: string | null;
  },
): ContactRecord {
  const now = new Date().toISOString();
  const email = input.email.trim().toLowerCase();

  const id = randomUUID();
  let row: ContactRecord;
  try {
    db.prepare(
      `INSERT INTO contacts (id, email, full_name, user_id, source, status, notes, assigned_to, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'LEAD', NULL, NULL, ?, ?)`,
    ).run(id, email, input.fullName?.trim() ?? null, input.userId ?? null, input.source, now, now);
    row = db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(id) as ContactRecord;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed: contacts.email")) {
      row = db.prepare(`SELECT * FROM contacts WHERE email = ?`).get(email) as ContactRecord;
    } else {
      throw err;
    }
  }

  // Update full_name if now known and wasn't before
  if (input.fullName && !row.full_name) {
    db.prepare(
      `UPDATE contacts SET full_name = ?, updated_at = ? WHERE email = ?`,
    ).run(input.fullName.trim(), now, email);
    return { ...row, full_name: input.fullName.trim(), updated_at: now };
  }
  return row;
}

// ---------------------------------------------------------------------------
// getContact — returns full record with intake count
// ---------------------------------------------------------------------------

export function getContact(
  db: Database.Database,
  id: string,
): ContactWithIntakeCount | null {
  const row = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM intake_requests WHERE contact_id = c.id) AS intake_count
       FROM contacts c
       WHERE c.id = ?`,
    )
    .get(id) as ContactWithIntakeCount | undefined;
  return row ?? null;
}

// ---------------------------------------------------------------------------
// listContacts — paginated with filters
// ---------------------------------------------------------------------------

export interface ListContactsInput {
  status?: string;
  source?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface ContactListResult {
  items: ContactWithIntakeCount[];
  total: number;
  limit: number;
  offset: number;
  page: number;
}

export function listContacts(
  db: Database.Database,
  filters: ListContactsInput = {},
): ContactListResult {
  const limit = Math.min(filters.limit ?? 25, 100);
  const page = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    conditions.push("c.status = ?");
    params.push(filters.status);
  }
  if (filters.source) {
    conditions.push("c.source = ?");
    params.push(filters.source);
  }
  if (filters.assignedTo) {
    conditions.push("c.assigned_to = ?");
    params.push(filters.assignedTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM contacts c ${where}`).get(...params) as {
      count: number;
    }
  ).count;

  const items = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM intake_requests WHERE contact_id = c.id) AS intake_count
       FROM contacts c
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as ContactWithIntakeCount[];

  return { items, total, limit, offset, page };
}

// ---------------------------------------------------------------------------
// updateContact — validates lifecycle transitions
// ---------------------------------------------------------------------------

export interface UpdateContactInput {
  status?: ContactStatus;
  notes?: string;
  assignedTo?: string | null;
  fullName?: string | null;
  userId?: string | null;
}

export class InvalidContactTransitionError extends Error {
  constructor(from: ContactStatus, to: ContactStatus) {
    super(`Invalid status transition from ${from} to ${to}`);
    this.name = "InvalidContactTransitionError";
  }
}

export function updateContact(
  db: Database.Database,
  id: string,
  input: UpdateContactInput,
): ContactRecord | null {
  const existing = db
    .prepare(`SELECT * FROM contacts WHERE id = ?`)
    .get(id) as ContactRecord | undefined;

  if (!existing) return null;

  // Validate lifecycle transition
  if (input.status && input.status !== existing.status) {
    if (!isValidTransition(existing.status, input.status)) {
      throw new InvalidContactTransitionError(existing.status, input.status);
    }
  }

  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [now];

  if (input.status !== undefined) {
    sets.push("status = ?");
    params.push(input.status);
  }
  if (input.notes !== undefined) {
    sets.push("notes = ?");
    params.push(input.notes);
  }
  if ("assignedTo" in input) {
    sets.push("assigned_to = ?");
    params.push(input.assignedTo ?? null);
  }
  if ("fullName" in input) {
    sets.push("full_name = ?");
    params.push(input.fullName ?? null);
  }
  if ("userId" in input) {
    sets.push("user_id = ?");
    params.push(input.userId ?? null);
  }

  params.push(id);
  db.prepare(`UPDATE contacts SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  return db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(id) as ContactRecord;
}
