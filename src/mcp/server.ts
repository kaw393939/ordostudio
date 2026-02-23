import { once } from "node:events";

import type { ApiActor } from "../lib/api/actor";
import { createToolRegistry } from "./tools";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type JsonRpcResponse =
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      result: unknown;
    }
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      error: { code: number; message: string; data?: unknown };
    };

const encodeFrame = (payload: unknown): Buffer<ArrayBufferLike> => {
  const json = JSON.stringify(payload);
  const body: Buffer<ArrayBufferLike> = Buffer.from(json, "utf8");
  const header: Buffer<ArrayBufferLike> = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  return Buffer.concat([header, body]);
};

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseFrames = (buffer: Buffer<ArrayBufferLike>): { messages: unknown[]; rest: Buffer<ArrayBufferLike> } => {
  const messages: unknown[] = [];
  let rest = buffer;

  while (true) {
    const headerEnd = rest.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;

    const headerText = rest.slice(0, headerEnd).toString("utf8");
    const match = headerText.match(/content-length:\s*(\d+)/i);
    if (!match) {
      rest = rest.slice(headerEnd + 4);
      continue;
    }

    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + length;
    if (rest.length < bodyEnd) break;

    const body = rest.slice(bodyStart, bodyEnd).toString("utf8");
    rest = rest.slice(bodyEnd);

    try {
      messages.push(JSON.parse(body) as unknown);
    } catch {
      messages.push({ jsonrpc: "2.0", id: null, method: "__parse_error__", params: { raw: body } });
    }
  }

  return { messages, rest };
};

const jsonRpcError = (id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message, data },
});

const jsonRpcResult = (id: JsonRpcId, result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });

export const createMcpServer = (input: {
  serverName: string;
  serverVersion: string;
  auth: { ok: true; actor: ApiActor } | { ok: false; error: "missing_token" | "invalid_token" };
  requestIdFactory: () => string;
}) => {
  const tools = createToolRegistry();
  const toolCallTimestampsMs: number[] = [];

  const allowToolCall = (): boolean => {
    const now = Date.now();
    const windowMs = 60_000;
    while (toolCallTimestampsMs.length > 0 && toolCallTimestampsMs[0]! < now - windowMs) {
      toolCallTimestampsMs.shift();
    }

    const maxPerMinute = 60;
    if (toolCallTimestampsMs.length >= maxPerMinute) return false;
    toolCallTimestampsMs.push(now);
    return true;
  };

  const write = (msg: JsonRpcResponse) => {
    process.stdout.write(encodeFrame(msg));
  };

  const requireAuth = (id: JsonRpcId): { ok: true; actor: ApiActor } | { ok: false; responded: true } => {
    if (input.auth.ok) return input.auth;

    const detail = input.auth.error === "missing_token" ? "MCP token required." : "Invalid or revoked MCP token.";
    write(jsonRpcError(id, -32001, "Unauthorized", { detail }));
    return { ok: false, responded: true };
  };

  const handle = async (message: unknown) => {
    if (!isObject(message)) return;

    const request = message as JsonRpcRequest;
    const id = (request.id ?? null) as JsonRpcId;
    const method = request.method;
    if (!method || typeof method !== "string") {
      write(jsonRpcError(id, -32600, "Invalid Request"));
      return;
    }

    if (method === "initialize") {
      write(
        jsonRpcResult(id, {
          protocolVersion: "2024-11-05",
          serverInfo: { name: input.serverName, version: input.serverVersion },
          capabilities: { tools: {} },
        }),
      );
      return;
    }

    if (method === "tools/list") {
      const auth = requireAuth(id);
      if (!auth.ok) return;
      write(jsonRpcResult(id, { tools: tools.list() }));
      return;
    }

    if (method === "tools/call") {
      const auth = requireAuth(id);
      if (!auth.ok) return;

      if (!allowToolCall()) {
        write(jsonRpcError(id, -32029, "Rate limited", { detail: "Too many tool calls." }));
        return;
      }

      if (!isObject(request.params)) {
        write(jsonRpcError(id, -32602, "Invalid params"));
        return;
      }

      const name = request.params.name;
      const args = request.params.arguments;
      if (typeof name !== "string") {
        write(jsonRpcError(id, -32602, "Invalid params", { detail: "name is required" }));
        return;
      }

      try {
        const result = await tools.call(name, args, {
          actor: auth.actor,
          requestId: input.requestIdFactory(),
        });
        write(jsonRpcResult(id, result));
      } catch (error) {
        write(
          jsonRpcError(id, -32000, "Tool execution failed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }

      return;
    }

    write(jsonRpcError(id, -32601, "Method not found"));
  };

  const run = async () => {
    process.stdin.resume();

    let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    process.stdin.on("data", async (chunk: Buffer<ArrayBufferLike>) => {
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = parseFrames(buffer);
      buffer = parsed.rest;
      for (const msg of parsed.messages) {
        await handle(msg);
      }
    });

    await once(process.stdin, "end");
  };

  return { run };
};
