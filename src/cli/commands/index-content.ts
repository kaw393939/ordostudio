#!/usr/bin/env node
/**
 * index-content CLI command
 *
 * Indexes all `content/**\/*.md` files into the `embeddings` table using
 * OpenAI `text-embedding-3-small`.
 *
 * Usage (standalone script):
 *   npm run index-content
 *
 * Usage (via appctl CLI):
 *   npm run cli -- index-content [--env local|staging|prod]
 *
 * Requires:
 *   OPENAI_API_KEY   (in .env.local)
 *   Migrations 045+046 applied (run `npm run cli -- db migrate` first)
 */

import { config as loadEnv } from "dotenv";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { resolveConfig } from "../config";
import { openDb } from "../../platform/db";
import { indexContentCorpus } from "../../lib/vector/indexer";

// Load .env.local early so OPENAI_API_KEY is available
const repoRoot = process.cwd();
const envLocal = join(repoRoot, ".env.local");
if (existsSync(envLocal)) loadEnv({ path: envLocal });
loadEnv({ path: join(repoRoot, ".env"), override: false });

export async function runIndexContent(
  envOverride?: "local" | "staging" | "prod",
): Promise<{ files: number; chunks: number }> {
  const config = resolveConfig({
    envVars: process.env,
    ...(envOverride ? { flags: { env: envOverride } } : {}),
  });

  const db = openDb(config);
  try {
    const result = await indexContentCorpus(db, repoRoot);

    if (result.alreadyIndexed) {
      console.log(
        `Content already indexed (${result.chunks} chunks). Use --force to re-index.`,
      );
    } else {
      console.log(
        `Indexed ${result.chunks} chunks from ${result.files} files`,
      );
    }
    return { files: result.files, chunks: result.chunks };
  } finally {
    db.close();
  }
}

// Run as standalone script when invoked directly
if (process.argv[1] && process.argv[1].endsWith("index-content.ts")) {
  const envArg = process.argv.find((a) => ["local", "staging", "prod"].includes(a));
  runIndexContent(envArg as "local" | "staging" | "prod" | undefined)
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error("index-content failed:", err);
      process.exit(1);
    });
}
