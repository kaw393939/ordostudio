import type { RegistrationStatus } from "@/lib/admin-registration-view";

export type AdminRegistrationItem = {
  id: string;
  user_id: string;
  user_email: string;
  status: RegistrationStatus;
};

export type RegistrationStatusFilter = "all" | RegistrationStatus;

export const isRegistrationStatusFilter = (value: string): value is RegistrationStatusFilter => {
  return value === "all" || value === "REGISTERED" || value === "WAITLISTED" || value === "CANCELLED" || value === "CHECKED_IN";
};

export const filterRegistrations = (
  items: AdminRegistrationItem[],
  searchQuery: string,
  statusFilter: RegistrationStatusFilter,
): AdminRegistrationItem[] => {
  const query = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    const statusMatch = statusFilter === "all" ? true : item.status === statusFilter;
    const queryMatch =
      query.length === 0 ||
      item.user_email.toLowerCase().includes(query) ||
      item.user_id.toLowerCase().includes(query);

    return statusMatch && queryMatch;
  });
};

export const bulkEligibleForCheckin = (items: AdminRegistrationItem[], selectedUserIds: string[]): string[] => {
  const selectedSet = new Set(selectedUserIds);
  return items
    .filter((item) => selectedSet.has(item.user_id))
    .filter((item) => item.status === "REGISTERED" || item.status === "WAITLISTED")
    .map((item) => item.user_id);
};

export const bulkEligibleForCancel = (items: AdminRegistrationItem[], selectedUserIds: string[]): string[] => {
  const selectedSet = new Set(selectedUserIds);
  return items
    .filter((item) => selectedSet.has(item.user_id))
    .filter((item) => item.status === "REGISTERED" || item.status === "WAITLISTED" || item.status === "CHECKED_IN")
    .map((item) => item.user_id);
};

export const actionGuidance = (status: RegistrationStatus): { checkin: string; cancel: string } => {
  if (status === "REGISTERED" || status === "WAITLISTED") {
    return {
      checkin: "Ready for check-in.",
      cancel: "Can be canceled if plans changed.",
    };
  }

  if (status === "CHECKED_IN") {
    return {
      checkin: "Already checked in.",
      cancel: "Cancellation still available for correction.",
    };
  }

  return {
    checkin: "Re-register attendee before check-in.",
    cancel: "Already canceled. No further action.",
  };
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const canIncludeEmailExport = (hostname: string): boolean => {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
};

export const exportGovernanceCopy = (hostname: string): string => {
  return canIncludeEmailExport(hostname)
    ? "Include-email export is allowed in local environments for controlled operational usage."
    : "Include-email export is blocked outside local environments. Use non-email export or switch to approved local workflow.";
};

export const exportPreview = (format: "json" | "csv", content: string): string => {
  if (format === "csv") {
    return content.split("\n").slice(0, 6).join("\n");
  }

  return content.slice(0, 500);
};

export type AuditSeverity = "critical" | "high" | "medium" | "low";

const CRITICAL_ACTION_MATCHERS = ["account.delete", "db.restore", "db.backup", "auth.token.create", "auth.token.revoke"];
const HIGH_ACTION_MATCHERS = ["user.role", "user.update", "events.publish", "events.cancel", "export"];
const MEDIUM_ACTION_MATCHERS = ["auth.login", "auth.logout", "registration", "checkin"];

export const auditSeverityForAction = (action: string): AuditSeverity => {
  const normalized = action.trim().toLowerCase();

  if (CRITICAL_ACTION_MATCHERS.some((token) => normalized.includes(token))) {
    return "critical";
  }

  if (HIGH_ACTION_MATCHERS.some((token) => normalized.includes(token))) {
    return "high";
  }

  if (MEDIUM_ACTION_MATCHERS.some((token) => normalized.includes(token))) {
    return "medium";
  }

  return "low";
};

export const summarizeAuditMetadata = (metadata: Record<string, unknown> | null): string => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "No metadata";
  }

  const summaryEntries = Object.entries(metadata)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);

  return summaryEntries.join(" · ");
};

export type AuditQuickRange = "15m" | "1h" | "24h";

const MINUTE_MS = 60_000;

const toDatetimeLocal = (date: Date): string => {
  const offset = date.getTimezoneOffset() * MINUTE_MS;
  const local = new Date(date.getTime() - offset);
  return local.toISOString().slice(0, 16);
};

const rangeMinutes = (range: AuditQuickRange): number => {
  if (range === "15m") {
    return 15;
  }

  if (range === "1h") {
    return 60;
  }

  return 24 * 60;
};

export const auditQuickRangeValues = (range: AuditQuickRange, now: Date = new Date()): { from: string; to: string } => {
  const to = new Date(now);
  const from = new Date(now.getTime() - rangeMinutes(range) * MINUTE_MS);

  return {
    from: toDatetimeLocal(from),
    to: toDatetimeLocal(to),
  };
};

/** Returns ISO strings for the date range (used by DateTimePicker). */
export const auditQuickRangeIso = (range: AuditQuickRange, now: Date = new Date()): { from: string; to: string } => {
  const to = new Date(now);
  const from = new Date(now.getTime() - rangeMinutes(range) * MINUTE_MS);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

export const validateAuditDateRange = (from: string, to: string): { valid: true; fromIso?: string; toIso?: string } | { valid: false; message: string } => {
  const fromValue = from.trim();
  const toValue = to.trim();

  if (fromValue.length === 0 && toValue.length === 0) {
    return { valid: true };
  }

  const fromDate = fromValue.length > 0 ? new Date(fromValue) : null;
  const toDate = toValue.length > 0 ? new Date(toValue) : null;

  if (fromDate && Number.isNaN(fromDate.getTime())) {
    return { valid: false, message: "From date is invalid." };
  }

  if (toDate && Number.isNaN(toDate.getTime())) {
    return { valid: false, message: "To date is invalid." };
  }

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    return { valid: false, message: "From date must be earlier than To date." };
  }

  return {
    valid: true,
    ...(fromDate ? { fromIso: fromDate.toISOString() } : {}),
    ...(toDate ? { toIso: toDate.toISOString() } : {}),
  };
};
