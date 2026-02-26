import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getAccountReferral } from "../api/v1/account/referral/route";
import { GET as referralRedirect } from "../r/[code]/route";
import { POST as postIntake } from "../api/v1/intake/route";
import { GET as getAdminReferrals } from "../api/v1/admin/referrals/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e referrals attribution", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("creates a stable referral code for a member", async () => {
    const first = await getAccountReferral(
      new Request("http://localhost:3000/api/v1/account/referral", {
        headers: {
          cookie: fixture.userCookie,
        },
      }),
    );

    expect(first.status).toBe(200);
    const firstBody = await first.json();

    const second = await getAccountReferral(
      new Request("http://localhost:3000/api/v1/account/referral", {
        headers: {
          cookie: fixture.userCookie,
        },
      }),
    );

    expect(second.status).toBe(200);
    const secondBody = await second.json();

    expect(firstBody.code).toBeTruthy();
    expect(secondBody.code).toBe(firstBody.code);
    expect(secondBody.url).toBe(`/card?ref=${firstBody.code}`);
  });

  it("attributes intake conversion from referral cookie and increments click + conversion counts", async () => {
    const referralResponse = await getAccountReferral(
      new Request("http://localhost:3000/api/v1/account/referral", {
        headers: {
          cookie: fixture.userCookie,
        },
      }),
    );

    const referralBody = await referralResponse.json();
    const code = String(referralBody.code);

    const redirect = await referralRedirect(
      new Request(`http://localhost:3000/r/${code}`, {
        headers: {
          "user-agent": "vitest",
          referer: "http://localhost:3000/",
        },
      }),
      { params: Promise.resolve({ code }) },
    );

    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toContain("/card?ref=");

    const intake = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: `so_ref=${code}`,
        },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "Referral Lead",
          contact_email: "lead@example.com",
          goals: "Book a technical consult",
        }),
      }),
    );

    expect(intake.status).toBe(201);

    const adminReport = await getAdminReferrals(
      new Request("http://localhost:3000/api/v1/admin/referrals", {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
    );

    expect(adminReport).toBeDefined();
    expect(adminReport!.status).toBe(200);
    const reportBody = await adminReport!.json();

    const row = (reportBody.items as Array<{ user_email: string; code: string; clicks: number; conversions: number }>).find(
      (item) => item.user_email === "usera@example.com" && item.code === code,
    );

    expect(row).toBeTruthy();
    expect(row!.clicks).toBeGreaterThanOrEqual(1);
    expect(row!.conversions).toBeGreaterThanOrEqual(1);
  });
});
