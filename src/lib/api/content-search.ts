import { promises as fs } from "fs";
import path from "path";
import { vectorSearch, type VectorSearchOptions } from "../vector/search";

export interface ContentResult {
  file: string;
  heading: string;
  excerpt: string;
  score: number;
}

const CONTENT_DIR = path.join(process.cwd(), "content");
const CHUNK_SIZE_WORDS = 300;

async function getAllMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllMarkdownFiles(full)));
    } else if (entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function extractHeading(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE_WORDS) {
    chunks.push(words.slice(i, i + CHUNK_SIZE_WORDS).join(" "));
  }
  return chunks;
}

function scoreChunk(chunk: string, queryTokens: string[]): number {
  const lower = chunk.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = lower.match(regex);
    if (matches) score += matches.length;
  }
  return score;
}

export async function keywordSearchContent(
  query: string,
  limit = 5,
): Promise<ContentResult[]> {
  if (!query.trim()) return [];

  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (queryTokens.length === 0) return [];

  let files: string[];
  try {
    files = await getAllMarkdownFiles(CONTENT_DIR);
  } catch {
    // content directory doesn't exist or is unreadable
    return [];
  }

  const results: ContentResult[] = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf-8");
    const heading = extractHeading(content);
    const relFile = path.relative(CONTENT_DIR, filePath);
    const chunks = chunkText(content);

    for (const chunk of chunks) {
      const score = scoreChunk(chunk, queryTokens);
      if (score > 0) {
        // Trim excerpt to ~200 chars
        const excerpt = chunk.slice(0, 200).replace(/\n+/g, " ").trim() + (chunk.length > 200 ? "\u2026" : "");
        results.push({ file: relFile, heading, excerpt, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Public API — delegates to vectorSearch (falls back to keyword automatically)
// ---------------------------------------------------------------------------

/**
 * Search the content knowledge base.
 *
 * Delegates to vectorSearch(), which uses cosine similarity when
 * OPENAI_API_KEY is set and the embeddings table is populated, otherwise
 * falls back to keyword scoring automatically.
 *
 * @param query     Natural language search query
 * @param limit     Max results (default 5)
 * @param userRole  Caller's role for RBAC visibility gating (default null = PUBLIC)
 * @param opts      Extra options forwarded to vectorSearch
 */
export async function searchContent(
  query: string,
  limit = 5,
  userRole: string | null = null,
  opts?: Partial<VectorSearchOptions>,
): Promise<ContentResult[]> {
  if (!query.trim()) return [];

  const response = await vectorSearch({
    query,
    limit,
    userRole,
    source: "intake-agent",
    ...opts,
  });

  return response.results.map((r) => {
    // Extract heading from the first line of the chunk (chunker prepends it)
    const firstLine = r.excerpt.split("\n")[0].trim();
    const heading = /^#{2,3} /.test(firstLine)
      ? firstLine.replace(/^#+\s*/, "")
      : path.basename(r.file, ".md");

    // Make file path relative to content dir for backward compat
    const relFile = r.file.includes("/content/")
      ? r.file.slice(r.file.indexOf("/content/") + "/content/".length)
      : r.file;

    return {
      file: relFile,
      heading,
      excerpt: r.excerpt.slice(0, 400).replace(/\n+/g, " ").trim(),
      score: Math.max(0, 1 - r.score),
    };
  });
}
