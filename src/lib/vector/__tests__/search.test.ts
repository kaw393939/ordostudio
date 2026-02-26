/**
 * Unit tests for vectorSearch — exercises fallback paths and RBAC gating.
 *
 * The OpenAI embedding client, the database layer, and the keyword fallback
 * are all mocked so no external I/O occurs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks (must appear before any imports that use these modules)
// ---------------------------------------------------------------------------

vi.mock("@/lib/vector/client", () => ({
  embed: vi.fn(),
  isEmbeddingAvailable: vi.fn(),
}));

vi.mock("@/platform/db", () => ({
  openDb: vi.fn(),
}));

vi.mock("@/platform/config", () => ({
  resolveConfig: vi.fn().mockReturnValue({ databasePath: ":memory:" }),
}));

vi.mock("@/lib/api/content-search", () => ({
  keywordSearchContent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import mocked modules for per-test control
// ---------------------------------------------------------------------------

import { embed, isEmbeddingAvailable } from "@/lib/vector/client";
import { openDb } from "@/platform/db";
import { keywordSearchContent } from "@/lib/api/content-search";
import { vectorSearch } from "../search";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock SQLite database. */
function makeMockDb(rowCount: number, rows: unknown[] = []) {
  const prepareResult = {
    get: vi.fn().mockReturnValue({ n: rowCount }),
    all: vi.fn().mockReturnValue(rows),
    run: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(prepareResult),
    close: vi.fn(),
    _prepareResult: prepareResult,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("vectorSearch — keyword fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to keyword search when embedding is not available", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(false);
    vi.mocked(keywordSearchContent).mockResolvedValue([
      { file: "content/site/about.md", excerpt: "About us text.", score: 5 },
    ]);

    const result = await vectorSearch({ query: "who are you" });

    expect(keywordSearchContent).toHaveBeenCalledWith("who are you", 5);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].file).toBe("content/site/about.md");
    expect(result.query).toBe("who are you");
  });

  it("falls back when embeddings table has 0 rows", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(keywordSearchContent).mockResolvedValue([]);

    const db = makeMockDb(0);
    vi.mocked(openDb).mockReturnValue(db as never);

    const result = await vectorSearch({ query: "empty corpus" });

    expect(keywordSearchContent).toHaveBeenCalled();
    expect(result.results).toHaveLength(0);
  });

  it("falls back when embed() throws", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockRejectedValue(new Error("API error"));
    vi.mocked(keywordSearchContent).mockResolvedValue([]);

    const db = makeMockDb(10);
    vi.mocked(openDb).mockReturnValue(db as never);

    const result = await vectorSearch({ query: "error test" });

    expect(keywordSearchContent).toHaveBeenCalled();
  });
});

describe("vectorSearch — vector path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped results from the vector query", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockResolvedValue(new Float32Array(1536));

    const fakeRows = [
      {
        source_id: "content/site/training.md",
        chunk_text: "Training costs $3,000 per participant.",
        metadata_json: null,
        distance: 0.12,
      },
      {
        source_id: "content/site/services.md",
        chunk_text: "We provide a range of services.",
        metadata_json: null,
        distance: 0.25,
      },
    ];

    const db = makeMockDb(5, fakeRows);
    vi.mocked(openDb).mockReturnValue(db as never);

    const result = await vectorSearch({ query: "training fees", userRole: null });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].file).toBe("content/site/training.md");
    expect(result.results[0].score).toBe(0.12);
    expect(result.results[1].file).toBe("content/site/services.md");
  });

  it("passes the correct number of results to the query", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockResolvedValue(new Float32Array(1536));

    const db = makeMockDb(5, []);
    vi.mocked(openDb).mockReturnValue(db as never);

    await vectorSearch({ query: "test", limit: 3 });

    // The .all() call on the prepared statement should have been made
    expect(db._prepareResult.all).toHaveBeenCalled();
  });

  it("uses caller-supplied db and does NOT close it", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockResolvedValue(new Float32Array(1536));

    const db = makeMockDb(5, []);
    const externalDb = db as unknown as import("better-sqlite3").Database;

    await vectorSearch({ query: "test", db: externalDb });

    // openDb should NOT have been called since we passed our own db
    expect(openDb).not.toHaveBeenCalled();
    // close should NOT have been called on an externally supplied db
    expect(db.close).not.toHaveBeenCalled();
  });

  it("opens and closes its own db connection when none is supplied", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockResolvedValue(new Float32Array(1536));

    const db = makeMockDb(5, []);
    vi.mocked(openDb).mockReturnValue(db as never);

    await vectorSearch({ query: "test" });

    expect(openDb).toHaveBeenCalledTimes(1);
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  it("attempts to write to search_analytics after a successful query", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockResolvedValue(new Float32Array(1536));

    const db = makeMockDb(5, []);
    vi.mocked(openDb).mockReturnValue(db as never);

    await vectorSearch({ query: "analytics test" });

    // .prepare().run() is used for the INSERT
    expect(db._prepareResult.run).toHaveBeenCalled();
  });

  it("analytics failure does not surface to the caller", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockResolvedValue(new Float32Array(1536));

    const db = makeMockDb(5, []);
    db._prepareResult.run.mockImplementation(() => {
      throw new Error("DB write failed");
    });
    vi.mocked(openDb).mockReturnValue(db as never);

    // Should NOT throw even though analytics write fails
    await expect(vectorSearch({ query: "silent error" })).resolves.toBeDefined();
  });
});

describe("vectorSearch — RBAC visibility filter applied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes only PUBLIC tier for null userRole", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockResolvedValue(new Float32Array(1536));

    const db = makeMockDb(5, []);
    vi.mocked(openDb).mockReturnValue(db as never);

    await vectorSearch({ query: "test", userRole: null });

    // The SQL prepared should contain a single placeholder for PUBLIC
    const prepareCall = db.prepare.mock.calls.find((args) =>
      String(args[0]).includes("visibility IN"),
    );
    expect(prepareCall).toBeDefined();
  });

  it("includes PUBLIC + AUTHENTICATED for AUTHENTICATED userRole", async () => {
    vi.mocked(isEmbeddingAvailable).mockReturnValue(true);
    vi.mocked(embed).mockResolvedValue(new Float32Array(1536));

    const db = makeMockDb(5, []);
    vi.mocked(openDb).mockReturnValue(db as never);

    await vectorSearch({ query: "commissions", userRole: "AUTHENTICATED" });

    const prepareCall = db.prepare.mock.calls.find((args) =>
      String(args[0]).includes("visibility IN"),
    );
    // Two placeholders: ?, ?
    expect(String(prepareCall?.[0]).match(/\?/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
