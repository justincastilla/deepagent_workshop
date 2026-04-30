/**
 * Elastic subagent — SOLUTION.
 *
 * Working answer key for Build Step 3. Drop-in replacement for
 * src/subagents/elastic.ts.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { askElasticAgent } from "../tools/askElasticAgent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const elasticPrompt = readFileSync(
  join(__dirname, "../prompts/elastic.md"),
  "utf8",
);

export const elasticSubagent = {
  name: "elastic-agent",
  description:
    "Use to retrieve cached or historical research data from Elasticsearch: " +
    "prior research reports, technology snapshots, time-series trends, " +
    "adoption signals, and similar technologies via semantic search. " +
    "Always check elastic-agent BEFORE triggering fresh data collection " +
    "from other subagents — the data may already exist.",
  systemPrompt: elasticPrompt,
  tools: [askElasticAgent],
};
