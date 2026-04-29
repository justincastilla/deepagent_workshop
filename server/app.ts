/**
 * Workshop web UI server — Express + WebSocket.
 *
 * Serves a single-page UI that lets Attendees submit a research query,
 * then streams orchestrator activity (subagent dispatches, tool calls,
 * tool results, final synthesis) over a WebSocket so they can watch the
 * deep agent unfold in real time.
 *
 * Architecture:
 *   GET  /          → static index.html + app.js + styles.css
 *   WS   /ws        → connect, send {query: "..."}, receive event stream
 *
 * Run with:  npm run dev
 */

import "dotenv/config";

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { WebSocketServer, type WebSocket } from "ws";

import { orchestrator } from "../src/orchestrator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.static(join(__dirname, "public")));

const PORT = Number(process.env.PORT ?? 3000);
const server = app.listen(PORT, () => {
  console.log(`\n  Workshop web UI: http://localhost:${PORT}\n`);
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    void handleMessage(ws, raw.toString());
  });
});

async function handleMessage(ws: WebSocket, raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return send(ws, { type: "error", error: "invalid JSON" });
  }

  const query =
    parsed && typeof parsed === "object" && "query" in parsed
      ? String((parsed as { query: unknown }).query ?? "")
      : "";

  if (!query.trim()) {
    return send(ws, { type: "error", error: "missing query" });
  }

  send(ws, { type: "started", query });

  try {
    const stream = orchestrator.streamEvents(
      { messages: [{ role: "user", content: query }] },
      { version: "v2" },
    );

    for await (const event of stream) {
      const forwarded = filterEvent(event);
      if (forwarded) send(ws, forwarded);
    }

    send(ws, { type: "done" });
  } catch (err) {
    console.error("orchestrator run failed:", err);
    send(ws, {
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function send(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Decide which streamed events get forwarded to the browser. We
 * intentionally drop noisy token-level events and only keep the
 * structural ones that explain what the agent is doing.
 */
function filterEvent(event: {
  event: string;
  name?: string;
  data?: unknown;
  metadata?: Record<string, unknown>;
  run_id?: string;
}): Record<string, unknown> | null {
  const runId = event.run_id;

  switch (event.event) {
    case "on_tool_start": {
      const data = event.data as { input?: unknown };
      return {
        type: "tool_start",
        tool: event.name ?? "unknown",
        input: data.input,
        runId,
      };
    }
    case "on_tool_end": {
      const data = event.data as { output?: unknown };
      const out = data.output;
      const text = typeof out === "string" ? out : JSON.stringify(out);
      return {
        type: "tool_end",
        tool: event.name ?? "unknown",
        output_preview: text?.slice(0, 600) ?? "",
        truncated: (text?.length ?? 0) > 600,
        runId,
      };
    }
    case "on_chat_model_end": {
      const data = event.data as {
        output?: { content?: unknown; tool_calls?: unknown[] };
      };
      const content = data.output?.content;
      const toolCalls = data.output?.tool_calls;
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        return {
          type: "model_decision",
          tool_calls: toolCalls.map((tc: { name?: string; args?: unknown }) => ({
            name: tc.name,
            args: tc.args,
          })),
          runId,
        };
      }
      if (typeof content === "string" && content.trim().length > 0) {
        return {
          type: "message",
          content,
          runId,
        };
      }
      return null;
    }
    default:
      return null;
  }
}
