import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getPublicApprentices } from "../api/v1/apprentices/route";
import { GET as getPublicApprenticeDetail } from "../api/v1/apprentices/[handle]/route";
import { GET as getAdminApprentices } from "../api/v1/admin/apprentices/route";
import { PATCH as patchAdminApprentice } from "../api/v1/admin/apprentices/[userId]/route";
import { PUT as putMyApprenticeProfile } from "../api/v1/account/apprentice-profile/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  addApprenticeRole,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

const requireResponse = (response: Response | undefined): Response => {
  if (!response) {
    throw new Error("Expected route handler to return a Response");
  }
  return response;
};

describe("e2e apprentice profiles", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("keeps profiles private until approved, and removes them when suspended", async () => {
    const initialPublicList = await getPublicApprentices(new Request("http://localhost:3000/api/v1/apprentices"));
    expect(initialPublicList.status).toBe(200);
    const initialBody = (await initialPublicList.json()) as { count: number };
    expect(initialBody.count).toBe(0);

    const createProfileResponse = await putMyApprenticeProfile(
      new Request("http://localhost:3000/api/v1/account/apprentice-profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({
          handle: "usera-consulting",
          display_name: "User A",
          headline: "AI delivery + eval gates",
          location: "NYC",
          website_url: "https://example.com/usera",
          tags: "evals, automation",
        }),
      }),
    );

    expect(createProfileResponse.status).toBe(200);

    const publicListBeforeApproval = await getPublicApprentices(new Request("http://localhost:3000/api/v1/apprentices"));
    expect(publicListBeforeApproval.status).toBe(200);
    const beforeApprovalBody = (await publicListBeforeApproval.json()) as { count: number };
    expect(beforeApprovalBody.count).toBe(0);

    const adminListResponse = requireResponse(
      await getAdminApprentices(
        new Request("http://localhost:3000/api/v1/admin/apprentices", {
          headers: {
            cookie: fixture.adminCookie,
          },
        }),
      ),
    );

    expect(adminListResponse.status).toBe(200);
    const adminListBody = (await adminListResponse.json()) as { items: Array<{ user_id: string; status: string }> };
    expect(adminListBody.items.some((item) => item.user_id === fixture.userId && item.status === "PENDING")).toBe(true);

    const approveResponse = requireResponse(
      await patchAdminApprentice(
        new Request(`http://localhost:3000/api/v1/admin/apprentices/${fixture.userId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ status: "APPROVED" }),
        }),
        { params: Promise.resolve({ userId: fixture.userId }) },
      ),
    );

    expect(approveResponse.status).toBe(200);

    addApprenticeRole(fixture.dbPath, "usera@example.com");

    const publicListAfterApproval = await getPublicApprentices(new Request("http://localhost:3000/api/v1/apprentices"));
    expect(publicListAfterApproval.status).toBe(200);
    const afterApprovalBody = (await publicListAfterApproval.json()) as {
      count: number;
      items: Array<{ handle: string }>;
    };

    expect(afterApprovalBody.count).toBe(1);
    expect(afterApprovalBody.items[0].handle).toBe("usera-consulting");

    const publicDetail = requireResponse(
      await getPublicApprenticeDetail(
        new Request("http://localhost:3000/api/v1/apprentices/usera-consulting"),
        { params: Promise.resolve({ handle: "usera-consulting" }) },
      ),
    );

    expect(publicDetail.status).toBe(200);

    const suspendResponse = requireResponse(
      await patchAdminApprentice(
        new Request(`http://localhost:3000/api/v1/admin/apprentices/${fixture.userId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ status: "SUSPENDED", reason: "test" }),
        }),
        { params: Promise.resolve({ userId: fixture.userId }) },
      ),
    );

    expect(suspendResponse.status).toBe(200);

    const publicListAfterSuspend = await getPublicApprentices(new Request("http://localhost:3000/api/v1/apprentices"));
    expect(publicListAfterSuspend.status).toBe(200);
    const afterSuspendBody = (await publicListAfterSuspend.json()) as { count: number };
    expect(afterSuspendBody.count).toBe(0);

    const publicDetailAfterSuspend = requireResponse(
      await getPublicApprenticeDetail(
        new Request("http://localhost:3000/api/v1/apprentices/usera-consulting"),
        { params: Promise.resolve({ handle: "usera-consulting" }) },
      ),
    );

    expect(publicDetailAfterSuspend.status).toBe(404);
  });
});
