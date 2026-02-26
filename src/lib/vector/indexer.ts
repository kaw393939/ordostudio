/**
 * Content corpus indexer.
 *
 * Reads all `content/**\/*.md` files in the project, parses frontmatter,
 * chunks the body text, embeds each chunk via OpenAI, and upserts rows into
 * the `embeddings` table.
 *
 * Running the indexer more than once is safe — it uses ON CONFLICT upsert
 * on the (source_id, chunk_index) unique index.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import Database from "better-sqlite3";
import { parseFrontmatter, chunk } from "./chunker";
import { embed, isEmbeddingAvailable } from "./client";
import type { Visibility } from "./visibility";

export interface IndexContentResult {
  files: number;
  chunks: number;
  alreadyIndexed: boolean;
}

/**
 * Index all markdown content files into the `embeddings` table.
 *
 * @param db         An open SQLite database handle (must have embeddings table)
 * @param repoRoot   Absolute path to the project root (default: cwd)
 * @param source     Tag used in logging; set to 'eval' to avoid polluting analytics
 */
export async function indexContentCorpus(
  db: Database.Database,
  repoRoot: string = process.cwd(),
  source?: string,
): Promise<IndexContentResult> {
  // Check if content is already indexed (idempotency shortcut)
  const existingCount = (
    db
      .prepare("SELECT COUNT(*) AS n FROM embeddings WHERE corpus = 'content'")
      .get() as { n: number }
  ).n;

  if (existingCount > 0 && source !== "eval") {
    return { files: 0, chunks: existingCount, alreadyIndexed: true };
  }

  if (!isEmbeddingAvailable()) {
    throw new Error(
      "OPENAI_API_KEY is not set — cannot index content corpus. " +
        "Set the key in .env.local and re-run `npm run index-content`.",
    );
  }

  const contentGlob = join(repoRoot, "content/**/*.md");
  const files = await fg(contentGlob, { absolute: true });

  const upsertStmt = db.prepare(`
    INSERT INTO embeddings
      (id, corpus, source_id, chunk_index, chunk_text, visibility, embedding, metadata_json, created_at)
    VALUES (?, 'content', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_id, chunk_index) DO UPDATE SET
      chunk_text    = excluded.chunk_text,
      embedding     = excluded.embedding,
      visibility    = excluded.visibility,
      metadata_json = excluded.metadata_json
  `);

  let totalChunks = 0;

  for (const filePath of files) {
    const raw = readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const visibility = ((frontmatter.visibility as Visibility) ?? "PUBLIC") as Visibility;
    const title = frontmatter.title ?? "";

    const chunks = chunk(body);

    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      const embedding = await embed(text);
      const metadataJson = JSON.stringify({
        title,
        word_count: text.split(/\s+/).filter(Boolean).length,
      });

      upsertStmt.run(
        randomUUID(),
        filePath,
        i,
        text,
        visibility,
        Buffer.from(embedding.buffer),
        metadataJson,
        new Date().toISOString(),
      );
      totalChunks++;
    }
  }

  return { files: files.length, chunks: totalChunks, alreadyIndexed: false };
}
