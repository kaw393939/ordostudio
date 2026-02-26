import { describe, it, expect } from "vitest";
import {
  buildAnthropicMessageBlock,
  buildAnthropicContentBlocks,
} from "../attachment-builder";
import type { AttachmentInput } from "../chat-body-parser";

describe("buildAnthropicMessageBlock", () => {
  it("builds an image block with the correct media type", () => {
    const attachment: AttachmentInput = {
      type: "image",
      mediaType: "image/png",
      name: "screenshot.png",
      data: "abc123",
    };
    const block = buildAnthropicMessageBlock(attachment);
    expect(block).not.toBeNull();
    expect(block!.type).toBe("image");
    const src = (block as { type: "image"; source: { type: string; media_type: string; data: string } }).source;
    expect(src.type).toBe("base64");
    expect(src.media_type).toBe("image/png");
    expect(src.data).toBe("abc123");
  });

  it("falls back to image/jpeg for unknown image media types", () => {
    const attachment: AttachmentInput = {
      type: "image",
      mediaType: "image/bmp", // not in allowed list
      name: "photo.bmp",
      data: "data123",
    };
    const block = buildAnthropicMessageBlock(attachment);
    expect(block).not.toBeNull();
    const src = (block as { type: "image"; source: { media_type: string } }).source;
    expect(src.media_type).toBe("image/jpeg");
  });

  it("builds a document block for PDF attachments", () => {
    const attachment: AttachmentInput = {
      type: "document",
      mediaType: "application/pdf",
      name: "report.pdf",
      data: "pdfdata",
    };
    const block = buildAnthropicMessageBlock(attachment);
    expect(block).not.toBeNull();
    expect(block!.type).toBe("document");
  });

  it("returns null for text attachment type", () => {
    const attachment: AttachmentInput = {
      type: "text",
      mediaType: "text/plain",
      name: "notes.txt",
      data: "some text",
    };
    const block = buildAnthropicMessageBlock(attachment);
    expect(block).toBeNull();
  });
});

describe("buildAnthropicContentBlocks", () => {
  it("filters out null entries and returns only valid blocks", () => {
    const attachments: AttachmentInput[] = [
      { type: "image", mediaType: "image/jpeg", name: "photo.jpg", data: "d1" },
      { type: "text", mediaType: "text/plain", name: "notes.txt", data: "d2" },
      { type: "document", mediaType: "application/pdf", name: "doc.pdf", data: "d3" },
    ];
    const blocks = buildAnthropicContentBlocks(attachments);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("document");
  });

  it("returns empty array for empty input", () => {
    expect(buildAnthropicContentBlocks([])).toEqual([]);
  });
});
