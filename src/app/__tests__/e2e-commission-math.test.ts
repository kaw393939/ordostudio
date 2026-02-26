import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import { POST as postRegister } from "../api/v1/auth/register/route";
import { POST as postPayoutActivate } from "../api/v1/account/payout-activate/route";
import { GET as getAccountReferral } from "../api/v1/account/referral/route";
import { POST as postIntake } from "../api/v1/intake/route";

import { AFFILIATE_COMMISSION_RATE } from "../../lib/constants/commissions";
import { getReferralAdminReport } from "../../lib/api/referrals";
import { ensureLedgerEarnedForDeliveredDeal } from "../../lib/api/ledger";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e commission math and attribution", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("Test 1: AFFILIATE_COMMISSION_RATE constant is 0.20", () => {
    expect(AFFILIATE_COMMISSION_RATE).toBe(0.20);
  });

  it("Test 2: admin report calculates commission at 20%", () => {
    // Directly insert referral code, intake, proposal, conversion into the DB
    const db = new Database(fixture.dbPath);
    const now = new Date().toISOString();

    // Get the user's referral code (created during fixture setup if pre-creation works,
    // or insert directly)
    const existingCode = db
      .prepare("SELECT * FROM referral_codes WHERE user_id = ?")
      .get(fixture.userId) as { id: string; code: string } | undefined;

    let codeId: string;
    let codeStr: string;
    if (existingCode) {
      codeId = existingCode.id;
      codeStr = existingCode.code;
    } else {
      codeId = randomUUID();
      codeStr = "TESTCODE";
      db.prepare(
        "INSERT INTO referral_codes (id, user_id, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).run(codeId, fixture.userId, codeStr, now, now);
    }

    // Create an intake request
    const intakeId = randomUUID();
    db.prepare(
      `INSERT INTO intake_requests (id, audience, contact_name, contact_email, goals, status, priority, created_at, updated_at)
       VALUES (?, 'INDIVIDUAL', 'Test Lead', 'testlead@example.com', 'Training inquiry', 'NEW', 0, ?, ?)`
    ).run(intakeId, now, now);

    // Create a referral conversion linking the intake to the code
    db.prepare(
      `INSERT INTO referral_conversions (id, referral_code_id, conversion_type, intake_request_id, created_at)
       VALUES (?, ?, 'INTAKE_REQUEST', ?, ?)`
    ).run(randomUUID(), codeId, intakeId, now);

    // Create a proposal with status ACCEPTED and amount_cents = 1,000,000 ($10,000)
    const proposalId = randomUUID();
    db.prepare(
      `INSERT INTO proposals (id, intake_request_id, client_email, title, amount_cents, currency, status, created_at, updated_at)
       VALUES (?, ?, 'testlead@example.com', 'Test Proposal', 1000000, 'USD', 'ACCEPTED', ?, ?)`
    ).run(proposalId, intakeId, now, now);

    db.close();

    // Get the report and check commission
    const report = getReferralAdminReport();
    const userRow = report.items.find((r) => r.user_id === fixture.userId);
    expect(userRow).toBeTruthy();
    // $10,000 at 20% = $2,000 = 200,000 cents
    expect(userRow!.commission_owed_cents).toBe(200000);
  });

  it("Test 3: referral code pre-exists immediately after registration", async () => {
    // Register a brand new user
    const email = `newuser-${Date.now()}@example.com`;
    const registerRes = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email,
          password: "Password123!",
          terms_accepted: true,
        }),
      }),
    );
    expect(registerRes.status).toBe(201);
    const registered = await registerRes.json();
    const newUserId = registered.id as string;

    // Check DB for referral code
    const db = new Database(fixture.dbPath);
    const row = db
      .prepare("SELECT * FROM referral_codes WHERE user_id = ?")
      .get(newUserId) as { code: string } | undefined;
    db.close();

    expect(row).toBeTruthy();
  });

  it("Test 4: unapproved user gets attributed conversion (code works before affiliate approval)", async () => {
    // User has USER role only (no AFFILIATE yet)
    // Get referral code for the user
    const referralRes = await getAccountReferral(
      new Request("http://localhost:3000/api/v1/account/referral", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(referralRes.status).toBe(200);
    const { code } = await referralRes.json();

    // Submit intake with the user's referral code
    const intakeRes = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: `so_ref=${code}`,
        },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "Test Client",
          contact_email: "testclient-attribution@example.com",
          goals: "Exploration",
        }),
      }),
    );
    expect(intakeRes.status).toBe(201);

    // Assert referral_conversions row exists for this code owner
    const db = new Database(fixture.dbPath);
    const codeRow = db
      .prepare("SELECT id FROM referral_codes WHERE user_id = ?")
      .get(fixture.userId) as { id: string };
    const conversion = db
      .prepare("SELECT * FROM referral_conversions WHERE referral_code_id = ?")
      .get(codeRow.id);
    db.close();

    expect(conversion).toBeTruthy();

    // Commission is tracked in admin report (may be 0 since no accepted proposal)
    const report = getReferralAdminReport();
    const userRow = report.items.find((r) => r.user_id === fixture.userId);
    expect(userRow).toBeTruthy();
    expect(userRow!.conversions).toBeGreaterThanOrEqual(1);
  });

  it("Test 5: payout-activate returns 422 for missing required fields", async () => {
    const res = await postPayoutActivate(
      new Request("http://localhost:3000/api/v1/account/payout-activate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("Test 6: payout-activate writes tax info to DB and returns 502 (Stripe not configured in test)", async () => {
    // In test environment, Stripe is not configured, so we expect a 502 from the Stripe call.
    // But we can verify that the DB write happens before the Stripe call.
    const res = await postPayoutActivate(
      new Request("http://localhost:3000/api/v1/account/payout-activate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({
          legal_name: "Test Legal Name",
          entity_type: "INDIVIDUAL",
          address_line1: "123 Main St",
          city: "New York",
          state: "NY",
          postal_code: "10001",
          country: "US",
        }),
      }),
    );

    // 200 if Stripe is mocked/stubbed, 502 if not — we check both cases
    expect([200, 502]).toContain(res.status);

    // Regardless of Stripe result, payout_tax_info should be written before the Stripe call
    const db = new Database(fixture.dbPath);
    const taxInfo = db
      .prepare("SELECT * FROM payout_tax_info WHERE user_id = ?")
      .get(fixture.userId) as { legal_name: string; entity_type: string } | undefined;
    db.close();

    expect(taxInfo).toBeTruthy();
    expect(taxInfo!.legal_name).toBe("Test Legal Name");
    expect(taxInfo!.entity_type).toBe("INDIVIDUAL");

    // Verify audit log was written
    const auditDb = new Database(fixture.dbPath);
    const auditRow = auditDb
      .prepare("SELECT * FROM audit_log WHERE actor_id = ? AND action = 'api.payout.taxinfo.submit'")
      .get(fixture.userId);
    auditDb.close();
    expect(auditRow).toBeTruthy();
  });

  it("Test 7: ledger REFERRER_COMMISSION amount matches referral report commission (cross-path parity)", () => {
    const db = new Database(fixture.dbPath);
    const now = new Date().toISOString();
    const dealId = randomUUID();
    const proposalId = randomUUID();
    const grossCents = 250000; // $2,500

    // Get or create referral code for the fixture user
    let codeId: string;
    const existingCode = db
      .prepare("SELECT id FROM referral_codes WHERE user_id = ?")
      .get(fixture.userId) as { id: string } | undefined;
    if (existingCode) {
      codeId = existingCode.id;
    } else {
      codeId = randomUUID();
      db.prepare(
        "INSERT INTO referral_codes (id, user_id, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run(codeId, fixture.userId, "PARITYTEST", now, now);
    }

    // Create an accepted proposal so the referral report counts this gross amount
    const intakeId = randomUUID();
    db.prepare(
      `INSERT INTO intake_requests (id, audience, contact_name, contact_email, goals, status, priority, created_at, updated_at)
       VALUES (?, 'INDIVIDUAL', 'Parity Test', 'parity@example.com', 'Testing', 'NEW', 0, ?, ?)`,
    ).run(intakeId, now, now);
    db.prepare(
      `INSERT INTO referral_conversions (id, referral_code_id, conversion_type, intake_request_id, created_at)
       VALUES (?, ?, 'INTAKE_REQUEST', ?, ?)`,
    ).run(randomUUID(), codeId, intakeId, now);
    db.prepare(
      `INSERT INTO proposals (id, intake_request_id, client_email, title, amount_cents, currency, status, created_at, updated_at)
       VALUES (?, ?, 'parity@example.com', 'Parity Proposal', ?, 'USD', 'ACCEPTED', ?, ?)`,
    ).run(proposalId, intakeId, grossCents, now, now);
    db.close();

    // Create an offer + deal so ensureLedgerEarnedForDeliveredDeal can run
    const offerDb = new Database(fixture.dbPath);
    offerDb.prepare(
      "INSERT INTO offers (id, slug, title, summary, price_cents, currency, status, audience, delivery_mode, booking_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'USD', 'ACTIVE', 'INDIVIDUAL', 'ONLINE', 'https://example.com', ?, ?)",
    ).run(randomUUID(), "parity-offer", "Parity Offer", "Parity offer summary", grossCents, now, now);
    offerDb.prepare(
      "INSERT INTO deals (id, intake_id, offer_slug, referrer_user_id, provider_user_id, status, created_at, updated_at) VALUES (?, ?, 'parity-offer', ?, NULL, 'DELIVERED', ?, ?)",
    ).run(dealId, intakeId, fixture.userId, now, now);
    offerDb.close();

    // Run the ledger path
    process.env.APPCTL_ENV = "local";
    const ledgerRunDb = new Database(fixture.dbPath);
    ensureLedgerEarnedForDeliveredDeal(ledgerRunDb as never, {
      dealId,
      actorRequestId: randomUUID(),
    });
    ledgerRunDb.close();

    // Get actual ledger entry for referrer commission
    const ledgerDb = new Database(fixture.dbPath);
    const ledgerRow = ledgerDb
      .prepare(
        "SELECT amount_cents FROM ledger_entries WHERE deal_id = ? AND entry_type = 'REFERRER_COMMISSION'",
      )
      .get(dealId) as { amount_cents: number } | undefined;
    ledgerDb.close();

    expect(ledgerRow).toBeDefined();

    // Get referral report commission for this user
    const report = getReferralAdminReport();
    const userRow = report.items.find((r) => r.user_id === fixture.userId);
    expect(userRow).toBeDefined();

    // Cross-path parity: ledger entry amount must equal report commission
    expect(ledgerRow!.amount_cents).toBe(userRow!.commission_owed_cents);
  });
});
