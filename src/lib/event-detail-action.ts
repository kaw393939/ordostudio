type RegistrationStatus =
  | "REGISTERED"
  | "WAITLISTED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "NOT_REGISTERED";

type PrimaryActionInput = {
  loggedIn: boolean;
  registrationStatus: RegistrationStatus;
  links: Record<string, { href: string } | undefined>;
};

export type PrimaryAction =
  | { kind: "register"; label: "Register" }
  | { kind: "waitlist"; label: "Join waitlist" }
  | { kind: "cancel"; label: "Cancel registration" }
  | { kind: "login"; label: "Login to register" }
  | { kind: "none"; label: "No action available" };

export function normalizeRegistrationStatus(value: string | null | undefined): RegistrationStatus {
  if (value === "REGISTERED" || value === "WAITLISTED" || value === "CANCELLED" || value === "CHECKED_IN") {
    return value;
  }
  return "NOT_REGISTERED";
}

export function statusChipClass(status: RegistrationStatus): string {
  const byStatus: Record<RegistrationStatus, string> = {
    REGISTERED: "border border-state-success text-state-success",
    WAITLISTED: "border border-state-warning text-state-warning",
    CANCELLED: "border border-state-danger text-state-danger",
    CHECKED_IN: "border border-state-info text-state-info",
    NOT_REGISTERED: "border border-border-default text-text-secondary",
  };

  return byStatus[status];
}

export function resolvePrimaryAction(input: PrimaryActionInput): PrimaryAction {
  const hasRegisterAffordance = Boolean(input.links["app:register"]?.href);
  const hasWaitlistAffordance = Boolean(input.links["app:join-waitlist"]?.href);
  const hasCancelAffordance = Boolean(input.links["app:my-registration"]?.href);

  if (!input.loggedIn && (hasRegisterAffordance || hasWaitlistAffordance)) {
    return { kind: "login", label: "Login to register" };
  }

  if (input.loggedIn && hasCancelAffordance) {
    if (input.registrationStatus === "REGISTERED" || input.registrationStatus === "WAITLISTED") {
      return { kind: "cancel", label: "Cancel registration" };
    }
  }

  if (input.loggedIn && hasRegisterAffordance) {
    if (input.registrationStatus === "NOT_REGISTERED" || input.registrationStatus === "CANCELLED") {
      return { kind: "register", label: "Register" };
    }
  }

  if (input.loggedIn && hasWaitlistAffordance) {
    if (input.registrationStatus === "NOT_REGISTERED" || input.registrationStatus === "CANCELLED") {
      return { kind: "waitlist", label: "Join waitlist" };
    }
  }

  return { kind: "none", label: "No action available" };
}
