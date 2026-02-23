import { InvalidInputError } from "../domain/errors";

export type InstructorAssignmentState = "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";

export interface InstructorAssignmentSnapshot {
  state: InstructorAssignmentState;
  instructorId: string | null;
}

const normalizeInstructorId = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const assertAllowedTransition = (from: InstructorAssignmentState, to: InstructorAssignmentState): void => {
  if (from === to) {
    return;
  }

  const allowed: Record<InstructorAssignmentState, InstructorAssignmentState[]> = {
    TBA: ["PROPOSED"],
    PROPOSED: ["ASSIGNED", "TBA"],
    ASSIGNED: ["CONFIRMED", "REASSIGNED", "TBA"],
    CONFIRMED: ["REASSIGNED", "TBA"],
    REASSIGNED: ["ASSIGNED", "TBA"],
  };

  if (!allowed[from].includes(to)) {
    throw new InvalidInputError(`invalid_assignment_transition:${from}->${to}`);
  }
};

export const transitionInstructorAssignment = (
  current: InstructorAssignmentSnapshot,
  args: {
    nextState: InstructorAssignmentState;
    instructorId?: string | null;
  },
): InstructorAssignmentSnapshot => {
  const nextState = args.nextState;
  const currentInstructorId = normalizeInstructorId(current.instructorId);
  const nextInstructorId = normalizeInstructorId(args.instructorId);

  assertAllowedTransition(current.state, nextState);

  if (nextState === "TBA") {
    return {
      state: "TBA",
      instructorId: null,
    };
  }

  if (!nextInstructorId) {
    throw new InvalidInputError("instructor_id_required_for_assignment_state");
  }

  if (nextState === "REASSIGNED" && currentInstructorId && nextInstructorId === currentInstructorId) {
    throw new InvalidInputError("reassignment_requires_different_instructor");
  }

  if (current.state === "CONFIRMED" && nextState === "REASSIGNED" && !currentInstructorId) {
    throw new InvalidInputError("cannot_reassign_without_current_instructor");
  }

  return {
    state: nextState,
    instructorId: nextInstructorId,
  };
};
