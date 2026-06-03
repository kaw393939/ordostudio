/**
 * Live integration tests for Gemini embedding and LLM support.
 *
 * Requires GOOGLE_GEMINI_API_KEY in the environment.
 * These tests hit the real Gemini API — skip if key is not set.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const SKIP = !process.env.GOOGLE_GEMINI_API_KEY;

describe.skipIf(SKIP)("Gemini live integration", () => {
  // -----------------------------------------------------------------------
  // Embedding: Gemini text-embedding-004
  // -----------------------------------------------------------------------
  describe("Gemini embeddings", () => {
    let originalOpenAIKey: string | undefined;

    beforeAll(() => {
      // Temporarily remove OpenAI key so Gemini provider is selected
      originalOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
    });

    afterAll(() => {
      // Restore OpenAI key
      if (originalOpenAIKey) {
        process.env.OPENAI_API_KEY = originalOpenAIKey;
      }
    });

    it("isEmbeddingAvailable returns true when Gemini key is set", async () => {
      const { isEmbeddingAvailable } = await import("../client");
      expect(isEmbeddingAvailable()).toBe(true);
    });

    it("embed() returns a Float32Array with Gemini", async () => {
      // Dynamic import to pick up env changes
      const mod = await import("../client");
      const vector = await mod.embed("What is the meaning of life?");

      expect(vector).toBeInstanceOf(Float32Array);
      expect(vector.length).toBeGreaterThan(0);
      // Gemini gemini-embedding-001 produces 3072 dims by default
      expect(vector.length).toBe(3072);
    });

    it("embed() returns consistent results for the same input", async () => {
      const mod = await import("../client");
      const v1 = await mod.embed("Hello world");
      const v2 = await mod.embed("Hello world");

      expect(v1.length).toBe(v2.length);
      // Should be identical (cached or deterministic)
      for (let i = 0; i < v1.length; i++) {
        expect(v1[i]).toBeCloseTo(v2[i], 5);
      }
    });

    it("embed() returns different vectors for different inputs", async () => {
      const mod = await import("../client");
      const v1 = await mod.embed("The cat sat on the mat");
      const v2 = await mod.embed("Quantum chromodynamics is a gauge theory");

      expect(v1.length).toBe(v2.length);
      // Vectors should differ meaningfully
      let diffSum = 0;
      for (let i = 0; i < v1.length; i++) {
        diffSum += Math.abs(v1[i] - v2[i]);
      }
      expect(diffSum).toBeGreaterThan(1);
    });
  });

  // -----------------------------------------------------------------------
  // LLM: Gemini chat streaming
  // -----------------------------------------------------------------------
  describe("Gemini LLM streaming", () => {
    it("runGeminiAgentLoopStream produces text deltas", async () => {
      const { runGeminiAgentLoopStream } = await import("../../llm-gemini");

      const deltas: string[] = [];
      const result = await runGeminiAgentLoopStream({
        systemPrompt: "You are a helpful assistant. Reply in one short sentence.",
        messages: [
          { role: "user", parts: [{ text: "What color is the sky?" }] },
        ],
        tools: [],
        executeToolFn: async () => ({}),
        maxToolRounds: 1,
        callbacks: {
          onDelta: (text) => deltas.push(text),
        },
      });

      const fullText = deltas.join("");
      expect(fullText.length).toBeGreaterThan(0);
      expect(fullText.toLowerCase()).toContain("blue");
      expect(result.toolEvents).toEqual([]);
      expect(result.capturedValues).toEqual({});
    });

    it("runGeminiAgentLoopStream handles tool calls", async () => {
      const { runGeminiAgentLoopStream } = await import("../../llm-gemini");

      const toolCalls: string[] = [];
      const deltas: string[] = [];

      const result = await runGeminiAgentLoopStream({
        systemPrompt:
          "You are an assistant. When the user asks about the weather, call the get_weather tool. After getting the result, report it to the user.",
        messages: [
          { role: "user", parts: [{ text: "What's the weather in Paris?" }] },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get current weather for a city",
              parameters: {
                type: "object",
                properties: {
                  city: { type: "string", description: "City name" },
                },
                required: ["city"],
              },
            },
          },
        ],
        executeToolFn: async (name, args) => {
          toolCalls.push(name);
          return { temperature: "22°C", condition: "Sunny" };
        },
        maxToolRounds: 4,
        callbacks: {
          onDelta: (text) => deltas.push(text),
        },
      });

      // The model should have called the tool
      expect(toolCalls).toContain("get_weather");
      expect(result.toolEvents.length).toBeGreaterThanOrEqual(2); // call + result

      // After tool result, model should produce a response mentioning the weather
      const fullText = deltas.join("");
      expect(fullText.length).toBeGreaterThan(0);
    });
  });
});
