/**
 * Markdown chunker for the content corpus.
 *
 * Strategy:
 *  1. Strip YAML frontmatter (--- ... --- blocks at top of file)
 *  2. Split on H2/H3 headings to preserve section context
 *  3. Window each section to `maxTokens`, carrying `overlap` tokens to the
 *     next window to avoid boundary effects
 *  4. Prepend the nearest heading to every window for retrieval context
 *  5. Discard chunks shorter than 20 characters
 *
 * "Tokens" are approximated as `text.length / 4` (standard GPT tokenizer
 * ratio for English prose).  Exact tokenisation is not needed here.
 */

export interface FrontmatterResult {
  frontmatter: Record<string, string>;
  body: string;
}

/**
 * Parse YAML-style frontmatter delimited by `---` at the start of a file.
 * Only simple `key: value` pairs are parsed (no nested YAML).
 */
export function parseFrontmatter(raw: string): FrontmatterResult {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    return { frontmatter: {}, body: raw };
  }

  const yamlBlock = fmMatch[1];
  const body = fmMatch[2] ?? "";

  const frontmatter: Record<string, string> = {};
  for (const line of yamlBlock.split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kv) {
      frontmatter[kv[1].trim()] = kv[2].trim();
    }
  }

  return { frontmatter, body };
}

/**
 * Approximate token count using the 4-chars-per-token heuristic.
 */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split `body` into overlapping windows of at most `maxTokens` tokens,
 * each prefixed with `headingPrefix` for retrieval context.
 */
function windowSection(
  body: string,
  headingPrefix: string,
  maxTokens: number,
  overlap: number,
): string[] {
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const results: string[] = [];
  // For simplicity we treat each word as ~4 chars / 1 token equivalent unit
  const maxWords = maxTokens; // 1 token ≈ 1 word for overlap logic
  const overlapWords = overlap;

  let start = 0;
  while (start < words.length) {
    const slice = words.slice(start, start + maxWords).join(" ");
    const candidate = headingPrefix
      ? `${headingPrefix}\n\n${slice}`
      : slice;

    if (approxTokens(candidate) >= 20 / 4) {
      // Discard chunks that are shorter than ~20 chars
      results.push(candidate);
    }

    if (start + maxWords >= words.length) break;
    start += maxWords - overlapWords;
  }

  return results;
}

/**
 * Chunk a markdown document into overlapping text windows.
 *
 * @param markdown  Full markdown content (may include frontmatter)
 * @param maxTokens Max tokens per chunk (default 400, ~1600 chars)
 * @param overlap   Token overlap between adjacent windows (default 50)
 * @returns Array of string chunks, each ≥ 20 chars
 */
export function chunk(
  markdown: string,
  maxTokens = 400,
  overlap = 50,
): string[] {
  const { body } = parseFrontmatter(markdown);

  // Split on H2/H3 headings (## or ###), keeping the heading line
  const sectionRegex = /(?=^#{2,3} .+$)/m;
  const rawSections = body.split(sectionRegex);

  const results: string[] = [];

  for (const section of rawSections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Extract heading (first line if it starts with ## or ###)
    const headingMatch = trimmed.match(/^(#{2,3} .+)$/m);
    const headingPrefix = headingMatch ? headingMatch[1].trim() : "";
    // Strip the heading line from the body to avoid duplicating it in context
    const sectionBody = headingMatch
      ? trimmed.slice(headingMatch[0].length).trim()
      : trimmed;

    const windows = windowSection(sectionBody, headingPrefix, maxTokens, overlap);
    results.push(...windows);
  }

  // Fall through: if there were no H2/H3 headings, window the whole body
  if (results.length === 0 && body.trim()) {
    results.push(...windowSection(body, "", maxTokens, overlap));
  }

  // Final filter: discard anything too short
  return results.filter((c) => c.trim().length >= 20);
}
