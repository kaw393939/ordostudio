/**
 * Fake Error Reporter — test double
 *
 * Records all captureException / captureMessage calls for assertions.
 */

import type { ErrorReporterPort } from "../error-reporter";

export type CapturedError = {
  kind: "exception";
  error: unknown;
  context?: Record<string, unknown>;
};

export type CapturedMessage = {
  kind: "message";
  message: string;
  level: "info" | "warning" | "error";
  context?: Record<string, unknown>;
};

export type CapturedEntry = CapturedError | CapturedMessage;

export class FakeErrorReporter implements ErrorReporterPort {
  public readonly entries: CapturedEntry[] = [];

  captureException(
    error: unknown,
    context?: Record<string, unknown>,
  ): void {
    this.entries.push({ kind: "exception", error, context });
  }

  captureMessage(
    message: string,
    level: "info" | "warning" | "error",
    context?: Record<string, unknown>,
  ): void {
    this.entries.push({ kind: "message", message, level, context });
  }

  get exceptions(): CapturedError[] {
    return this.entries.filter((e): e is CapturedError => e.kind === "exception");
  }

  get messages(): CapturedMessage[] {
    return this.entries.filter((e): e is CapturedMessage => e.kind === "message");
  }

  reset(): void {
    this.entries.length = 0;
  }
}
