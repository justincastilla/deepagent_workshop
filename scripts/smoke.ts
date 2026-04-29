/**
 * End-to-end smoke test for the LLM stack.
 *
 * Builds a minimal deep agent with one trivial tool and asks it one
 * question. Validates the full chain in a single shot:
 *
 *   deepagents → ChatOpenAI → LiteLLM proxy (OpenAI format)
 *              → Azure /anthropic/v1/messages → Claude Sonnet → back
 *
 * If this prints a sensible final message, the JS stack is wired
 * correctly and we can build everything else on top.
 *
 * Run:
 *   npm run smoke
 *
 * Requires in .env:
 *   LITELLM_API_KEY   (a master or virtual key from your proxy)
 *   LITELLM_API_BASE  (https://deepagent-workshop.fly.dev)
 */

import "dotenv/config";

import { tool } from "@langchain/core/tools";
import { createDeepAgent } from "deepagents";
import { z } from "zod";

import { createLLM } from "../src/llm.js";

// One trivial tool so the agent has SOMETHING to call. The contents
// don't matter — we're just verifying the agent loop runs.
const sayHello = tool(
  async ({ name }) => `Hello, ${name}! The smoke test reached the tool layer.`,
  {
    name: "sayHello",
    description: "Greets a person by name. Use this when asked to greet someone.",
    schema: z.object({
      name: z.string().describe("the name of the person to greet"),
    }),
  },
);

async function main() {
  console.log("Building smoke-test agent...");
  const agent = createDeepAgent({
    model: createLLM(),
    systemPrompt:
      "You are a friendly test agent. When asked to greet someone, call the sayHello tool. Keep replies brief.",
    tools: [sayHello],
  });

  console.log("Invoking with a one-shot prompt...\n");
  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "Please greet 'workshop' using your tool, then say one short sentence about what you did.",
      },
    ],
  });

  console.log("=== Full message log ===");
  for (const msg of result.messages) {
    const role = (msg as { _getType?: () => string })._getType?.() ?? msg.constructor.name;
    const content =
      typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content, null, 2);
    console.log(`\n[${role}]`);
    console.log(content);
  }

  console.log("\n=== Final agent reply ===");
  const last = result.messages.at(-1);
  console.log(typeof last?.content === "string" ? last.content : JSON.stringify(last?.content));
}

main().catch((err) => {
  console.error("\nSmoke test failed:");
  console.error(err);
  process.exit(1);
});
