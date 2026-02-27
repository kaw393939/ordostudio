/**
 * Embedding client for vector search — multi-provider support.
 *
 * Provider priority (first available key wins):
 *   1. OPENAI_API_KEY              → OpenAI text-embedding-3-small (1536 dims)
 *   2. GOOGLE_GEMINI_API_KEY       → Gemini text-embedding-004 (768 dims)
 *   3. LOCAL_EMBEDDING_BASE_URL    → Local/Ollama via OpenAI-compatible API
 *
 * Simple in-process LRU cache (max 100 entries) prevents re-embedding
 * the same query string within a single request lifecycle.
 */

import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

type EmbeddingProvider = "openai" | "gemini" | "local";

function resolveProvider(): EmbeddingProvider | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GOOGLE_GEMINI_API_KEY) return "gemini";
  if (process.env.LOCAL_EMBEDDING_BASE_URL) return "local";
  return null;
}

/**
 * Return true when an embedding API call can be made (at least one key is present).
 */
export function isEmbeddingAvailable(): boolean {
  return resolveProvider() !== null;
}

// ---------------------------------------------------------------------------
// OpenAI client singleton
// ---------------------------------------------------------------------------

let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ---------------------------------------------------------------------------
// Local (OpenAI-compatible) client singleton
// ---------------------------------------------------------------------------

let _localClient: OpenAI | null = null;

function getLocalClient(): OpenAI {
  if (!_localClient) {
    _localClient = new OpenAI({
      apiKey: process.env.LOCAL_EMBEDDING_API_KEY ?? "no-key-required",
      baseURL: process.env.LOCAL_EMBEDDING_BASE_URL,
    });
  }
  return _localClient;
}

// ---------------------------------------------------------------------------
// Simple in-process LRU cache
// ---------------------------------------------------------------------------

const MAX_CACHE = 100;
const _cache = new Map<string, Float32Array>();

function cacheGet(key: string): Float32Array | undefined {
  if (!_cache.has(key)) return undefined;
  const val = _cache.get(key)!;
  _cache.delete(key);
  _cache.set(key, val);
  return val;
}

function cacheSet(key: string, value: Float32Array): void {
  if (_cache.size >= MAX_CACHE) {
    const firstKey = _cache.keys().next().value;
    if (firstKey !== undefined) _cache.delete(firstKey);
  }
  _cache.set(key, value);
}

// ---------------------------------------------------------------------------
// Provider-specific embedding functions
// ---------------------------------------------------------------------------

async function embedWithOpenAI(text: string): Promise<Float32Array> {
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const response = await getOpenAIClient().embeddings.create({
    model,
    input: text,
    encoding_format: "float",
  });
  return new Float32Array(response.data[0].embedding);
}

async function embedWithGemini(text: string): Promise<Float32Array> {
  const { GoogleGenAI } = await import("@google/genai");
  // Lazy singleton — cached after first call
  if (!_geminiAI) {
    _geminiAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
  }
  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";
  const response = await _geminiAI.models.embedContent({
    model,
    contents: text,
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("Gemini embedding returned no values");
  return new Float32Array(values);
}
let _geminiAI: InstanceType<typeof import("@google/genai").GoogleGenAI> | null = null;

async function embedWithLocal(text: string): Promise<Float32Array> {
  const model = process.env.LOCAL_EMBEDDING_MODEL ?? "nomic-embed-text";
  const response = await getLocalClient().embeddings.create({
    model,
    input: text,
    encoding_format: "float",
  });
  return new Float32Array(response.data[0].embedding);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Embed `text` using the first available embedding provider.
 *
 * Returns a Float32Array whose length depends on the provider/model:
 *   - OpenAI text-embedding-3-small: 1536
 *   - Gemini text-embedding-004: 768
 *   - Local: depends on model
 *
 * Throws if no embedding provider is configured or the API call fails.
 */
export async function embed(text: string): Promise<Float32Array> {
  const key = text.trim();
  const cached = cacheGet(key);
  if (cached) return cached;

  const provider = resolveProvider();
  if (!provider) throw new Error("No embedding provider configured");

  let vector: Float32Array;
  switch (provider) {
    case "openai":
      vector = await embedWithOpenAI(key);
      break;
    case "gemini":
      vector = await embedWithGemini(key);
      break;
    case "local":
      vector = await embedWithLocal(key);
      break;
  }

  cacheSet(key, vector);
  return vector;
}
