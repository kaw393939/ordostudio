import { InvalidInputError } from "../domain/errors";

export const parseEngagementType = (value?: string): "INDIVIDUAL" | "GROUP" => {
  if (!value) {
    return "INDIVIDUAL";
  }

  const normalized = value.trim().toUpperCase();
  if (normalized !== "INDIVIDUAL" && normalized !== "GROUP") {
    throw new InvalidInputError("Invalid engagement type.");
  }

  return normalized;
};
