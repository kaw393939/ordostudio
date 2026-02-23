export type FollowUpStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";

export const followUpStatusLabel = (status: FollowUpStatus): string => {
  switch (status) {
    case "IN_PROGRESS":
      return "In progress";
    case "DONE":
      return "Done";
    case "BLOCKED":
      return "Blocked";
    default:
      return "Open";
  }
};

export const followUpDueLabel = (dueAt: string | null): string => {
  if (!dueAt) {
    return "No due date";
  }

  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) {
    return "No due date";
  }

  if (due < Date.now()) {
    return "Overdue";
  }

  return "Upcoming";
};
