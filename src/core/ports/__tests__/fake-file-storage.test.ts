import { describe, expect, it, beforeEach } from "vitest";
import { FakeFileStorage } from "./fake-file-storage";

describe("FakeFileStorage", () => {
  let storage: FakeFileStorage;

  beforeEach(() => {
    storage = new FakeFileStorage();
  });

  it("uploads a file and returns UploadResult", async () => {
    const data = Buffer.from("hello world");
    const result = await storage.upload("test/file.txt", data, "text/plain");

    expect(result.key).toBe("test/file.txt");
    expect(result.url).toBe("/api/v1/files/test/file.txt");
    expect(result.contentType).toBe("text/plain");
    expect(result.sizeBytes).toBe(11);
  });

  it("stores the file data for retrieval", async () => {
    const data = Buffer.from("binary data");
    await storage.upload("uploads/avatars/u1/avatar.png", data, "image/png");

    expect(storage.files.has("uploads/avatars/u1/avatar.png")).toBe(true);
    const stored = storage.files.get("uploads/avatars/u1/avatar.png");
    expect(stored?.data.toString()).toBe("binary data");
    expect(stored?.contentType).toBe("image/png");
  });

  it("getUrl returns the expected URL pattern", () => {
    const url = storage.getUrl("uploads/events/slug1/banner.jpg");
    expect(url).toBe("/api/v1/files/uploads/events/slug1/banner.jpg");
  });

  it("deletes a file", async () => {
    const data = Buffer.from("temp");
    await storage.upload("temp/file.txt", data, "text/plain");
    expect(await storage.exists("temp/file.txt")).toBe(true);

    await storage.delete("temp/file.txt");
    expect(await storage.exists("temp/file.txt")).toBe(false);
  });

  it("exists returns false for non-existent keys", async () => {
    expect(await storage.exists("no/such/key")).toBe(false);
  });

  it("records operations", async () => {
    const data = Buffer.from("x");
    await storage.upload("k1", data, "text/plain");
    await storage.delete("k1");

    expect(storage.operations).toHaveLength(2);
    expect(storage.operations[0].op).toBe("upload");
    expect(storage.operations[0].key).toBe("k1");
    expect(storage.operations[1].op).toBe("delete");
    expect(storage.operations[1].key).toBe("k1");
  });
});
