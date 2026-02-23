import { randomUUID } from "node:crypto";

import { resolveConfig } from "../cli/config";
import { hashToken } from "../cli/write-auth";
import { findActiveServiceTokenByHash, touchServiceTokenLastUsed } from "../cli/service-token-repository";
import { createMcpServer } from "./server";

const parseArgs = (argv: string[]) => {
  const out: { token?: string } = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--token") {
      out.token = argv[i + 1];
      i++;
      continue;
    }
    if (arg?.startsWith("--token=")) {
      out.token = arg.slice("--token=".length);
      continue;
    }
  }

  return out;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const providedToken = args.token ?? process.env.MCP_TOKEN;

  const config = resolveConfig({ envVars: process.env });

  const authenticated = (() => {
    if (!providedToken || providedToken.trim().length === 0) {
      return { ok: false, error: "missing_token" } as const;
    }

    const token = findActiveServiceTokenByHash(config, hashToken(providedToken));
    if (!token) {
      return { ok: false, error: "invalid_token" } as const;
    }

    touchServiceTokenLastUsed(config, { id: token.id, usedAt: new Date().toISOString() });
    return { ok: true, tokenId: token.id } as const;
  })();

  const server = createMcpServer({
    serverName: "lms-219-admin-ops",
    serverVersion: "0.1.0",
    auth: authenticated.ok
      ? { ok: true, actor: { type: "SERVICE", id: authenticated.tokenId } }
      : { ok: false, error: authenticated.error },
    requestIdFactory: () => randomUUID(),
  });

  await server.run();
};

void main();
