import type {
  TransactionalEmailPort,
  TransactionalEmailMessage,
  EmailSendResult,
} from "../../core/ports/transactional-email";

/**
 * Console adapter — logs email details to stdout.
 * Used in local development when no real email provider is configured.
 */
export class ConsoleTransactionalEmail implements TransactionalEmailPort {
  async send(message: TransactionalEmailMessage): Promise<EmailSendResult> {
    console.log(
      `[transactional-email:console] to=${message.to} subject="${message.subject}"`,
    );
    return { ok: true };
  }
}
