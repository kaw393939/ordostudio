import { ExitCode } from "./types";

export class CliError extends Error {
  public readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export const usageError = (message: string): CliError => new CliError(message, 2);
export const authError = (message: string): CliError => new CliError(message, 3);
export const notFoundError = (message: string): CliError => new CliError(message, 4);
export const conflictError = (message: string): CliError => new CliError(message, 5);
export const preconditionError = (message: string): CliError => new CliError(message, 6);
