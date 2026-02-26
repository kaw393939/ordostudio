/**
 * message-adapters.ts — R-12 conversion utilities for conversation messages
 *
 * Contains typed adapters that translate `ConversationMessage` rows (the
 * internal representation stored in the DB) into the format expected by each
 * LLM provider API.
 *
 * Keeping these conversions here (rather than inline in the route) makes
 * the route orchestrator easier to read and the adapters independently testable.
 */

import type OpenAI from "openai";
import type { ConversationMessage } from "@/lib/api/conversation-store";

/**
 * Convert an array of `ConversationMessage` rows to the OpenAI
 * `ChatCompletionMessageParam[]` format expected by the Chat Completions API.
 *
 * Throws if a `tool` role message is missing `tool_call_id` — an empty
 * `tool_call_id` would cause a 400 from the OpenAI API and indicates a
 * data integrity problem that should be surfaced immediately.
 */
export function toOAIMessages(
  messages: ConversationMessage[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      if (!m.tool_call_id) {
        throw new Error(
          `[toOAIMessages] tool message is missing tool_call_id — data integrity error. ` +
            `content preview: "${m.content.slice(0, 60)}"`,
        );
      }
      return {
        role: "tool" as const,
        content: m.content,
        tool_call_id: m.tool_call_id,
      };
    }
    if (m.role === "assistant") {
      return { role: "assistant" as const, content: m.content };
    }
    return { role: "user" as const, content: m.content };
  });
}
