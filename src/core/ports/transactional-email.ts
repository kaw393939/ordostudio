/**
 * Transactional Email Port
 *
 * Abstraction over transactional email delivery (Postmark today).
 * Lives in core/ports so use-cases can depend on it without
 * importing infrastructure code.
 *
 * Used for auth-related emails (password reset, email verification,
 * welcome) and event registration confirmations.
 */

/* ── message types ─────────────────────────────────── */

export type TransactionalEmailMessage = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  tag?: string;
  messageStream?: string;
};

export type EmailSendResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

/* ── port interface ────────────────────────────────── */

export interface TransactionalEmailPort {
  send(message: TransactionalEmailMessage): Promise<EmailSendResult>;
}
