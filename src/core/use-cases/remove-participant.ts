import { EventNotFoundError, RegistrationNotFoundError, UserNotFoundError } from "../domain/errors";
import { Registration, RegistrationRepository, UserRepository, EventRepository } from "../ports/repositories";

export const removeParticipant = (
  input: { eventSlug: string; userIdentifier: string },
  deps: {
    events: EventRepository;
    users: UserRepository;
    registrations: RegistrationRepository;
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
  if (!existing) {
    throw new RegistrationNotFoundError(input.eventSlug, input.userIdentifier);
  }

  if (existing.status !== "CANCELLED") {
    deps.registrations.updateStatus(existing.id, "CANCELLED");
  }

  return {
    ...existing,
    status: "CANCELLED",
  };
};
