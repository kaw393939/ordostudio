export type RegistrationStatus = "REGISTERED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";

export const canCheckIn = (status: RegistrationStatus): boolean => {
  return status === "REGISTERED" || status === "WAITLISTED";
};

export const canCancel = (status: RegistrationStatus): boolean => {
  return status === "REGISTERED" || status === "WAITLISTED" || status === "CHECKED_IN";
};

export const buildRegistrationPayload = (identifier: string): { user_id?: string; user_email?: string } => {
  const value = identifier.trim();
  if (!value) {
    return {};
  }

  if (value.includes("@")) {
    return { user_email: value.toLowerCase() };
  }

  return { user_id: value };
};

export const buildExportFileName = (slug: string, format: "json" | "csv") => {
  return `${slug}-registrations.${format}`;
};
