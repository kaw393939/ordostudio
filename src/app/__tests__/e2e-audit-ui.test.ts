import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getAudit } from "../api/v1/audit/route";
import { POST as postEvents } from "../api/v1/events/route";
import { POST as postPublish } from "../api/v1/events/[slug]/publish/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e audit ui", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("allows admin audit visibility with action and actor filters", async () => {
    const create = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          slug: "audit-ops-event",
          title: "Audit Ops Event",
          start: "2026-11-10T10:00:00.000Z",
          end: "2026-11-10T11:00:00.000Z",
          timezone: "UTC",
          capacity: 10,
        }),
      }),
    );
    expect(create.status).toBe(201);

    const publish = await postPublish(
      new Request("http://localhost:3000/api/v1/events/audit-ops-event/publish", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "audit-ops-event" }) },
    );
    expect(publish.status).toBe(200);

    const filtered = await getAudit(
      new Request(
        `http://localhost:3000/api/v1/audit?action=api.event.publish&actor_id=${fixture.adminId}&limit=20&offset=0`,
        {
          headers: {
            cookie: fixture.adminCookie,
          },
        },
      ),
    );

    expect(filtered.status).toBe(200);
    const body = await filtered.json();
    expect(body.count).toBeGreaterThan(0);
    expect(
      body.items.every(
        (item: { action: string; actor_id: string | null }) =>
          item.action === "api.event.publish" && item.actor_id === fixture.adminId,
      ),
    ).toBe(true);
  });

  it("denies non-admin users from reading audit entries", async () => {
    const response = await getAudit(
      new Request("http://localhost:3000/api/v1/audit", {
        headers: {
          cookie: fixture.userCookie,
        },
      }),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.type).toBe("https://lms-219.dev/problems/forbidden");
  });

  it("redacts sensitive metadata fields in audit output", async () => {
    const db = new Database(fixture.dbPath);
    db.prepare(
      `
INSERT INTO audit_log (
  id,
  actor_type,
  actor_id,
  action,
  target_type,
  target_id,
  metadata,
  created_at,
  request_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
    ).run(
      randomUUID(),
      "USER",
      fixture.adminId,
      "api.test.sensitive",
      "system",
      null,
      JSON.stringify({
        token: "abc123",
        password_hash: "hash-value",
        user_email: "private@example.com",
        nested: {
          secret: "hide-me",
          reason: "keep-visible",
        },
      }),
      new Date().toISOString(),
      randomUUID(),
    );
    db.close();

    const response = await getAudit(
      new Request("http://localhost:3000/api/v1/audit?action=api.test.sensitive", {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.count).toBeGreaterThan(0);

    const item = body.items[0] as {
      metadata: {
        token: string;
        password_hash: string;
        user_email: string;
        nested: { secret: string; reason: string };
      };
    };

    expect(item.metadata.token).toBe("[REDACTED]");
    expect(item.metadata.password_hash).toBe("[REDACTED]");
    expect(item.metadata.user_email).toBe("[REDACTED]");
    expect(item.metadata.nested.secret).toBe("[REDACTED]");
    expect(item.metadata.nested.reason).toBe("keep-visible");
  });
});
