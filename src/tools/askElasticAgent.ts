/**
 * `askElasticAgent` — the LangGraph tool the Elastic subagent uses to
 * delegate data retrieval to Kibana Agent Builder.
 *
 * ATTENDEES: this is Build Step 2. Wrap the Kibana client (Build Step 1)
 * as a tool the subagent can call. When you're done, run:
 *
 *     npm run test:tool
 *
 * If that prints a reply from the agent, you're cleared to move on to
 * Build Step 3 (the subagent itself).
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { converse } from "./kibanaClient.js";

// ---------------------------------------------------------------------
// TODO 1: define the tool's input schema with Zod.
//
// Required field:
//   - query: string
//       Natural-language description of what data to fetch.
//       Use .describe() liberally — the LLM reads these.
//
// Optional field:
//   - conversationId: string
//       For continuing a multi-turn conversation across tool calls.
// ---------------------------------------------------------------------
const askElasticAgentSchema = z.object({
  // <- fill in
});

export const askElasticAgent = tool(
  async (input: z.infer<typeof askElasticAgentSchema>) => {
    // -----------------------------------------------------------------
    // TODO 2: call converse() with the right arguments and return the
    // agent's reply text.
    //
    // The string you return here is what the subagent's LLM will see as
    // the tool's output. Returning a structured object is fine too — the
    // LLM will see it stringified.
    //
    // Hints:
    //   - agentId comes from process.env.ELASTIC_AGENT_ID
    //   - input.query → converse's input
    //   - input.conversationId (if set) → converse's conversationId
    // -----------------------------------------------------------------
    throw new Error("askElasticAgent is not implemented yet — finish Build Step 2.");
  },
  {
    name: "askElasticAgent",

    // -----------------------------------------------------------------
    // TODO 3: write the tool description.
    //
    // This is what the LLM reads when deciding whether (and how) to call
    // this tool. The Python original is a very good reference — your
    // instructor has it on screen. Things to include:
    //
    //   - What the tool does (sends NL → Kibana Agent Builder)
    //   - What kinds of data the agent can fetch (semantic search,
    //     historical snapshots, adoption signals, reports, ...)
    //   - Argument hints with examples (be specific about repos +
    //     time ranges)
    // -----------------------------------------------------------------
    description: "TODO: describe what this tool does and when to use it.",

    schema: askElasticAgentSchema,
  },
);
