import { describe, expect, it } from "vitest";
import { AuditedRegistrationRepository } from "../audited-registration-repository";
import { InMemoryRegistrationRepository, InMemoryAuditSink } from "../../../ports/__tests__/in-memory-fakes";

describe("AuditedRegistrationRepository", () => {
  it("records audit on create and updateStatus operations", () => {
    const inner = new InMemoryRegistrationRepository();
    const audit = new InMemoryAuditSink();

    const repo = new AuditedRegistrationRepository(inner, audit, {
      action: "api.registration.add",
      requestId: "req-1",
      metadata: (args) => ({
        operation: args.operation,
        registrationId: args.registration?.id ?? args.registrationId,
        status: args.registration?.status ?? args.status,
      }),
    });

    repo.create({
      id: "r-1",
      event_id: "e-1",
      user_id: "u-1",
      status: "REGISTERED",
    });

    repo.updateStatus("r-1", "CHECKED_IN");

    expect(audit.records).toHaveLength(2);
    expect(audit.records[0]).toMatchObject({
      action: "api.registration.add",
      requestId: "req-1",
      targetType: "registration",
      metadata: {
        operation: "create",
        registrationId: "r-1",
        status: "REGISTERED",
      },
    });
    expect(audit.records[1]).toMatchObject({
      action: "api.registration.add",
      requestId: "req-1",
      targetType: "registration",
      metadata: {
        operation: "updateStatus",
        registrationId: "r-1",
        status: "CHECKED_IN",
      },
    });
  });
});
