import type {
  TransactionalEmailPort,
  TransactionalEmailMessage,
  EmailSendResult,
} from "../../core/ports/transactional-email";

/**
 * Postmark adapter for transactional email.
 * Mirrors the existing newsletter Postmark integration pattern.
 */
export class PostmarkTransactionalEmail implements TransactionalEmailPort {
  private readonly serverToken: string;
  private readonly fromEmail: string;
  private readonly messageStream: string;

  constructor(opts?: {
    serverToken?: string;
    fromEmail?: string;
    messageStream?: string;
  }) {
    this.serverToken = opts?.serverToken ?? process.env.POSTMARK_SERVER_TOKEN ?? "";
    this.fromEmail = opts?.fromEmail ?? process.env.TRANSACTIONAL_FROM_EMAIL ?? "noreply@localhost";
    this.messageStream = opts?.messageStream ?? "outbound";
  }

  async send(message: TransactionalEmailMessage): Promise<EmailSendResult> {
    if (!this.serverToken) {
      return { ok: false, error: "missing_postmark_server_token" };
    }

    try {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "X-Postmark-Server-Token": this.serverToken,
        },
        body: JSON.stringify({
          From: this.fromEmail,
          To: message.to,
          Subject: message.subject,
          TextBody: message.textBody,
          HtmlBody: message.htmlBody,
          MessageStream: message.messageStream ?? this.messageStream,
          ...(message.tag ? { Tag: message.tag } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return { ok: false, error: `postmark_http_${response.status}:${body}` };
      }

      const json = (await response.json()) as { MessageID?: string };
      return { ok: true, messageId: json.MessageID };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `postmark_fetch_error:${msg}` };
    }
  }
}
