import type { TransactionalEmailPort } from "../core/ports/transactional-email";
import { ConsoleTransactionalEmail } from "../adapters/console/console-email";
import { PostmarkTransactionalEmail } from "../adapters/postmark/postmark-email";

/**
 * Resolves the TransactionalEmailPort implementation based on
 * TRANSACTIONAL_EMAIL_PROVIDER env var.
 *
 * - "postmark" → PostmarkTransactionalEmail (real sends)
 * - anything else (including default "console") → ConsoleTransactionalEmail
 *
 * Can be overridden in tests via setTransactionalEmailPort / resetTransactionalEmailPort.
 */

let _override: TransactionalEmailPort | null = null;

export const resolveTransactionalEmailPort = (): TransactionalEmailPort => {
  if (_override) {
    return _override;
  }

  const provider = (process.env.TRANSACTIONAL_EMAIL_PROVIDER ?? "console").toLowerCase();

  if (provider === "postmark") {
    return new PostmarkTransactionalEmail();
  }

  return new ConsoleTransactionalEmail();
};

/** Override the email port — typically used in tests with FakeTransactionalEmail. */
export function setTransactionalEmailPort(port: TransactionalEmailPort): void {
  _override = port;
}

/** Reset to default env-based resolution. */
export function resetTransactionalEmailPort(): void {
  _override = null;
}
