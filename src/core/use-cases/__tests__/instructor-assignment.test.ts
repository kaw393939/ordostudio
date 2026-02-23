import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../domain/errors";
import { transitionInstructorAssignment } from "../instructor-assignment";

describe("instructor assignment transitions", () => {
  it("treats TBA as first-class and requires instructor to leave TBA", () => {
    expect(() =>
      transitionInstructorAssignment(
        {
          state: "TBA",
          instructorId: null,
        },
        {
          nextState: "PROPOSED",
        },
      ),
    ).toThrowError(new InvalidInputError("instructor_id_required_for_assignment_state"));

    const moved = transitionInstructorAssignment(
      {
        state: "TBA",
        instructorId: null,
      },
      {
        nextState: "PROPOSED",
        instructorId: "inst-1",
      },
    );

    expect(moved.state).toBe("PROPOSED");
    expect(moved.instructorId).toBe("inst-1");
  });

  it("enforces linear transition rules", () => {
    expect(() =>
      transitionInstructorAssignment(
        {
          state: "PROPOSED",
          instructorId: "inst-1",
        },
        {
          nextState: "CONFIRMED",
          instructorId: "inst-1",
        },
      ),
    ).toThrowError(new InvalidInputError("invalid_assignment_transition:PROPOSED->CONFIRMED"));
  });

  it("requires different instructor when moving to reassigned", () => {
    expect(() =>
      transitionInstructorAssignment(
        {
          state: "ASSIGNED",
          instructorId: "inst-1",
        },
        {
          nextState: "REASSIGNED",
          instructorId: "inst-1",
        },
      ),
    ).toThrowError(new InvalidInputError("reassignment_requires_different_instructor"));

    const moved = transitionInstructorAssignment(
      {
        state: "ASSIGNED",
        instructorId: "inst-1",
      },
      {
        nextState: "REASSIGNED",
        instructorId: "inst-2",
      },
    );

    expect(moved.state).toBe("REASSIGNED");
    expect(moved.instructorId).toBe("inst-2");
  });
});
