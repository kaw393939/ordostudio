import { InvalidInputError } from "../domain/errors";

export type EngagementSessionStatus = "PLANNED" | "DELIVERED" | "FOLLOW_UP";

export interface EngagementOutcomeInput {
  outcomes?: string[];
  actionItems?: Array<{ description: string; dueAt?: string | null }>;
  nextStep?: string | null;
}

export const parseEngagementSessionStatus = (value?: string): EngagementSessionStatus => {
  const normalized = (value ?? "DELIVERED").trim().toUpperCase();
  if (normalized !== "PLANNED" && normalized !== "DELIVERED" && normalized !== "FOLLOW_UP") {
    throw new InvalidInputError("invalid_engagement_session_status");
  }
  return normalized;
};

export const normalizeEngagementOutcomeInput = (input: EngagementOutcomeInput) => {
  const outcomes = (input.outcomes ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
  const actionItems = (input.actionItems ?? [])
    .map((item) => ({
      description: item.description.trim(),
      dueAt: item.dueAt?.trim() ? item.dueAt.trim() : null,
    }))
    .filter((item) => item.description.length > 0);
  const nextStep = input.nextStep?.trim() ? input.nextStep.trim() : null;

  if (outcomes.length === 0 && actionItems.length === 0 && !nextStep) {
    throw new InvalidInputError("engagement_outcome_required");
  }

  for (const actionItem of actionItems) {
    if (actionItem.dueAt && Number.isNaN(Date.parse(actionItem.dueAt))) {
      throw new InvalidInputError("invalid_action_item_due_at");
    }
  }

  return {
    outcomes,
    actionItems,
    nextStep,
  };
};

export const sortEngagementTimeline = <T extends { startAt: string }>(items: T[]): T[] => {
  return [...items].sort((left, right) => new Date(right.startAt).getTime() - new Date(left.startAt).getTime());
};
