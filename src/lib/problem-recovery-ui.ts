import type { ProblemDetails } from "@/lib/hal-client";

export type RecoveryAction = {
  kind: "retry" | "login" | "home" | "events" | "contact-admin";
  label: string;
  href?: string;
};

export type ProblemRecoveryViewModel = {
  title: string;
  cause: string;
  transient: boolean;
  actions: RecoveryAction[];
};

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);

const titleByStatus = (status: number): string => {
  if (status === 400) {
    return "Invalid request";
  }

  if (status === 401) {
    return "Sign in required";
  }

  if (status === 403) {
    return "Action not allowed";
  }

  if (status === 404) {
    return "We couldn’t find that";
  }

  if (status === 409) {
    return "This changed while you were working";
  }

  if (status === 422) {
    return "Validation failed";
  }

  if (TRANSIENT_STATUSES.has(status)) {
    return "Temporary service issue";
  }

  return "Something went wrong";
};

const fallbackCause = (status: number): string => {
  if (status === 400) {
    return "The request contained invalid data. Please review the form and try again.";
  }

  if (status === 401) {
    return "Your session may be missing or expired.";
  }

  if (status === 403) {
    return "Your account does not have permission for this action.";
  }

  if (status === 422) {
    return "Some fields did not pass validation. Please correct them and resubmit.";
  }

  if (status === 404) {
    return "The resource may have moved or been removed.";
  }

  if (status === 409) {
    return "Another update created a conflict. Refresh and try again.";
  }

  if (status === 429) {
    return "Too many requests were sent too quickly. Wait a moment and retry.";
  }

  if (TRANSIENT_STATUSES.has(status)) {
    return "The service is temporarily unavailable. Try again in a moment.";
  }

  return "We hit an unexpected failure while processing your request.";
};

export function toProblemRecoveryView(problem: ProblemDetails): ProblemRecoveryViewModel {
  const transient = TRANSIENT_STATUSES.has(problem.status);
  const actions: RecoveryAction[] = [];

  if (transient) {
    actions.push({ kind: "retry", label: "Try again" });
  }

  if (problem.status === 401) {
    actions.push({ kind: "login", label: "Go to login", href: "/login" });
  }

  if (problem.status === 404) {
    actions.push({ kind: "events", label: "Browse events", href: "/events" });
    actions.push({ kind: "home", label: "Go home", href: "/" });
  }

  if (problem.status === 403) {
    actions.push({ kind: "contact-admin", label: "Contact an administrator" });
  }

  if (actions.length === 0 && !transient) {
    actions.push({ kind: "home", label: "Go home", href: "/" });
  }

  return {
    title: titleByStatus(problem.status),
    cause: problem.detail?.trim() || fallbackCause(problem.status),
    transient,
    actions,
  };
}
