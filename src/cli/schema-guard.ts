import { dbStatus } from "./db";
import { preconditionError } from "./errors";
import { AppConfig } from "./types";

export const requireSchemaCurrent = (config: AppConfig): void => {
  const status = dbStatus(config);
  if (status.pendingCount > 0) {
    throw preconditionError("Migrations are pending. Run `appctl db migrate` first.");
  }
};
