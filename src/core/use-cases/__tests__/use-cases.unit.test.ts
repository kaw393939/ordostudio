import { describe, expect, it } from "vitest";
import {
  CancelledRegistrationCheckinError,
  EventAlreadyExistsError,
  UserAlreadyExistsError,
} from "../../domain/errors";
import { InMemoryUserRepository, InMemoryEventRepository, InMemoryRegistrationRepository } from "../../ports/__tests__/in-memory-fakes";
import { checkInParticipant } from "../check-in-participant";
import { cancelEvent } from "../cancel-event";
import { createEvent } from "../create-event";
import { publishEvent } from "../publish-event";
import { removeParticipant } from "../remove-participant";
import { registerParticipant } from "../register-participant";
import { registerUser } from "../register-user";
import { updateEvent } from "../update-event";

describe("core use cases (unit)", () => {
  it("registerUser enforces unique email", () => {
    const users = new InMemoryUserRepository([
      {
        id: "u-1",
        email: "dup@example.com",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(() =>
      registerUser(
        { email: "dup@example.com", status: "ACTIVE" },
        {
          users,
          id: () => "u-2",
          now: () => "2026-02-01T00:00:00.000Z",
        },
      ),
    ).toThrow(UserAlreadyExistsError);
  });

  it("createEvent enforces unique slug", () => {
    const events = new InMemoryEventRepository([
      {
        id: "e-1",
        slug: "spring-launch",
        title: "Spring Launch",
        start_at: "2026-04-01T14:00:00.000Z",
        end_at: "2026-04-01T15:00:00.000Z",
        timezone: "UTC",
        status: "DRAFT",
        capacity: 10,
        created_by: null,
        created_at: "2026-02-01T00:00:00.000Z",
        updated_at: "2026-02-01T00:00:00.000Z",
      },
    ]);

    expect(() =>
      createEvent(
        {
          slug: "spring-launch",
          title: "Duplicate",
          start: "2026-05-01T14:00:00Z",
          end: "2026-05-01T15:00:00Z",
          timezone: "UTC",
          capacity: 10,
        },
        {
          events,
          id: () => "e-2",
          now: () => "2026-02-01T00:00:00.000Z",
        },
      ),
    ).toThrow(EventAlreadyExistsError);
  });

  it("registerParticipant applies waitlist when capacity is full", () => {
    const registrations = new InMemoryRegistrationRepository([
      {
        id: "r-1",
        event_id: "e-1",
        user_id: "u-1",
        status: "REGISTERED",
      },
    ]);

    const users = new InMemoryUserRepository([
      {
        id: "u-1",
        email: "one@example.com",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "u-2",
        email: "two@example.com",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const events = new InMemoryEventRepository(
      [
        {
          id: "e-1",
          slug: "capacity-test",
          title: "Capacity Test",
          start_at: "2026-04-01T14:00:00.000Z",
          end_at: "2026-04-01T15:00:00.000Z",
          timezone: "UTC",
          status: "PUBLISHED",
          capacity: 1,
          created_by: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      registrations.registrations,
    );

    const added = registerParticipant(
      {
        eventSlug: "capacity-test",
        userIdentifier: "two@example.com",
      },
      {
        users,
        events,
        registrations,
        id: () => "r-2",
      },
    );

    expect(added.status).toBe("WAITLISTED");
  });

  it("checkInParticipant rejects cancelled registrations", () => {
    const registrations = new InMemoryRegistrationRepository([
      {
        id: "r-1",
        event_id: "e-1",
        user_id: "u-1",
        status: "CANCELLED",
      },
    ]);

    const users = new InMemoryUserRepository([
      {
        id: "u-1",
        email: "one@example.com",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const events = new InMemoryEventRepository([
      {
        id: "e-1",
        slug: "checkin-test",
        title: "Checkin Test",
        start_at: "2026-04-01T14:00:00.000Z",
        end_at: "2026-04-01T15:00:00.000Z",
        timezone: "UTC",
        status: "PUBLISHED",
        capacity: null,
        created_by: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(() =>
      checkInParticipant(
        {
          eventSlug: "checkin-test",
          userIdentifier: "one@example.com",
        },
        {
          users,
          events,
          registrations,
        },
      ),
    ).toThrow(CancelledRegistrationCheckinError);
  });

  it("updateEvent updates selected fields", () => {
    const events = new InMemoryEventRepository([
      {
        id: "e-1",
        slug: "update-me",
        title: "Before",
        start_at: "2026-04-01T14:00:00.000Z",
        end_at: "2026-04-01T15:00:00.000Z",
        timezone: "UTC",
        status: "DRAFT",
        capacity: 1,
        created_by: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const updated = updateEvent(
      {
        slug: "update-me",
        title: "After",
      },
      {
        events,
        now: () => "2026-02-01T00:00:00.000Z",
      },
    );

    expect(updated.title).toBe("After");
    expect(updated.updated_at).toBe("2026-02-01T00:00:00.000Z");
  });

  it("publishEvent is idempotent", () => {
    const events = new InMemoryEventRepository([
      {
        id: "e-1",
        slug: "publish-me",
        title: "Publish Me",
        start_at: "2026-04-01T14:00:00.000Z",
        end_at: "2026-04-01T15:00:00.000Z",
        timezone: "UTC",
        status: "PUBLISHED",
        capacity: null,
        created_by: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const result = publishEvent(
      { slug: "publish-me" },
      {
        events,
        now: () => "2026-02-01T00:00:00.000Z",
      },
    );

    expect(result.idempotent).toBe(true);
    expect(result.event.status).toBe("PUBLISHED");
  });

  it("cancelEvent marks event as cancelled", () => {
    const events = new InMemoryEventRepository([
      {
        id: "e-1",
        slug: "cancel-me",
        title: "Cancel Me",
        start_at: "2026-04-01T14:00:00.000Z",
        end_at: "2026-04-01T15:00:00.000Z",
        timezone: "UTC",
        status: "PUBLISHED",
        capacity: null,
        created_by: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const result = cancelEvent(
      { slug: "cancel-me", reason: "ops" },
      {
        events,
        now: () => "2026-02-01T00:00:00.000Z",
      },
    );

    expect(result.status).toBe("CANCELLED");
  });

  it("removeParticipant sets registration to cancelled", () => {
    const registrations = new InMemoryRegistrationRepository([
      {
        id: "r-1",
        event_id: "e-1",
        user_id: "u-1",
        status: "REGISTERED",
      },
    ]);

    const users = new InMemoryUserRepository([
      {
        id: "u-1",
        email: "one@example.com",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const events = new InMemoryEventRepository([
      {
        id: "e-1",
        slug: "remove-test",
        title: "Remove Test",
        start_at: "2026-04-01T14:00:00.000Z",
        end_at: "2026-04-01T15:00:00.000Z",
        timezone: "UTC",
        status: "PUBLISHED",
        capacity: null,
        created_by: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const removed = removeParticipant(
      {
        eventSlug: "remove-test",
        userIdentifier: "one@example.com",
      },
      {
        users,
        events,
        registrations,
      },
    );

    expect(removed.status).toBe("CANCELLED");
  });
});
