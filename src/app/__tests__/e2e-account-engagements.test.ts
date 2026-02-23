import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getAccountEngagements } from "../api/v1/account/engagements/route";
import { GET as getEngagementArtifacts } from "../api/v1/account/engagements/[slug]/artifacts/route";
import { GET as getFollowUp } from "../api/v1/account/engagements/[slug]/follow-up/route";
import { POST as postEngagementFeedback } from "../api/v1/account/engagements/[slug]/feedback/route";
import { POST as postOutcome } from "../api/v1/events/[slug]/outcomes/route";
import { POST as postArtifact } from "../api/v1/events/[slug]/artifacts/route";
import { POST as postGenerateReminders } from "../api/v1/events/[slug]/follow-up/reminders/route";
import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e account engagements timeline and access", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("returns timeline rollups and enforces artifact scope controls", async () => {
    const outcome = (await postOutcome(
      new Request("http://localhost:3000/api/v1/events/published-open/outcomes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          title: "Published Open Session",
          session_at: "2026-09-01T11:00:00.000Z",
          outcomes: ["Delivered workshop"],
          action_items: [{ description: "Complete reflection form", due_at: "2026-01-01T00:00:00.000Z" }],
        }),
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    ))!;
    expect(outcome.status).toBe(201);

    const reminders = (await postGenerateReminders(
      new Request("http://localhost:3000/api/v1/events/published-open/follow-up/reminders", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    ))!;
    expect(reminders.status).toBe(200);

    const createPublicArtifact = (await postArtifact(
      new Request("http://localhost:3000/api/v1/events/published-open/artifacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          title: "Open engagement recap",
          resource_url: "https://example.com/open-recap.pdf",
          scope: "EVENT",
        }),
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    ))!;
    expect(createPublicArtifact.status).toBe(201);

    const createPrivateArtifact = (await postArtifact(
      new Request("http://localhost:3000/api/v1/events/published-open/artifacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          title: "User-specific notes",
          resource_url: "https://example.com/private-notes.pdf",
          scope: "USER",
          user_id: fixture.userId,
        }),
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    ))!;
    expect(createPrivateArtifact.status).toBe(201);

    const timeline = await getAccountEngagements(
      new Request("http://localhost:3000/api/v1/account/engagements", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(timeline.status).toBe(200);
    const timelineBody = await timeline.json();

    const publishedOpen = timelineBody.items.find((item: { event_slug: string }) => item.event_slug === "published-open");
    expect(publishedOpen).toBeTruthy();
    expect(publishedOpen.artifacts_count).toBe(2);
    expect(publishedOpen.open_action_items).toBeGreaterThan(0);
    expect(publishedOpen.pending_reminders).toBeGreaterThan(0);
    expect(["UPCOMING", "DELIVERED"]).toContain(publishedOpen.timeline_status);

    const followUp = await getFollowUp(
      new Request("http://localhost:3000/api/v1/account/engagements/published-open/follow-up", {
        headers: { cookie: fixture.userCookie },
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(followUp.status).toBe(200);
    const followUpBody = await followUp.json();
    expect(followUpBody.actions_count).toBeGreaterThan(0);
    expect(followUpBody.reminders_count).toBeGreaterThan(0);

    const artifacts = await getEngagementArtifacts(
      new Request("http://localhost:3000/api/v1/account/engagements/published-open/artifacts", {
        headers: { cookie: fixture.userCookie },
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(artifacts.status).toBe(200);
    const artifactsBody = await artifacts.json();
    expect(artifactsBody.count).toBe(2);

    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "outsider@example.com",
          password: "Password123!",
        }),
      }),
    );

    const outsiderLogin = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "outsider@example.com",
          password: "Password123!",
        }),
      }),
    );
    const outsiderCookie = (outsiderLogin.headers.get("set-cookie") ?? "").split(";")[0];

    const forbiddenArtifacts = await getEngagementArtifacts(
      new Request("http://localhost:3000/api/v1/account/engagements/published-open/artifacts", {
        headers: { cookie: outsiderCookie },
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(forbiddenArtifacts.status).toBe(403);

    const forbiddenFollowUp = await getFollowUp(
      new Request("http://localhost:3000/api/v1/account/engagements/published-open/follow-up", {
        headers: { cookie: outsiderCookie },
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(forbiddenFollowUp.status).toBe(403);
  });

  it("accepts feedback from authorized users and reflects submission status", async () => {
    const submit = await postEngagementFeedback(
      new Request("http://localhost:3000/api/v1/account/engagements/published-open/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({ rating: 5, comment: "Great facilitation" }),
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    expect(submit.status).toBe(200);

    const timeline = await getAccountEngagements(
      new Request("http://localhost:3000/api/v1/account/engagements", {
        headers: { cookie: fixture.userCookie },
      }),
    );
    expect(timeline.status).toBe(200);
    const timelineBody = await timeline.json();

    const item = timelineBody.items.find((entry: { event_slug: string }) => entry.event_slug === "published-open");
    expect(item.feedback_submitted).toBe(true);
  });

  it("rejects feedback from users without engagement access", async () => {
    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "viewer@example.com",
          password: "Password123!",
        }),
      }),
    );

    const viewerLogin = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "viewer@example.com",
          password: "Password123!",
        }),
      }),
    );
    const viewerCookie = (viewerLogin.headers.get("set-cookie") ?? "").split(";")[0];

    const response = await postEngagementFeedback(
      new Request("http://localhost:3000/api/v1/account/engagements/published-open/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: viewerCookie,
        },
        body: JSON.stringify({ rating: 3 }),
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );

    expect(response.status).toBe(403);
  });
});
