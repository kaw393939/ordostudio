import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parsePayload } from "../validate";
import {
  loginSchema,
  registerSchema,
  createEventSchema,
  emailField,
  nonEmptyString,
  substitutionSchema,
} from "../schemas";

describe("parsePayload()", () => {
  const simpleSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  }).strict();

  it("returns success with valid data", () => {
    const result = parsePayload(simpleSchema, { name: "Alice", age: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
    }
  });

  it("returns 422 problem for missing required field", () => {
    const result = parsePayload(simpleSchema, { name: "Alice" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(422);
    }
  });

  it("returns 422 problem for wrong type", () => {
    const result = parsePayload(simpleSchema, { name: "Alice", age: "thirty" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(422);
    }
  });

  it("strips extra fields via strict mode", () => {
    const result = parsePayload(simpleSchema, { name: "Alice", age: 30, admin: true });
    // strict mode rejects unknown keys
    expect(result.success).toBe(false);
  });

  it("returns structured errors in problem body", async () => {
    const result = parsePayload(simpleSchema, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = (await result.response.json()) as { errors?: Array<{ path: string; message: string }> };
      expect(body.errors).toBeDefined();
      expect(body.errors!.length).toBeGreaterThanOrEqual(1);
      expect(body.errors![0]).toHaveProperty("path");
      expect(body.errors![0]).toHaveProperty("message");
    }
  });

  it("returns multiple errors for multiple invalid fields", async () => {
    const result = parsePayload(simpleSchema, { name: 123, age: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = (await result.response.json()) as { errors?: Array<{ path: string; message: string }> };
      expect(body.errors!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("returns problem+json content type", () => {
    const result = parsePayload(simpleSchema, {});
    if (!result.success) {
      expect(result.response.headers.get("content-type")).toContain("application/problem+json");
    }
  });
});

describe("auth schemas", () => {
  it("loginSchema accepts valid payload", () => {
    const result = loginSchema.safeParse({ email: "test@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("loginSchema rejects missing email", () => {
    const result = loginSchema.safeParse({ password: "secret" });
    expect(result.success).toBe(false);
  });

  it("loginSchema rejects missing password", () => {
    const result = loginSchema.safeParse({ email: "test@example.com" });
    expect(result.success).toBe(false);
  });

  it("loginSchema rejects extra fields", () => {
    const result = loginSchema.safeParse({ email: "test@example.com", password: "secret", admin: true });
    expect(result.success).toBe(false);
  });

  it("registerSchema accepts valid payload", () => {
    const result = registerSchema.safeParse({ email: "test@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("registerSchema normalizes email to lowercase", () => {
    const result = registerSchema.safeParse({ email: "Test@EXAMPLE.com", password: "secret" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });
});

describe("event schemas", () => {
  const validEvent = {
    slug: "spring-workshop",
    title: "Spring Workshop",
    start: "2025-03-15T09:00:00Z",
    end: "2025-03-15T17:00:00Z",
    timezone: "America/New_York",
  };

  it("createEventSchema accepts valid payload", () => {
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("createEventSchema rejects missing required fields", () => {
    const result = createEventSchema.safeParse({ slug: "test" });
    expect(result.success).toBe(false);
  });

  it("createEventSchema rejects extra fields", () => {
    const result = createEventSchema.safeParse({ ...validEvent, admin_override: true });
    expect(result.success).toBe(false);
  });

  it("substitutionSchema requires both user IDs", () => {
    expect(substitutionSchema.safeParse({ from_user_id: "a" }).success).toBe(false);
    expect(substitutionSchema.safeParse({ to_user_id: "b" }).success).toBe(false);
    expect(substitutionSchema.safeParse({ from_user_id: "a", to_user_id: "b" }).success).toBe(true);
  });
});

describe("shared refinements", () => {
  it("emailField normalizes and validates", () => {
    expect(emailField.safeParse("  Test@Example.COM  ").success).toBe(true);
    expect(emailField.safeParse("not-an-email").success).toBe(false);
    expect(emailField.safeParse("").success).toBe(false);
  });

  it("nonEmptyString rejects empty/whitespace", () => {
    expect(nonEmptyString.safeParse("").success).toBe(false);
    expect(nonEmptyString.safeParse("  ").success).toBe(false);
    expect(nonEmptyString.safeParse("hello").success).toBe(true);
  });
});
