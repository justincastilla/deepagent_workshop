/**
 * Orchestrator — the top-level deep agent.
 *
 * Dispatches user queries to one of four specialist subagents:
 *   - metrics-agent   (GitHub stats)
 *   - sentiment-agent (community mood)
 *   - web-agent       (adoption signals)
 *   - elastic-agent   (cached/historical research data)
 *
 * Each subagent has its own system prompt and tools. The orchestrator
 * itself reads its prompt from src/prompts/orchestrator.md and the
 * three non-elastic subagents are currently stubbed (task #7) — they
 * return canned data so the orchestrator can route to them without
 * crashing while we workshop the elastic subagent.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createDeepAgent } from "deepagents";

import { createLLM } from "./llm.js";
import { elasticSubagent } from "./subagents/elastic.js";
import { metricsSubagent } from "./subagents/metrics.js";
import { sentimentSubagent } from "./subagents/sentiment.js";
import { webSubagent } from "./subagents/web.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const orchestratorPrompt = readFileSync(
  join(__dirname, "prompts/orchestrator.md"),
  "utf8",
);

export const orchestrator = createDeepAgent({
  model: createLLM(),
  systemPrompt: orchestratorPrompt,
  subagents: [
    metricsSubagent,
    sentimentSubagent,
    webSubagent,
    elasticSubagent,
  ],
});
