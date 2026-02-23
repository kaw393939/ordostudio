import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getApiRoot } from "../api/v1/route";
import { GET as getMe } from "../api/v1/me/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { POST as postDeleteAccount } from "../api/v1/account/delete/route";
import { GET as getRegistrations } from "../api/v1/events/[slug]/registrations/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e compliance release", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("surfaces terms/privacy policy links in root and account flows", async () => {
    const root = await getApiRoot();
    expect(root.status).toBe(200);
    const rootBody = await root.json();
    expect(rootBody._links.terms.href).toBe("/terms");
    expect(rootBody._links.privacy.href).toBe("/privacy");
    expect(rootBody._links.account_delete.href).toBe("/api/v1/account/delete");

    const me = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(me.status).toBe(200);
    const meBody = await me.json();
    expect(meBody._links.terms.href).toBe("/terms");
    expect(meBody._links.privacy.href).toBe("/privacy");
    expect(meBody._links.account_delete.href).toBe("/api/v1/account/delete");
  });

  it("rejects explicit missing consent during registration", async () => {
    const denied = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "consent-denied@example.com",
          password: "Password123!",
          terms_accepted: false,
        }),
      }),
    );

    expect(denied.status).toBe(400);
    const deniedBody = await denied.json();
    expect(deniedBody.detail).toContain("acknowledgment");

    const accepted = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "consent-accepted@example.com",
          password: "Password123!",
          terms_accepted: true,
        }),
      }),
    );

    expect(accepted.status).toBe(201);
  });

  it("applies retention-safe account deletion by revoking access and cancelling registrations", async () => {
    const deleted = await postDeleteAccount(
      new Request("http://localhost:3000/api/v1/account/delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({ confirm_text: "DELETE" }),
      }),
    );

    expect(deleted.status).toBe(200);

    const meAfterDelete = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(meAfterDelete.status).toBe(401);

    const registrations = await getRegistrations(
      new Request("http://localhost:3000/api/v1/events/published-open/registrations", {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(registrations.status).toBe(200);
    const registrationsBody = await registrations.json();

    const deletedUserRegistration = registrationsBody.items.find(
      (item: { user_id: string; status: string }) => item.user_id === fixture.userId,
    );

    expect(deletedUserRegistration?.status).toBe("CANCELLED");
  });

  it("keeps escalation-only operations out of API discoverability surface", async () => {
    const root = await getApiRoot();
    expect(root.status).toBe(200);
    const body = await root.json();

    expect(body._links.db_backup).toBeUndefined();
    expect(body._links.db_restore).toBeUndefined();
    expect(body._links.auth_token_create).toBeUndefined();
  });
});
