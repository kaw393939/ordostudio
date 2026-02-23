import { describe, it, expect, beforeEach } from "vitest";
import { ingestItem, listIngestedItems } from "../ingestion";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { ApiActor } from "../actor";

describe("Ingestion API", () => {
  const adminActor: ApiActor = { type: "user", id: "admin-1", roles: ["ADMIN"] };
  const userActor: ApiActor = { type: "user", id: "user-1", roles: ["USER"] };

  beforeEach(() => {
    const config = resolveConfig({ envVars: process.env });
    const db = openCliDb(config);
    db.exec("DELETE FROM ingested_items");
    db.close();
  });

  it("ingests a new item", () => {
    const item = ingestItem(adminActor, {
      sourceType: "test",
      externalId: "123",
      canonicalUrl: "https://example.com/123",
      title: "Test Item",
      rawPayload: { foo: "bar" },
      normalizedPayload: { baz: "qux" },
    });

    expect(item.id).toBeDefined();
    expect(item.sourceType).toBe("test");
    expect(item.externalId).toBe("123");
    expect(item.title).toBe("Test Item");
    expect(item.rawPayload).toEqual({ foo: "bar" });
    expect(item.normalizedPayload).toEqual({ baz: "qux" });

    const items = listIngestedItems(adminActor);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(item.id);
  });

  it("updates an existing item if content hash changes", () => {
    const item1 = ingestItem(adminActor, {
      sourceType: "test",
      externalId: "123",
      canonicalUrl: "https://example.com/123",
      title: "Test Item",
      rawPayload: { foo: "bar" },
      normalizedPayload: { baz: "qux" },
    });

    const item2 = ingestItem(adminActor, {
      sourceType: "test",
      externalId: "123",
      canonicalUrl: "https://example.com/123",
      title: "Updated Test Item",
      rawPayload: { foo: "baz" }, // Changed payload
      normalizedPayload: { baz: "qux" },
    });

    expect(item2.id).toBe(item1.id);
    expect(item2.title).toBe("Updated Test Item");
    expect(item2.contentHash).not.toBe(item1.contentHash);

    const items = listIngestedItems(adminActor);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Updated Test Item");
  });

  it("does not update an existing item if content hash is the same", () => {
    const item1 = ingestItem(adminActor, {
      sourceType: "test",
      externalId: "123",
      canonicalUrl: "https://example.com/123",
      title: "Test Item",
      rawPayload: { foo: "bar" },
      normalizedPayload: { baz: "qux" },
    });

    const item2 = ingestItem(adminActor, {
      sourceType: "test",
      externalId: "123",
      canonicalUrl: "https://example.com/123",
      title: "Updated Test Item", // This change will be ignored because rawPayload is the same
      rawPayload: { foo: "bar" },
      normalizedPayload: { baz: "qux" },
    });

    expect(item2.id).toBe(item1.id);
    expect(item2.title).toBe("Test Item"); // Still the old title
    expect(item2.contentHash).toBe(item1.contentHash);

    const items = listIngestedItems(adminActor);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test Item");
  });
});
