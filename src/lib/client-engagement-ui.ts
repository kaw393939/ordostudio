export type TimelineStatus = "UPCOMING" | "DELIVERED" | "CANCELLED";

export const timelineStatusLabel = (status: TimelineStatus): string => {
  switch (status) {
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Upcoming";
  }
};

export const nextStepCopy = (nextStep: string | null): string => {
  if (!nextStep || !nextStep.trim()) {
    return "No follow-up recorded yet.";
  }

  return nextStep.trim();
};
