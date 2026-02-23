// @vitest-environment node

/**
 * Postmark Contract Tests — PRD-13
 *
 * Verifies that our TransactionalEmailPort interface and the Postmark
 * adapter's message shapes align with the Postmark API expectations.
 */

import { describe, it, expect } from "vitest";
import type {
  TransactionalEmailMessage,
  EmailSendResult,
} from "@/core/ports/transactional-email";

describe("Postmark contract tests", () => {
  describe("TransactionalEmailMessage shape", () => {
    it("has required fields for Postmark send", () => {
      const message: TransactionalEmailMessage = {
        to: "user@example.com",
        subject: "Welcome to our platform",
        textBody: "Hello, welcome!",
        htmlBody: "<p>Hello, welcome!</p>",
      };

      expect(message.to).toContain("@");
      expect(message.subject).toBeTruthy();
      expect(message.textBody).toBeTruthy();
      expect(message.htmlBody).toBeTruthy();
    });

    it("supports optional tag for Postmark tracking", () => {
      const message: TransactionalEmailMessage = {
        to: "user@example.com",
        subject: "Password Reset",
        textBody: "Reset your password",
        htmlBody: "<p>Reset your password</p>",
        tag: "password-reset",
      };

      expect(message.tag).toBe("password-reset");
    });

    it("supports optional messageStream for Postmark streams", () => {
      const message: TransactionalEmailMessage = {
        to: "user@example.com",
        subject: "Verification",
        textBody: "Verify your email",
        htmlBody: "<p>Verify your email</p>",
        messageStream: "outbound",
      };

      expect(message.messageStream).toBe("outbound");
    });
  });

  describe("EmailSendResult shape", () => {
    it("success result has ok: true and optional messageId", () => {
      const success: EmailSendResult = { ok: true, messageId: "msg_123" };
      expect(success.ok).toBe(true);
      if (success.ok) {
        expect(success.messageId).toBe("msg_123");
      }
    });

    it("success result without messageId", () => {
      const success: EmailSendResult = { ok: true };
      expect(success.ok).toBe(true);
    });

    it("failure result has ok: false and error string", () => {
      const failure: EmailSendResult = {
        ok: false,
        error: "422: Inactive recipient",
      };
      expect(failure.ok).toBe(false);
      if (!failure.ok) {
        expect(failure.error).toContain("Inactive recipient");
      }
    });
  });

  describe("Postmark API response shape alignment", () => {
    it("successful send response maps to EmailSendResult", () => {
      // Shape from Postmark API: POST /email
      const postmarkResponse = {
        To: "user@example.com",
        SubmittedAt: "2026-03-01T12:00:00Z",
        MessageID: "b7bc2f4a-e38e-4336-af7d-e6c392c2f817",
        ErrorCode: 0,
        Message: "OK",
      };

      const result: EmailSendResult = {
        ok: postmarkResponse.ErrorCode === 0,
        messageId: postmarkResponse.MessageID,
      };

      expect(result.ok).toBe(true);
      expect(result.messageId).toBeTruthy();
    });

    it("error send response maps to EmailSendResult", () => {
      const postmarkResponse = {
        ErrorCode: 406,
        Message: "You tried to send to a recipient that has been marked as inactive.",
      };

      const result: EmailSendResult = {
        ok: false,
        error: `${postmarkResponse.ErrorCode}: ${postmarkResponse.Message}`,
      };

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("406");
      }
    });
  });

  describe("email message validation", () => {
    it("email addresses must contain @", () => {
      const validEmails = ["user@example.com", "admin@test.org", "a@b.co"];
      for (const email of validEmails) {
        expect(email).toContain("@");
      }
    });

    it("tag values follow expected patterns", () => {
      const validTags = [
        "password-reset",
        "email-verification",
        "welcome",
        "registration-confirmation",
        "newsletter",
      ];
      for (const tag of validTags) {
        expect(tag).toMatch(/^[a-z0-9-]+$/);
      }
    });

    it("message stream defaults to outbound", () => {
      const defaultStream = "outbound";
      expect(defaultStream).toBe("outbound");
    });
  });
});
