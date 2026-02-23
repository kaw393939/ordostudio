import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postMeasureEvent } from "../api/v1/measure/events/route";
import { GET as getMeasurementAdmin } from "../api/v1/admin/measurement/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e measurement events", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("records measurement events and exposes admin summary", async () => {
    const record = async (key: string, path: string, cookie: string) => {
      const response = await postMeasureEvent(
        new Request("http://localhost:3000/api/v1/measure/events", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie,
          },
          body: JSON.stringify({ key, path }),
        }),
      );

      expect(response.status).toBe(204);
    };

    await record("PAGE_VIEW_HOME", "/", fixture.userCookie);
    await record("CTA_CLICK_VIEW_TRAINING_TRACKS", "/", fixture.userCookie);
    await record("PAGE_VIEW_SERVICES_REQUEST", "/services/request", fixture.userCookie);
    await record("FORM_START_CONSULT_REQUEST", "/services/request", fixture.userCookie);
    await record("FORM_SUBMIT_CONSULT_REQUEST_SUCCESS", "/services/request", fixture.userCookie);

    const adminResponse = await getMeasurementAdmin(
      new Request("http://localhost:3000/api/v1/admin/measurement", {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
    );

    expect(adminResponse.status).toBe(200);
    const body = (await adminResponse.json()) as {
      windows: {
        "7d": { totals: Array<{ event_key: string; count: number }> };
        "30d": { totals: Array<{ event_key: string; count: number }> };
      };
    };

    const totals7d = body.windows["7d"].totals;
    const byKey = new Map(totals7d.map((row) => [row.event_key, row.count]));

    expect(byKey.get("PAGE_VIEW_HOME")).toBe(1);
    expect(byKey.get("CTA_CLICK_VIEW_TRAINING_TRACKS")).toBe(1);
    expect(byKey.get("FORM_START_CONSULT_REQUEST")).toBe(1);
    expect(byKey.get("FORM_SUBMIT_CONSULT_REQUEST_SUCCESS")).toBe(1);
  });
});
