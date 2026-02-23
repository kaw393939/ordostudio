import { EventNotFoundError, UserNotFoundError } from "../domain/errors";
import { Event, Registration, RegistrationRepository, UserRepository, EventRepository } from "../ports/repositories";

const computeStatus = (
  event: Event,
  events: EventRepository,
): Registration["status"] => {
  if (event.capacity === null) {
    return "REGISTERED";
  }

  const activeCount = events.countActiveRegistrations(event.id);
  return activeCount >= event.capacity ? "WAITLISTED" : "REGISTERED";
};

export const registerParticipant = (
  input: { eventSlug: string; userIdentifier: string },
  deps: {
    events: EventRepository;
    users: UserRepository;
    registrations: RegistrationRepository;
    id: () => string;
  },
): Registration => {
  const event = deps.events.findBySlug(input.eventSlug);
  if (!event) {
    throw new EventNotFoundError(input.eventSlug);
  }

  const user = deps.users.findByIdentifier(input.userIdentifier);
  if (!user) {
    throw new UserNotFoundError(input.userIdentifier);
  }

  const existing = deps.registrations.findByEventAndUser(event.id, user.id);
  const nextStatus = computeStatus(event, deps.events);

  if (!existing) {
    const created: Registration = {
      id: deps.id(),
      event_id: event.id,
      user_id: user.id,
      status: nextStatus,
    };
    deps.registrations.create(created);
    return created;
  }

  if (existing.status === "CANCELLED") {
    deps.registrations.updateStatus(existing.id, nextStatus);
    return {
      ...existing,
      status: nextStatus,
    };
  }

  return existing;
};
