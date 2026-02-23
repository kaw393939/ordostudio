import { describe, expect, it } from "vitest";
import { AuditedEventRepository } from "../audited-event-repository";
import type { Event } from "../../../ports/repositories";
import { InMemoryEventRepository, InMemoryAuditSink } from "../../../ports/__tests__/in-memory-fakes";

describe("AuditedEventRepository", () => {
  it("records audit on create and update operations", () => {
    const inner = new InMemoryEventRepository();
    const audit = new InMemoryAuditSink();

    const repo = new AuditedEventRepository(inner, audit, {
      action: "api.event.create",
      requestId: "req-1",
      metadata: (args) => ({
        operation: args.operation,
        eventId: args.event.id,
        slug: args.event.slug,
        status: args.event.status,
      }),
    });

    const created: Event = {
      id: "e-1",
      slug: "spring",
      title: "Spring",
      start_at: "2026-04-01T10:00:00.000Z",
      end_at: "2026-04-01T11:00:00.000Z",
      timezone: "UTC",
      status: "DRAFT",
      capacity: 10,
      created_by: "u-1",
      created_at: "2026-02-01T00:00:00.000Z",
      updated_at: "2026-02-01T00:00:00.000Z",
    };

    repo.create(created);

    repo.update({
      ...created,
      status: "PUBLISHED",
      updated_at: "2026-02-02T00:00:00.000Z",
    });

    expect(audit.records).toHaveLength(2);
    expect(audit.records[0]).toMatchObject({
      action: "api.event.create",
      requestId: "req-1",
      targetType: "event",
      metadata: {
        operation: "create",
        eventId: "e-1",
        slug: "spring",
        status: "DRAFT",
      },
    });
    expect(audit.records[1]).toMatchObject({
      action: "api.event.create",
      requestId: "req-1",
      targetType: "event",
      metadata: {
        operation: "update",
        eventId: "e-1",
        slug: "spring",
        status: "PUBLISHED",
      },
    });
  });
});
