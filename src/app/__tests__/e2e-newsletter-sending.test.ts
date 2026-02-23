import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { POST as postSubscribe } from "../api/v1/newsletter/subscribe/route";
import { POST as postUnsubscribe } from "../api/v1/newsletter/unsubscribe/route";

import { POST as postCreateNewsletter } from "../api/v1/admin/newsletter/route";
import { POST as postReviewNewsletter } from "../api/v1/admin/newsletter/[id]/review/route";
import { POST as postPublishNewsletter } from "../api/v1/admin/newsletter/[id]/publish/route";
import { POST as postScheduleNewsletter } from "../api/v1/admin/newsletter/[id]/schedule/route";

import { dispatchDueNewsletterRuns, listActiveNewsletterSubscribers } from "../../lib/api/newsletter";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

const requireResponse = (response: Response | undefined): Response => {
  if (!response) {
    throw new Error("Expected route handler to return a Response");
  }
  return response;
};

const publishIssue = async (issueId: string) => {
  const reviewResponse = requireResponse(
    await postReviewNewsletter(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${issueId}/review`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ id: issueId }) },
    ),
  );

  expect(reviewResponse.status).toBe(200);

  const publishResponse = requireResponse(
    await postPublishNewsletter(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${issueId}/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ confirm: "PUBLISH" }),
      }),
      { params: Promise.resolve({ id: issueId }) },
    ),
  );

  expect(publishResponse.status).toBe(200);
};

describe("e2e newsletter subscribers + scheduling + sending", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
    process.env.NEWSLETTER_EMAIL_PROVIDER = "console";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("supports subscribe/unsubscribe and enforces unsubscribe during dispatch", async () => {
    const subscribeResponse = await postSubscribe(
      new Request("http://localhost:3000/api/v1/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "test-subscriber@example.com" }),
      }),
    );

    expect(subscribeResponse.status).toBe(200);

    const db = new Database(fixture.dbPath);
    const subscriberCount = db
      .prepare("SELECT COUNT(*) as count FROM newsletter_subscribers WHERE email = ? AND status = 'ACTIVE'")
      .get("test-subscriber@example.com") as { count: number };
    expect(subscriberCount.count).toBe(1);
    db.close();

    const createIssueResponse = requireResponse(
      await postCreateNewsletter(
        new Request("http://localhost:3000/api/v1/admin/newsletter", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ title: "Ordo Brief", issue_date: "2026-09-09" }),
        }),
      ),
    );

    expect(createIssueResponse.status).toBe(201);
    const createdIssue = (await createIssueResponse.json()) as { id: string };

    await publishIssue(createdIssue.id);

    const nowIso = new Date().toISOString();
    const scheduleResponse = requireResponse(
      await postScheduleNewsletter(
        new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}/schedule`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ scheduled_for: nowIso }),
        }),
        { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(scheduleResponse.status).toBe(200);

    const dispatch = await dispatchDueNewsletterRuns({ nowIso });
    expect(dispatch.dispatched).toBe(1);

    const sentDb = new Database(fixture.dbPath);
    const run = sentDb
      .prepare("SELECT attempted_count, sent_count, bounced_count, sent_at FROM newsletter_send_runs WHERE issue_id = ?")
      .get(createdIssue.id) as { attempted_count: number; sent_count: number; bounced_count: number; sent_at: string | null };
    expect(run.attempted_count).toBe(1);
    expect(run.sent_count).toBe(1);
    expect(run.bounced_count).toBe(0);
    expect(run.sent_at).toBeTruthy();

    const events = sentDb
      .prepare(
        "SELECT COUNT(*) as count FROM newsletter_delivery_events e JOIN newsletter_send_runs r ON r.id = e.run_id WHERE r.issue_id = ?",
      )
      .get(createdIssue.id) as { count: number };
    expect(events.count).toBe(1);
    sentDb.close();

    const active = listActiveNewsletterSubscribers();
    expect(active.length).toBe(1);

    const unsubscribeResponse = await postUnsubscribe(
      new Request("http://localhost:3000/api/v1/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ token: active[0]!.unsubscribeToken }),
      }),
    );

    expect(unsubscribeResponse.status).toBe(200);

    const createSecondIssueResponse = requireResponse(
      await postCreateNewsletter(
        new Request("http://localhost:3000/api/v1/admin/newsletter", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ title: "Ordo Brief", issue_date: "2026-09-10" }),
        }),
      ),
    );

    expect(createSecondIssueResponse.status).toBe(201);
    const secondIssue = (await createSecondIssueResponse.json()) as { id: string };

    await publishIssue(secondIssue.id);

    const scheduleSecondResponse = requireResponse(
      await postScheduleNewsletter(
        new Request(`http://localhost:3000/api/v1/admin/newsletter/${secondIssue.id}/schedule`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ scheduled_for: nowIso }),
        }),
        { params: Promise.resolve({ id: secondIssue.id }) },
      ),
    );

    expect(scheduleSecondResponse.status).toBe(200);

    const secondDispatch = await dispatchDueNewsletterRuns({ nowIso });
    expect(secondDispatch.dispatched).toBe(1);

    const db2 = new Database(fixture.dbPath);
    const secondRun = db2
      .prepare("SELECT attempted_count, sent_count, bounced_count FROM newsletter_send_runs WHERE issue_id = ?")
      .get(secondIssue.id) as { attempted_count: number; sent_count: number; bounced_count: number };

    expect(secondRun.attempted_count).toBe(0);
    expect(secondRun.sent_count).toBe(0);
    expect(secondRun.bounced_count).toBe(0);
    db2.close();
  });

  it("enforces scheduling guardrail: issue must be published", async () => {
    const createIssueResponse = requireResponse(
      await postCreateNewsletter(
        new Request("http://localhost:3000/api/v1/admin/newsletter", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ title: "Draft Brief", issue_date: "2026-09-11" }),
        }),
      ),
    );

    expect(createIssueResponse.status).toBe(201);
    const issue = (await createIssueResponse.json()) as { id: string };

    const scheduleResponse = requireResponse(
      await postScheduleNewsletter(
        new Request(`http://localhost:3000/api/v1/admin/newsletter/${issue.id}/schedule`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({ scheduled_for: new Date().toISOString() }),
        }),
        { params: Promise.resolve({ id: issue.id }) },
      ),
    );

    expect(scheduleResponse.status).toBe(412);
  });
});
