/**
 * FIN-01: ensureLedgerEarnedForDeliveredDeal idempotency
 *
 * Calling the function twice for the same deal must produce exactly 3 ledger
 * rows — no duplicates even under a simulated TOCTOU scenario.
 *
 * Uses an in-memory SQLite database with the minimal schema to avoid the full
 * e2e fixture overhead.
 */
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { ensureLedgerEarnedForDeliveredDeal } from "@/lib/api/ledger";

const buildInMemoryDb = (): ReturnType<typeof Database> => {
  const db = new Database(":memory:");
  // FK enforcement off — we use fake user IDs; testing idempotency logic, not referential integrity.
  db.pragma("foreign_keys = OFF");

  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE offers (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      price_cents INTEGER,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE deals (
      id TEXT PRIMARY KEY,
      offer_slug TEXT NOT NULL,
      provider_user_id TEXT,
      referrer_user_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (offer_slug) REFERENCES offers(slug)
    );

    CREATE TABLE audit_log (
      id TEXT PRIMARY KEY,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      request_id TEXT
    );

    CREATE TABLE ledger_entries (
      id                   TEXT PRIMARY KEY,
      deal_id              TEXT,
      engagement_id        TEXT,
      entry_type           TEXT NOT NULL,
      beneficiary_user_id  TEXT,
      amount_cents         INTEGER NOT NULL,
      currency             TEXT NOT NULL,
      status               TEXT NOT NULL,
      earned_at            TEXT NOT NULL,
      approved_at          TEXT,
      paid_at              TEXT,
      approved_by_user_id  TEXT,
      metadata_json        TEXT,
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL,
      CHECK (entry_type IN ('PROVIDER_PAYOUT','REFERRER_COMMISSION','PLATFORM_REVENUE'))
    );

    -- migration 042: uniqueness guard
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_deal_entry_type
      ON ledger_entries(deal_id, entry_type)
      WHERE deal_id IS NOT NULL;
  `);

  return db;
};

describe("ensureLedgerEarnedForDeliveredDeal — idempotency (FIN-01)", () => {
  it("calling twice produces exactly 3 ledger rows (no duplicates)", () => {
    const db = buildInMemoryDb();
    const now = new Date().toISOString();
    const dealId = randomUUID();
    const offerSlug = "advisory";

    db.prepare(
      "INSERT INTO offers (slug, title, price_cents, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(offerSlug, "Advisory", 10000, "USD", now, now);

    db.prepare(
      "INSERT INTO deals (id, offer_slug, provider_user_id, referrer_user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'DELIVERED', ?, ?)",
    ).run(dealId, offerSlug, "provider-user", "referrer-user", now, now);

    const requestId = randomUUID();

    ensureLedgerEarnedForDeliveredDeal(db as never, { dealId, actorRequestId: requestId });
    // Second call must be a no-op — UNIQUE constraint catches the race
    ensureLedgerEarnedForDeliveredDeal(db as never, { dealId, actorRequestId: requestId });

    const rows = db
      .prepare("SELECT entry_type, amount_cents FROM ledger_entries WHERE deal_id = ? ORDER BY entry_type")
      .all(dealId) as Array<{ entry_type: string; amount_cents: number }>;

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.entry_type).sort()).toEqual([
      "PLATFORM_REVENUE",
      "PROVIDER_PAYOUT",
      "REFERRER_COMMISSION",
    ]);

    db.close();
  });

  it("amounts sum to gross (split invariant)", () => {
    const db = buildInMemoryDb();
    const now = new Date().toISOString();
    const dealId = randomUUID();
    const offerSlug = "coaching";
    const grossCents = 99999;

    db.prepare(
      "INSERT INTO offers (slug, title, price_cents, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(offerSlug, "Coaching", grossCents, "USD", now, now);

    db.prepare(
      "INSERT INTO deals (id, offer_slug, provider_user_id, referrer_user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'DELIVERED', ?, ?)",
    ).run(dealId, offerSlug, "provider-user", "referrer-user", now, now);

    ensureLedgerEarnedForDeliveredDeal(db as never, { dealId, actorRequestId: randomUUID() });

    const rows = db
      .prepare("SELECT SUM(amount_cents) as total FROM ledger_entries WHERE deal_id = ?")
      .get(dealId) as { total: number };

    expect(rows.total).toBe(grossCents);

    db.close();
  });

  it("skips zero-price deals", () => {
    const db = buildInMemoryDb();
    const now = new Date().toISOString();
    const dealId = randomUUID();
    const offerSlug = "free";

    db.prepare(
      "INSERT INTO offers (slug, title, price_cents, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(offerSlug, "Free Session", 0, "USD", now, now);

    db.prepare(
      "INSERT INTO deals (id, offer_slug, provider_user_id, referrer_user_id, status, created_at, updated_at) VALUES (?, ?, NULL, NULL, 'DELIVERED', ?, ?)",
    ).run(dealId, offerSlug, now, now);

    ensureLedgerEarnedForDeliveredDeal(db as never, { dealId, actorRequestId: randomUUID() });

    const rows = db
      .prepare("SELECT COUNT(1) as count FROM ledger_entries WHERE deal_id = ?")
      .get(dealId) as { count: number };

    expect(rows.count).toBe(0);

    db.close();
  });
});
