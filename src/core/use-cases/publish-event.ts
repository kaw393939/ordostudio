import { EventNotFoundError } from "../domain/errors";
import { Event, EventRepository } from "../ports/repositories";

export const publishEvent = (
  input: { slug: string },
  deps: { events: EventRepository; now: () => string },
): { event: Event; idempotent: boolean } => {
  const existing = deps.events.findBySlug(input.slug);
  if (!existing) {
    throw new EventNotFoundError(input.slug);
  }

  if (existing.status === "PUBLISHED") {
    return { event: existing, idempotent: true };
  }

  const next: Event = {
    ...existing,
    status: "PUBLISHED",
    updated_at: deps.now(),
  };
  deps.events.update(next);
  return { event: next, idempotent: false };
};
