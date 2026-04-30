/**
 * askElasticAgent tool — SOLUTION.
 *
 * Working answer key for Build Step 2. Drop-in replacement for
 * src/tools/askElasticAgent.ts.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { converse } from "./kibanaClient.js";

const askElasticAgentSchema = z.object({
  query: z
    .string()
    .describe(
      "Natural-language description of what data to fetch from Elasticsearch. " +
      "Be specific about repository names, time ranges, and intent. " +
      "Examples: 'Find technologies similar to real-time observability', " +
      "'Get the latest research report for elastic/elasticsearch'.",
    ),
  conversationId: z
    .string()
    .optional()
    .describe(
      "Optional conversation ID returned by a previous askElasticAgent call. " +
      "Pass to continue a multi-turn conversation with the Elastic Agent.",
    ),
});

export const askElasticAgent = tool(
  async (input: z.infer<typeof askElasticAgentSchema>) => {
    const agentId = process.env.ELASTIC_AGENT_ID;
    if (!agentId) {
      throw new Error("Missing ELASTIC_AGENT_ID in .env");
    }

    const { text } = await converse({
      agentId,
      input: input.query,
      conversationId: input.conversationId,
    });

    return text;
  },
  {
    name: "askElasticAgent",
    description:
      "Send a natural-language request to the Elastic Agent and return its " +
      "response. The agent has access to ES|QL tools for searching, " +
      "retrieving, and analysing technology research data stored in " +
      "Elasticsearch. Use this for any data retrieval from Elasticsearch, " +
      "including: finding similar technologies via semantic search, " +
      "retrieving historical snapshots and trend data, getting adoption " +
      "signals, fetching past research reports. Be specific in queries: " +
      "include full repo names (e.g. 'elastic/elasticsearch') and time " +
      "ranges where relevant.",
    schema: askElasticAgentSchema,
  },
);
