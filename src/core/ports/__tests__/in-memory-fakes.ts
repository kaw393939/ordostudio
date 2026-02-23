/**
 * Centralized in-memory fakes for core port interfaces.
 *
 * Import from here instead of re-declaring fakes in every test file.
 * Each fake is a minimal, correct implementation suitable for unit tests.
 */
import type {
  AuditSink,
  Event,
  EventRepository,
  Registration,
  RegistrationRepository,
  User,
  UserRepository,
} from "@/core/ports/repositories";

/* ── UserRepository ───────────────────────────────── */

export class InMemoryUserRepository implements UserRepository {
  constructor(public users: User[] = []) {}

  findByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email === email);
  }

  findByIdentifier(identifier: string): User | undefined {
    if (identifier.includes("@")) {
      return this.findByEmail(identifier.toLowerCase());
    }
    return this.users.find((u) => u.id === identifier);
  }

  create(user: User): void {
    this.users.push(user);
  }
}

/* ── EventRepository ──────────────────────────────── */

export class InMemoryEventRepository implements EventRepository {
  constructor(
    public events: Event[] = [],
    private readonly registrations: Registration[] = [],
  ) {}

  findBySlug(slug: string): Event | undefined {
    return this.events.find((e) => e.slug === slug);
  }

  create(event: Event): void {
    this.events.push(event);
  }

  update(event: Event): void {
    const idx = this.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      this.events[idx] = event;
    }
  }

  countActiveRegistrations(eventId: string): number {
    return this.registrations.filter(
      (r) =>
        r.event_id === eventId &&
        (r.status === "REGISTERED" || r.status === "CHECKED_IN"),
    ).length;
  }
}

/* ── RegistrationRepository ───────────────────────── */

export class InMemoryRegistrationRepository implements RegistrationRepository {
  constructor(public registrations: Registration[] = []) {}

  findByEventAndUser(eventId: string, userId: string): Registration | undefined {
    return this.registrations.find(
      (r) => r.event_id === eventId && r.user_id === userId,
    );
  }

  create(registration: Registration): void {
    this.registrations.push(registration);
  }

  updateStatus(id: string, status: Registration["status"]): void {
    const existing = this.registrations.find((r) => r.id === id);
    if (existing) {
      existing.status = status;
    }
  }
}

/* ── AuditSink ────────────────────────────────────── */

export type AuditRecord = {
  action: string;
  requestId: string;
  targetType: "system" | "event" | "registration";
  metadata?: Record<string, unknown>;
};

export class InMemoryAuditSink implements AuditSink {
  public records: AuditRecord[] = [];

  record(args: AuditRecord): void {
    this.records.push(args);
  }
}
