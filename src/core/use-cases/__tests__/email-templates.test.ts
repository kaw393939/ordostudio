import { describe, it, expect } from "vitest";
import {
  buildPasswordResetEmail,
  buildEmailVerificationEmail,
  buildWelcomeEmail,
  buildRegistrationConfirmationEmail,
} from "../email-templates";

describe("email-templates", () => {
  const baseUrl = "https://example.com";

  describe("buildPasswordResetEmail", () => {
    it("returns correct subject", () => {
      const msg = buildPasswordResetEmail("user@test.com", "reset_abc123", baseUrl);
      expect(msg.subject.toLowerCase()).toContain("password reset");
    });

    it("sends to the correct email", () => {
      const msg = buildPasswordResetEmail("user@test.com", "reset_abc123", baseUrl);
      expect(msg.to).toBe("user@test.com");
    });

    it("contains reset URL with token in textBody", () => {
      const msg = buildPasswordResetEmail("user@test.com", "reset_abc123", baseUrl);
      expect(msg.textBody).toContain("https://example.com/password-reset/confirm?token=reset_abc123");
    });

    it("contains reset URL with token in htmlBody", () => {
      const msg = buildPasswordResetEmail("user@test.com", "reset_abc123", baseUrl);
      expect(msg.htmlBody).toContain("https://example.com/password-reset/confirm?token=reset_abc123");
    });

    it("mentions 30-minute expiry", () => {
      const msg = buildPasswordResetEmail("user@test.com", "reset_abc123", baseUrl);
      expect(msg.textBody).toContain("30 minutes");
    });

    it("produces both textBody and htmlBody", () => {
      const msg = buildPasswordResetEmail("user@test.com", "reset_abc123", baseUrl);
      expect(msg.textBody.length).toBeGreaterThan(0);
      expect(msg.htmlBody.length).toBeGreaterThan(0);
    });

    it("sets tag to password-reset", () => {
      const msg = buildPasswordResetEmail("user@test.com", "reset_abc123", baseUrl);
      expect(msg.tag).toBe("password-reset");
    });
  });

  describe("buildEmailVerificationEmail", () => {
    it("returns correct subject", () => {
      const msg = buildEmailVerificationEmail("user@test.com", "verify_abc123", baseUrl);
      expect(msg.subject.toLowerCase()).toContain("verify");
    });

    it("sends to the correct email", () => {
      const msg = buildEmailVerificationEmail("user@test.com", "verify_abc123", baseUrl);
      expect(msg.to).toBe("user@test.com");
    });

    it("contains verify URL with token in textBody", () => {
      const msg = buildEmailVerificationEmail("user@test.com", "verify_abc123", baseUrl);
      expect(msg.textBody).toContain("https://example.com/verify/confirm?token=verify_abc123");
    });

    it("contains verify URL with token in htmlBody", () => {
      const msg = buildEmailVerificationEmail("user@test.com", "verify_abc123", baseUrl);
      expect(msg.htmlBody).toContain("https://example.com/verify/confirm?token=verify_abc123");
    });

    it("mentions 30-minute expiry", () => {
      const msg = buildEmailVerificationEmail("user@test.com", "verify_abc123", baseUrl);
      expect(msg.textBody).toContain("30 minutes");
    });

    it("produces both textBody and htmlBody", () => {
      const msg = buildEmailVerificationEmail("user@test.com", "verify_abc123", baseUrl);
      expect(msg.textBody.length).toBeGreaterThan(0);
      expect(msg.htmlBody.length).toBeGreaterThan(0);
    });

    it("sets tag to email-verification", () => {
      const msg = buildEmailVerificationEmail("user@test.com", "verify_abc123", baseUrl);
      expect(msg.tag).toBe("email-verification");
    });
  });

  describe("buildWelcomeEmail", () => {
    it("returns correct subject", () => {
      const msg = buildWelcomeEmail("user@test.com", baseUrl);
      expect(msg.subject.toLowerCase()).toContain("welcome");
    });

    it("sends to the correct email", () => {
      const msg = buildWelcomeEmail("user@test.com", baseUrl);
      expect(msg.to).toBe("user@test.com");
    });

    it("contains login URL in textBody", () => {
      const msg = buildWelcomeEmail("user@test.com", baseUrl);
      expect(msg.textBody).toContain("https://example.com/login");
    });

    it("produces both textBody and htmlBody", () => {
      const msg = buildWelcomeEmail("user@test.com", baseUrl);
      expect(msg.textBody.length).toBeGreaterThan(0);
      expect(msg.htmlBody.length).toBeGreaterThan(0);
    });

    it("sets tag to welcome", () => {
      const msg = buildWelcomeEmail("user@test.com", baseUrl);
      expect(msg.tag).toBe("welcome");
    });
  });

  describe("buildRegistrationConfirmationEmail", () => {
    it("returns subject containing event title", () => {
      const msg = buildRegistrationConfirmationEmail(
        "user@test.com",
        "TypeScript Workshop",
        "2025-03-15",
        baseUrl,
      );
      expect(msg.subject).toContain("TypeScript Workshop");
    });

    it("sends to the correct email", () => {
      const msg = buildRegistrationConfirmationEmail(
        "user@test.com",
        "TypeScript Workshop",
        "2025-03-15",
        baseUrl,
      );
      expect(msg.to).toBe("user@test.com");
    });

    it("contains event title in textBody", () => {
      const msg = buildRegistrationConfirmationEmail(
        "user@test.com",
        "TypeScript Workshop",
        "2025-03-15",
        baseUrl,
      );
      expect(msg.textBody).toContain("TypeScript Workshop");
    });

    it("contains event date in textBody", () => {
      const msg = buildRegistrationConfirmationEmail(
        "user@test.com",
        "TypeScript Workshop",
        "2025-03-15",
        baseUrl,
      );
      expect(msg.textBody).toContain("2025-03-15");
    });

    it("produces both textBody and htmlBody", () => {
      const msg = buildRegistrationConfirmationEmail(
        "user@test.com",
        "TypeScript Workshop",
        "2025-03-15",
        baseUrl,
      );
      expect(msg.textBody.length).toBeGreaterThan(0);
      expect(msg.htmlBody.length).toBeGreaterThan(0);
    });

    it("sets tag to registration-confirmation", () => {
      const msg = buildRegistrationConfirmationEmail(
        "user@test.com",
        "TypeScript Workshop",
        "2025-03-15",
        baseUrl,
      );
      expect(msg.tag).toBe("registration-confirmation");
    });
  });
});
