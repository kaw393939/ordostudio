import { createHash } from "node:crypto";
import { authError } from "./errors";
import { findActiveServiceTokenByHash } from "./service-token-repository";
import { AppConfig } from "./types";

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export const requireWriteAuth = (config: AppConfig, providedToken?: string): void => {
  if (config.env === "local") {
    return;
  }

  if (!providedToken) {
    throw authError("A valid super-admin token is required for write commands in staging/prod.");
  }

  const token = findActiveServiceTokenByHash(config, hashToken(providedToken));
  if (!token) {
    throw authError("Invalid or revoked token.");
  }
};
