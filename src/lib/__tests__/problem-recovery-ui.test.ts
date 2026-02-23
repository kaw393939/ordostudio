import { describe, expect, it } from "vitest";
import { toProblemRecoveryView } from "../problem-recovery-ui";

describe("problem recovery view model", () => {
  it("maps 401 to sign-in guidance", () => {
    const model = toProblemRecoveryView({
      type: "https://lms-219.dev/problems/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Active session required.",
    });

    expect(model.title).toBe("Sign in required");
    expect(model.actions.some((action) => action.kind === "login")).toBe(true);
  });

  it("marks transient server failures with retry", () => {
    const model = toProblemRecoveryView({
      type: "https://lms-219.dev/problems/internal",
      title: "Internal Server Error",
      status: 503,
      detail: "Service unavailable",
    });

    expect(model.transient).toBe(true);
    expect(model.actions[0].kind).toBe("retry");
  });

  it("maps 404 to navigation recovery actions", () => {
    const model = toProblemRecoveryView({
      type: "https://lms-219.dev/problems/not-found",
      title: "Not Found",
      status: 404,
      detail: "Missing",
    });

    expect(model.actions.some((action) => action.kind === "events")).toBe(true);
    expect(model.actions.some((action) => action.kind === "home")).toBe(true);
  });

  it("falls back to status-specific cause when detail is missing", () => {
    const model = toProblemRecoveryView({
      type: "about:blank",
      title: "Forbidden",
      status: 403,
    });

    expect(model.cause).toContain("permission");
    expect(model.actions.some((action) => action.kind === "contact-admin")).toBe(true);
  });
});
