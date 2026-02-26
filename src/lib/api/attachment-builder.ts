/**
 * attachment-builder.ts
 *
 * Converts client AttachmentInput objects to Anthropic SDK content-block
 * params.  Pure transformation — no I/O, no DB access.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { AttachmentInput } from "@/lib/api/chat-body-parser";

const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type ImageMediaType = (typeof VALID_IMAGE_TYPES)[number];

/**
 * Build a single Anthropic content-block param from one attachment.
 * Returns `null` for attachment types that have no Anthropic mapping (e.g.
 * plain "text" without embedded data).
 */
export function buildAnthropicMessageBlock(
  attachment: AttachmentInput,
): Anthropic.ContentBlockParam | null {
  if (attachment.type === "image") {
    const mediaType: ImageMediaType = (
      VALID_IMAGE_TYPES as readonly string[]
    ).includes(attachment.mediaType)
      ? (attachment.mediaType as ImageMediaType)
      : "image/jpeg";

    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: attachment.data,
      },
    } satisfies Anthropic.ImageBlockParam;
  }

  if (attachment.type === "document") {
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: attachment.data,
      },
    } as Anthropic.ContentBlockParam;
  }

  // "text" attachments with no structured representation are dropped.
  return null;
}

/**
 * Map an array of AttachmentInput → Anthropic content blocks, filtering nulls.
 */
export function buildAnthropicContentBlocks(
  attachments: AttachmentInput[],
): Anthropic.ContentBlockParam[] {
  return attachments
    .map(buildAnthropicMessageBlock)
    .filter((b): b is Anthropic.ContentBlockParam => b !== null);
}
