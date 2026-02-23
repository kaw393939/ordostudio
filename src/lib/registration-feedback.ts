export const REGISTRATION_CONFIRMED_MESSAGE = "Registration confirmed.";
export const WAITLIST_CONFIRMED_MESSAGE = "You were added to the waitlist.";
export const REGISTRATION_CANCELLED_MESSAGE = "Registration canceled.";

export function registrationCreateMessage(status: string): string {
  return status === "WAITLISTED" ? WAITLIST_CONFIRMED_MESSAGE : REGISTRATION_CONFIRMED_MESSAGE;
}
