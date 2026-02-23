import { AuditSink, Registration, RegistrationRepository } from "../../ports/repositories";

export class AuditedRegistrationRepository implements RegistrationRepository {
  constructor(
    private readonly inner: RegistrationRepository,
    private readonly audit: AuditSink,
    private readonly context: {
      action: string;
      requestId: string;
      metadata?: (args: {
        operation: "create" | "updateStatus";
        registration?: Registration;
        registrationId?: string;
        status?: Registration["status"];
      }) => Record<string, unknown> | undefined;
    },
  ) {}

  findByEventAndUser(eventId: string, userId: string): Registration | undefined {
    return this.inner.findByEventAndUser(eventId, userId);
  }

  create(registration: Registration): void {
    this.inner.create(registration);
    this.audit.record({
      action: this.context.action,
      requestId: this.context.requestId,
      targetType: "registration",
      metadata: this.context.metadata?.({
        operation: "create",
        registration,
      }),
    });
  }

  updateStatus(id: string, status: Registration["status"]): void {
    this.inner.updateStatus(id, status);
    this.audit.record({
      action: this.context.action,
      requestId: this.context.requestId,
      targetType: "registration",
      metadata: this.context.metadata?.({
        operation: "updateStatus",
        registrationId: id,
        status,
      }),
    });
  }
}
