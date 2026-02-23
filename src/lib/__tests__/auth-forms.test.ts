import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "../auth-forms";

describe("auth form schemas", () => {
  it("validates login input", () => {
    const valid = loginSchema.safeParse({
      email: "person@example.com",
      password: "Password123!",
    });

    const invalid = loginSchema.safeParse({
      email: "bad-email",
      password: "short",
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("validates register input and confirm password", () => {
    const valid = registerSchema.safeParse({
      email: "person@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      termsAccepted: true,
    });

    const invalid = registerSchema.safeParse({
      email: "person@example.com",
      password: "Password123!",
      confirmPassword: "Password123",
      termsAccepted: false,
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
