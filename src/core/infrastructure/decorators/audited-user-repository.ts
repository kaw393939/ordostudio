import { AuditSink, User, UserRepository } from "../../ports/repositories";

export class AuditedUserRepository implements UserRepository {
  constructor(
    private readonly inner: UserRepository,
    private readonly audit: AuditSink,
    private readonly context: {
      action: string;
      requestId: string;
      metadata?: (args: { operation: "create"; user: User }) => Record<string, unknown> | undefined;
    },
  ) {}

  findByEmail(email: string): User | undefined {
    return this.inner.findByEmail(email);
  }

  findByIdentifier(identifier: string): User | undefined {
    return this.inner.findByIdentifier(identifier);
  }

  create(user: User): void {
    this.inner.create(user);
    this.audit.record({
      action: this.context.action,
      requestId: this.context.requestId,
      targetType: "system",
      metadata: this.context.metadata?.({ operation: "create", user }),
    });
  }
}
