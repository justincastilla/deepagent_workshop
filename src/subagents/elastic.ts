/**
 * Elastic subagent — the workshop's centerpiece.
 *
 * ATTENDEES: this is Build Step 3. With Build Steps 1 and 2 done, you'll
 * now wire the system prompt and the askElasticAgent tool into a
 * deepagents subagent definition. The orchestrator already imports this
 * file and registers the subagent, so once you finish here, ask the
 * orchestrator a question through the web UI and watch this subagent
 * fire.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { askElasticAgent } from "../tools/askElasticAgent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------
// TODO 1: load the system prompt from src/prompts/elastic.md
//
// Hint:
//   readFileSync(join(__dirname, "../prompts/elastic.md"), "utf8")
// ---------------------------------------------------------------------
const elasticPrompt: string = "TODO: load src/prompts/elastic.md";

/**
 * The Elastic subagent definition.
 *
 * A deepagents subagent is a plain object with these keys:
 *   - name          unique short identifier the orchestrator routes on
 *   - description   WHEN to delegate to this agent — read by the
 *                   orchestrator's LLM at routing time
 *   - systemPrompt  the system prompt for this subagent's LLM
 *   - tools         the tools this subagent can call
 */
export const elasticSubagent = {
  name: "elastic-agent",

  // -----------------------------------------------------------------
  // TODO 2: write the description.
  //
  // The orchestrator reads this when deciding whether to dispatch a
  // request to YOU. Be concise and specific. Example shape:
  //
  //   "Use for retrieving cached/historical Elasticsearch data:
  //    snapshots, similar technologies (semantic search), adoption
  //    signals, prior research reports."
  // -----------------------------------------------------------------
  description: "TODO: describe when to delegate to this agent.",

  systemPrompt: elasticPrompt,

  tools: [askElasticAgent],
};
