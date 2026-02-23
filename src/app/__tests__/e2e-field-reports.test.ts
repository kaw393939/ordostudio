import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postFieldReport, GET as getMyFieldReports } from "../api/v1/account/field-reports/route";
import { GET as getAdminFieldReports } from "../api/v1/admin/field-reports/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e studio field reports", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("allows a member to submit a field report and list it", async () => {
    const createResponse = await postFieldReport(
      new Request("http://localhost:3000/api/v1/account/field-reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({
          event_slug: "published-open",
          key_insights: "Evaluation gates are where reliability lives.",
          models: "Observed teams standardize on a single model per workflow.",
          money: "Budgets moved from experimentation to repeatable eval runs.",
          people: "Enablement is the bottleneck: review standards beat heroics.",
          what_i_tried: "I applied a review rubric to an existing PR flow and found gaps.",
          client_advice: "Start with one workflow, add an eval checklist, then scale.",
        }),
      }),
    );

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.event_slug).toBe("published-open");

    const listResponse = await getMyFieldReports(
      new Request("http://localhost:3000/api/v1/account/field-reports", {
        headers: {
          cookie: fixture.userCookie,
        },
      }),
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.count).toBe(1);
    expect(listBody.items[0].event_slug).toBe("published-open");
  });

  it("exposes field reports to admin list", async () => {
    await postFieldReport(
      new Request("http://localhost:3000/api/v1/account/field-reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({
          event_slug: "published-open",
          key_insights: "AI workflows need standard gates.",
          models: "Focus on a small set of models for core tasks.",
          money: "Evals reduce expensive rework.",
          people: "Define roles and accountability.",
          what_i_tried: "I built a checklist for one workflow.",
          client_advice: "Codify the method; avoid tool churn fights.",
        }),
      }),
    );

    const adminListResponse = await getAdminFieldReports(
      new Request("http://localhost:3000/api/v1/admin/field-reports", {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
    );

    expect(adminListResponse).toBeDefined();
    expect(adminListResponse!.status).toBe(200);
    const adminBody = await adminListResponse!.json();
    expect(adminBody.count).toBe(1);
    expect(adminBody.items[0].user_email).toBe("usera@example.com");
  });
});
