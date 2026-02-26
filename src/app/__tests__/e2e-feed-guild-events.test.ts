import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import { POST as postRoleRequest } from "../api/v1/roles/request/route";
import { PATCH as patchAdminRoleRequest } from "../api/v1/admin/role-requests/[id]/route";
import { GET as getFeed } from "../api/v1/me/feed/route";
import { GET as getAccountReferral } from "../api/v1/account/referral/route";
import { POST as postIntake } from "../api/v1/intake/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { writeFeedEvent } from "../../lib/api/feed-events";
import { openCliDb } from "../../platform/runtime";
import { resolveConfig } from "../../platform/config";

let fixture: StandardE2EFixture;

const addAffiliateRole = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  const role = db.prepare("SELECT id FROM roles WHERE name = 'AFFILIATE'").get() as { id: string };
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
  db.close();
};

describe("e2e feed guild events", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("Test 1: role request submission creates a RoleRequestUpdate feed item with pending review title", async () => {
    const roleReqRes = await postRoleRequest(
      new Request("http://localhost:3000/api/v1/roles/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({ requested_role_name: "AFFILIATE" }),
      }),
    );
    expect(roleReqRes.status).toBe(201);

    const feedRes = await getFeed(
      new Request("http://localhost:3000/api/v1/me/feed", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(feedRes.status).toBe(200);
    const feedBody = await feedRes.json();
    const items = feedBody.items as Array<{ type: string; title: string }>;

    const feedItem = items.find((i) => i.type === "RoleRequestUpdate");
    expect(feedItem).toBeTruthy();
    expect(feedItem!.title.toLowerCase()).toContain("pending");
  });

  it("Test 2: role request approval creates a RoleRequestUpdate feed item with approved title", async () => {
    // Submit role request
    const roleReqRes = await postRoleRequest(
      new Request("http://localhost:3000/api/v1/roles/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({ requested_role_name: "AFFILIATE" }),
      }),
    );
    expect(roleReqRes.status).toBe(201);
    const roleReqBody = await roleReqRes.json();
    const requestId = roleReqBody.id as string;

    // Admin approves
    const approveRes = await patchAdminRoleRequest(
      new Request(`http://localhost:3000/api/v1/admin/role-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ status: "APPROVED" }),
      }),
      { params: Promise.resolve({ id: requestId }) },
    );
    expect(approveRes.status).toBe(200);

    // Check user's feed
    const feedRes = await getFeed(
      new Request("http://localhost:3000/api/v1/me/feed", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(feedRes.status).toBe(200);
    const feedBody = await feedRes.json();
    const items = feedBody.items as Array<{ type: string; title: string }>;

    // Expect approval event (most recent RoleRequestUpdate should be the approval)
    const approvedItems = items.filter((i) => i.type === "RoleRequestUpdate");
    expect(approvedItems.length).toBeGreaterThanOrEqual(1);
    const approvedItem = approvedItems.find((i) => i.title.toLowerCase().includes("approved"));
    expect(approvedItem).toBeTruthy();
  });

  it("Test 3: affiliate user with no Stripe Connect gets FollowUpAction to activate payout", async () => {
    // Add AFFILIATE role directly in DB (roles re-read from DB on every request)
    addAffiliateRole(fixture.dbPath, "usera@example.com");

    const feedRes = await getFeed(
      new Request("http://localhost:3000/api/v1/me/feed", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(feedRes.status).toBe(200);
    const feedBody = await feedRes.json();
    const items = feedBody.items as Array<{ type: string; title: string }>;

    const payoutItem = items.find((i) => i.type === "FollowUpAction" && i.title === "Activate your payout account.");
    expect(payoutItem).toBeTruthy();
  });

  it("Test 4: payout FollowUpAction disappears when stripe connect payouts_enabled is true", async () => {
    // Add AFFILIATE role
    addAffiliateRole(fixture.dbPath, "usera@example.com");

    // Insert a stripe_connect_accounts row with payouts_enabled = 1
    const db = new Database(fixture.dbPath);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO stripe_connect_accounts
       (user_id, provider, stripe_account_id, status, details_submitted, charges_enabled, payouts_enabled, created_at, updated_at)
       VALUES (?, 'STRIPE', ?, 'COMPLETE', 1, 1, 1, ?, ?)`
    ).run(fixture.userId, `acct_test_${randomUUID().replace(/-/g, "").slice(0, 16)}`, now, now);
    db.close();

    const feedRes = await getFeed(
      new Request("http://localhost:3000/api/v1/me/feed", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(feedRes.status).toBe(200);
    const feedBody = await feedRes.json();
    const items = feedBody.items as Array<{ type: string; title: string }>;

    const payoutItem = items.find((i) => i.type === "FollowUpAction" && i.title === "Activate your payout account.");
    expect(payoutItem).toBeUndefined();
  });

  it("Test 5: referral conversion creates a ReferralActivity feed item for the code owner", async () => {
    // Get referral code for the user
    const referralRes = await getAccountReferral(
      new Request("http://localhost:3000/api/v1/account/referral", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(referralRes.status).toBe(200);
    const referralBody = await referralRes.json();
    const code = String(referralBody.code);

    // Submit intake with so_ref cookie (simulates referral conversion)
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
          contact_name: "Referred Lead",
          contact_email: "referred-lead@example.com",
          goals: "Explore training options",
        }),
      }),
    );
    expect(intakeRes.status).toBe(201);

    // Check feed for code owner
    const feedRes = await getFeed(
      new Request("http://localhost:3000/api/v1/me/feed", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(feedRes.status).toBe(200);
    const feedBody = await feedRes.json();
    const items = feedBody.items as Array<{ type: string; title: string; description?: string }>;

    const referralItem = items.find((i) => i.type === "ReferralActivity");
    expect(referralItem).toBeTruthy();
  });

  it("Test 6: referral conversion feed item contains no lead PII (no email, no name)", async () => {
    // Get referral code
    const referralRes = await getAccountReferral(
      new Request("http://localhost:3000/api/v1/account/referral", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    const referralBody = await referralRes.json();
    const code = String(referralBody.code);

    // Submit intake with PII
    await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: `so_ref=${code}`,
        },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "Secret Name",
          contact_email: "secret-email@example.com",
          goals: "Private inquiry",
        }),
      }),
    );

    const feedRes = await getFeed(
      new Request("http://localhost:3000/api/v1/me/feed", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    const feedBody = await feedRes.json();
    const items = feedBody.items as Array<{ type: string; title: string; description?: string }>;

    const referralItem = items.find((i) => i.type === "ReferralActivity");
    expect(referralItem).toBeTruthy();

    // Assert no PII in the feed item
    const serialized = JSON.stringify(referralItem);
    expect(serialized).not.toContain("secret-email@example.com");
    expect(serialized).not.toContain("Secret Name");
  });

  it("Test 7: PayoutStatus feed item appears in feed after payout account activates", async () => {
    // Write a PayoutStatus feed event directly (simulates what stripe-connect.ts does on transition)
    const db = openCliDb(resolveConfig({ envVars: process.env }));
    try {
      writeFeedEvent(db, {
        userId: fixture.userId,
        type: "PayoutStatus",
        title: "Payout account active.",
        description: "Your Stripe Connect account is now enabled for payouts.",
      });
    } finally {
      db.close();
    }

    const feedRes = await getFeed(
      new Request("http://localhost:3000/api/v1/me/feed", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(feedRes.status).toBe(200);
    const feedBody = await feedRes.json();
    const items = feedBody.items as Array<{ type: string; title: string }>;

    const payoutStatusItem = items.find((i) => i.type === "PayoutStatus");
    expect(payoutStatusItem).toBeTruthy();
    expect(payoutStatusItem!.title).toBe("Payout account active.");
  });
});
