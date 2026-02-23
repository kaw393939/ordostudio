import { EventNotFoundError, InvalidInputError } from "../domain/errors";
import { Event, EventRepository } from "../ports/repositories";

export const cancelEvent = (
  input: { slug: string; reason: string },
  deps: { events: EventRepository; now: () => string },
): Event => {
  const reason = input.reason.trim();
  if (!reason) {
    throw new InvalidInputError("Cancel reason is required.");
  }

  const existing = deps.events.findBySlug(input.slug);
  if (!existing) {
    throw new EventNotFoundError(input.slug);
  }

  const next: Event = {
    ...existing,
    status: "CANCELLED",
    updated_at: deps.now(),
  };

  deps.events.update(next);
  return next;
};
