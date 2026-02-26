import { describe, it, expect } from "vitest";
import { parseFrontmatter, chunk } from "../chunker";

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe("parseFrontmatter", () => {
  it("returns empty frontmatter and raw content when no --- block", () => {
    const raw = "# Hello\n\nSome content here.";
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe(raw);
  });

  it("extracts simple key-value pairs", () => {
    const raw = "---\ntitle: My Page\nvisibility: PUBLIC\n---\n\n# Heading\n\nBody text.";
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({ title: "My Page", visibility: "PUBLIC" });
    expect(body).toContain("# Heading");
    expect(body).not.toContain("---");
  });

  it("ignores lines that are not key: value pairs", () => {
    const raw = "---\ntitle: Docs\n# not a kv pair\n---\nbody";
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({ title: "Docs" });
  });

  it("handles Windows line endings (CRLF)", () => {
    const raw = "---\r\ntitle: Win\r\n---\r\nBody.";
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter.title).toBe("Win");
    expect(body).toBe("Body.");
  });
});

// ---------------------------------------------------------------------------
// chunk
// ---------------------------------------------------------------------------

describe("chunk", () => {
  const LOREM =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi. ";

  it("returns at least one chunk for non-trivial content", () => {
    const markdown = `---\nvisibility: PUBLIC\n---\n\n${LOREM.repeat(10)}`;
    const chunks = chunk(markdown);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("every chunk is at least 20 characters", () => {
    const markdown = `# Section\n\n${LOREM.repeat(5)}`;
    const chunks = chunk(markdown);
    for (const c of chunks) {
      expect(c.trim().length).toBeGreaterThanOrEqual(20);
    }
  });

  it("splits on H2/H3 headings and prepends heading to each chunk", () => {
    const markdown = `## Services\n\nWe offer training.\n\n## Pricing\n\nCosts money.`;
    const chunks = chunk(markdown, 20, 2);
    const hasServicesChunk = chunks.some((c) => c.includes("## Services"));
    const hasPricingChunk = chunks.some((c) => c.includes("## Pricing"));
    expect(hasServicesChunk).toBe(true);
    expect(hasPricingChunk).toBe(true);
  });

  it("strips frontmatter — frontmatter keys do not appear in chunks", () => {
    const markdown = `---\ntitle: Hidden\nvisibility: AUTHENTICATED\n---\n\n# Content\n\n${LOREM}`;
    const chunks = chunk(markdown);
    for (const c of chunks) {
      expect(c).not.toMatch(/^visibility:/);
      expect(c).not.toMatch(/^title:/);
    }
  });

  it("respects custom maxTokens — no chunk exceeds the limit significantly", () => {
    // Use a tight limit so we get multiple chunks from a medium-length section
    const paragraph = "word ".repeat(500); // 500 words, no headings
    const chunks = chunk(paragraph, 50, 5);
    // Each chunk is at most maxTokens words + a heading prefix
    for (const c of chunks) {
      // Approximate: split on whitespace and check word count (heading can add ~3 words)
      const wordCount = c.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(60); // 50 + some heading slack
    }
  });

  it("produces overlapping content between adjacent chunks", () => {
    const paragraph = "word ".repeat(200);
    const chunks = chunk(paragraph, 50, 10);
    if (chunks.length >= 2) {
      // End of first chunk and start of second should share words
      const firstWords = new Set(chunks[0].split(/\s+/));
      const secondWords = chunks[1].split(/\s+/);
      const overlap = secondWords.filter((w) => firstWords.has(w));
      expect(overlap.length).toBeGreaterThan(0);
    }
  });

  it("returns empty array for content shorter than 20 chars", () => {
    const chunks = chunk("Hi.");
    expect(chunks).toHaveLength(0);
  });

  it("handles document with no headings as a single windowed section", () => {
    const body = "This is plain prose without any section headings. " + LOREM;
    const chunks = chunk(body, 400, 50);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});
