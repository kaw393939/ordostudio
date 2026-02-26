/**
 * Vector search for the content corpus.
 *
 * Uses OpenAI `text-embedding-3-small` embeddings + sqlite-vec cosine
 * similarity, with RBAC visibility gating and analytics logging.
 *
 * **Fallback:** If OPENAI_API_KEY is not set, or the embeddings table is
 * empty, this module falls back to the legacy keyword search.
 */

import { randomUUID } from "node:crypto";
import { openDb } from "../../platform/db";
import { resolveConfig } from "../../platform/config";
import { embed, isEmbeddingAvailable } from "./client";
import { visibilityFilter } from "./visibility";
import { keywordSearchContent } from "../api/content-search";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface VectorSearchOptions {
  /** Natural language query string. */
  query: string;
  /**
   * Role of the calling user — determines the visibility filter.
   * `null` means anonymous / PUBLIC content only.
   */
  userRole?: string | null;
  /** Corpus to search. Default: 'content'. */
  corpus?: "content" | "chat";
  /** Maximum results to return. Default: 5. */
  limit?: number;
  /** Source identifier for analytics logging. Default: 'intake-agent'. */
  source?: "intake-agent" | "maestro" | "eval";
  /** Anonymous session cookie value for tracking. */
  sessionId?: string;
  /** Authenticated user ID (if any). */
  userId?: string | null;
  /** An already-open database handle. Opens its own connection if omitted. */
  db?: import("better-sqlite3").Database;
}

export interface VectorSearchResult {
  /** source_id (file path for content corpus) */
  file: string;
  /** chunk_text */
  excerpt: string;
  /** cosine distance (0 = identical, 2 = opposite; lower is better) */
  score: number;
}

export interface VectorSearchResponse {
  results: VectorSearchResult[];
  query: string;
  corpus: string;
}

// ---------------------------------------------------------------------------
// Row shape returned by the SQLite query
// ---------------------------------------------------------------------------

interface EmbeddingRow {
  source_id: string;
  chunk_text: string;
  metadata_json: string | null;
  distance: number;
}

// ---------------------------------------------------------------------------
// Core implementation
// ---------------------------------------------------------------------------

/**
 * Search the `embeddings` table using cosine similarity.
 *
 * Falls back to keyword search when:
 *  - `OPENAI_API_KEY` is not set, OR
 *  - the `embeddings` table has no content rows
 */
export async function vectorSearch(
  opts: VectorSearchOptions,
): Promise<VectorSearchResponse> {
  const {
    query,
    userRole = null,
    corpus = "content",
    limit = 5,
    source = "intake-agent",
    sessionId,
    userId = null,
  } = opts;

  // Decide whether to use vector or keyword path
  if (!isEmbeddingAvailable()) {
    return keywordFallback(query, corpus, limit);
  }

  // Use caller-supplied DB or open our own
  let db: import("better-sqlite3").Database | null = null;
  let shouldClose = false;
  if (opts.db) {
    db = opts.db;
  } else {
    try {
      const config = resolveConfig({ envVars: process.env });
      db = openDb(config);
      shouldClose = true;
    } catch {
      return keywordFallback(query, corpus, limit);
    }
  }

  try {
    // Check that the embeddings table has rows for this corpus
    const rowCount = (
      db.prepare("SELECT COUNT(*) AS n FROM embeddings WHERE corpus = ?").get(corpus) as { n: number }
    ).n;

    if (rowCount === 0) {
      return keywordFallback(query, corpus, limit);
    }

    // Build visibility filter
    const visFilter = visibilityFilter(userRole);
    const placeholders = visFilter.map(() => "?").join(", ");

    // Embed the query
    let queryVec: Float32Array;
    try {
      queryVec = await embed(query);
    } catch {
      return keywordFallback(query, corpus, limit);
    }

    // Run cosine similarity search
    const sql = `
      SELECT
        source_id,
        chunk_text,
        metadata_json,
        vec_distance_cosine(embedding, ?) AS distance
      FROM embeddings
      WHERE corpus = ?
        AND visibility IN (${placeholders})
      ORDER BY distance ASC
      LIMIT ?
    `;

    let rows: EmbeddingRow[];
    try {
      rows = db
        .prepare(sql)
        .all(Buffer.from(queryVec.buffer), corpus, ...visFilter, limit) as EmbeddingRow[];
    } catch {
      // sqlite-vec not loaded (no extension), fall back
      return keywordFallback(query, corpus, limit);
    }

    const results: VectorSearchResult[] = rows.map((row) => ({
      file: row.source_id,
      excerpt: row.chunk_text.slice(0, 500),
      score: row.distance,
    }));

    // Log to search_analytics
    const topResult = results[0];
    try {
      db.prepare(`
        INSERT INTO search_analytics
          (id, query, corpus, result_count, top_source, top_score, user_id, session_id, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        query,
        corpus,
        results.length,
        topResult?.file ?? null,
        topResult?.score ?? null,
        userId,
        sessionId ?? null,
        source,
        new Date().toISOString(),
      );
    } catch {
      // Analytics failure must never break search
    }

    return { results, query, corpus };
  } finally {
    if (shouldClose && db) {
      db.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Keyword fallback
// ---------------------------------------------------------------------------

async function keywordFallback(
  query: string,
  corpus: string,
  limit: number,
): Promise<VectorSearchResponse> {
  const keywordResults = await keywordSearchContent(query, limit);
  const results: VectorSearchResult[] = keywordResults.map((r) => ({
    file: r.file,
    excerpt: r.excerpt,
    score: 1.0 - Math.min(r.score / 10, 0.99), // normalise to distance-like value
  }));
  return { results, query, corpus };
}
