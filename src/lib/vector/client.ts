/**
 * OpenAI embedding client for vector search.
 *
 * Uses `text-embedding-3-small` (1536 dims) by default.
 * Requires OPENAI_API_KEY in the environment.
 *
 * Simple in-process LRU cache (max 100 entries) prevents re-embedding
 * the same query string within a single request lifecycle.
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _client;
}

/**
 * Return true when an embedding API call can be made (key is present).
 */
export function isEmbeddingAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// ---------------------------------------------------------------------------
// Simple in-process LRU cache
// ---------------------------------------------------------------------------

const MAX_CACHE = 100;
const _cache = new Map<string, Float32Array>();

function cacheGet(key: string): Float32Array | undefined {
  if (!_cache.has(key)) return undefined;
  // Refresh recency: delete + re-insert
  const val = _cache.get(key)!;
  _cache.delete(key);
  _cache.set(key, val);
  return val;
}

function cacheSet(key: string, value: Float32Array): void {
  if (_cache.size >= MAX_CACHE) {
    // Evict least-recently-used (first inserted key after Map ordering)
    const firstKey = _cache.keys().next().value;
    if (firstKey !== undefined) _cache.delete(firstKey);
  }
  _cache.set(key, value);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Embed `text` using the configured OpenAI model.
 *
 * Returns a Float32Array of length 1536 (text-embedding-3-small).
 * Throws if OPENAI_API_KEY is not set or the API call fails.
 */
export async function embed(text: string): Promise<Float32Array> {
  const key = text.trim();
  const cached = cacheGet(key);
  if (cached) return cached;

  const model =
    process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

  const response = await getClient().embeddings.create({
    model,
    input: key,
    encoding_format: "float",
  });

  const vector = new Float32Array(response.data[0].embedding);
  cacheSet(key, vector);
  return vector;
}
