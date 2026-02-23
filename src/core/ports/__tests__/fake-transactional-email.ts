import type {
  TransactionalEmailPort,
  TransactionalEmailMessage,
  EmailSendResult,
} from "../transactional-email";

/**
 * In-memory fake for testing.
 * Records every sent message and returns a configurable result.
 */
export class FakeTransactionalEmail implements TransactionalEmailPort {
  sentMessages: TransactionalEmailMessage[] = [];
  nextResult: EmailSendResult = { ok: true, messageId: "fake-msg-001" };

  async send(message: TransactionalEmailMessage): Promise<EmailSendResult> {
    this.sentMessages.push(message);
    return this.nextResult;
  }

  reset(): void {
    this.sentMessages = [];
    this.nextResult = { ok: true, messageId: "fake-msg-001" };
  }
}
