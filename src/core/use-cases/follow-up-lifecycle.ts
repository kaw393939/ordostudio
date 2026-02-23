import { InvalidInputError } from "../domain/errors";

export type FollowUpStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";

const ALLOWED_TRANSITIONS: Record<FollowUpStatus, FollowUpStatus[]> = {
  OPEN: ["IN_PROGRESS", "BLOCKED", "DONE"],
  IN_PROGRESS: ["OPEN", "BLOCKED", "DONE"],
  BLOCKED: ["IN_PROGRESS", "DONE"],
  DONE: [],
};

export const parseFollowUpStatus = (value: string): FollowUpStatus => {
  const normalized = value.trim().toUpperCase();
  if (normalized !== "OPEN" && normalized !== "IN_PROGRESS" && normalized !== "DONE" && normalized !== "BLOCKED") {
    throw new InvalidInputError("invalid_follow_up_status");
  }

  return normalized;
};

export const transitionFollowUpStatus = (from: FollowUpStatus, to: FollowUpStatus): FollowUpStatus => {
  if (from === to) {
    return to;
  }

  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidInputError(`invalid_follow_up_transition:${from}->${to}`);
  }

  return to;
};

export const normalizeFollowUpDueAt = (value?: string | null): string | null => {
  if (!value || !value.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new InvalidInputError("invalid_follow_up_due_at");
  }

  return new Date(parsed).toISOString();
};

export const classifyReminderType = (dueAtIso: string, nowIso: string): "UPCOMING" | "OVERDUE" | null => {
  const dueAt = new Date(dueAtIso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(dueAt) || Number.isNaN(now)) {
    throw new InvalidInputError("invalid_reminder_timestamp");
  }

  if (dueAt < now) {
    return "OVERDUE";
  }

  const hoursUntilDue = (dueAt - now) / (1000 * 60 * 60);
  if (hoursUntilDue <= 48) {
    return "UPCOMING";
  }

  return null;
};
