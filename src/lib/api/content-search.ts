import { promises as fs } from "fs";
import path from "path";

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

export async function searchContent(
  query: string,
  limit = 5
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
        const excerpt = chunk.slice(0, 200).replace(/\n+/g, " ").trim() + (chunk.length > 200 ? "…" : "");
        results.push({ file: relFile, heading, excerpt, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
