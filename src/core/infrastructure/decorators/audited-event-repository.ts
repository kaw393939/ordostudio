import { AuditSink, Event, EventRepository } from "../../ports/repositories";

export class AuditedEventRepository implements EventRepository {
  constructor(
    private readonly inner: EventRepository,
    private readonly audit: AuditSink,
    private readonly context: {
      action: string;
      requestId: string;
      metadata?: (args: { operation: "create" | "update"; event: Event }) => Record<string, unknown> | undefined;
    },
  ) {}

  findBySlug(slug: string): Event | undefined {
    return this.inner.findBySlug(slug);
  }

  create(event: Event): void {
    this.inner.create(event);
    this.audit.record({
      action: this.context.action,
      requestId: this.context.requestId,
      targetType: "event",
      metadata: this.context.metadata?.({ operation: "create", event }),
    });
  }

  update(event: Event): void {
    this.inner.update(event);
    this.audit.record({
      action: this.context.action,
      requestId: this.context.requestId,
      targetType: "event",
      metadata: this.context.metadata?.({ operation: "update", event }),
    });
  }

  countActiveRegistrations(eventId: string): number {
    return this.inner.countActiveRegistrations(eventId);
  }
}
