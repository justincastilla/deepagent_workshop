/**
 * Sanity check for Build Step 1.
 *
 * Calls the Kibana client directly — no agent loop, no orchestrator —
 * with a known query and ASSERTS the response shape:
 *
 *   - returns an object
 *   - .text is a non-empty string
 *   - .conversationId is a non-empty string
 *
 * Run this after you've finished implementing src/tools/kibanaClient.ts:
 *
 *     npm run test:client
 *
 * If you see "Build 1 sanity check passed", you're cleared to move to
 * Build Step 2. If it fails, the listed errors tell you what's wrong.
 */

import "dotenv/config";

import { converse } from "../src/tools/kibanaClient.js";

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function main() {
  const agentId = process.env.ELASTIC_AGENT_ID;
  if (!agentId) {
    throw new Error(
      "Missing ELASTIC_AGENT_ID in .env — did you run ./es-sandbox/setup.sh?",
    );
  }

  console.log("Calling converse() with a test query...\n");

  const result = await converse({
    agentId,
    input:
      "Find technologies similar to 'real-time observability and metrics monitoring', limit 3",
  });

  // Assertions
  const errors: string[] = [];
  if (!result || typeof result !== "object") {
    errors.push("converse() didn't return an object");
  } else {
    if (typeof (result as { text?: unknown }).text !== "string") {
      errors.push("result.text is not a string");
    } else if ((result as { text: string }).text.length === 0) {
      errors.push("result.text is empty");
    }
    if (
      typeof (result as { conversationId?: unknown }).conversationId !== "string"
    ) {
      errors.push("result.conversationId is not a string");
    } else if ((result as { conversationId: string }).conversationId.length === 0) {
      errors.push("result.conversationId is empty");
    }
  }

  if (errors.length > 0) {
    console.log(
      c.red(
        `✗ Build 1 sanity check FAILED (${errors.length} issue${errors.length === 1 ? "" : "s"}):`,
      ),
    );
    for (const e of errors) console.log(`  - ${e}`);
    console.log("");
    console.log(c.dim("Raw response from converse():"));
    console.log(c.dim(JSON.stringify(result, null, 2).slice(0, 600)));
    process.exit(1);
  }

  console.log(c.green("✓ Build 1 sanity check passed."));
  console.log("");
  console.log(c.bold("Sample agent reply") + ` (${result.text.length} chars):`);
  console.log(result.text.slice(0, 300) + (result.text.length > 300 ? "…" : ""));
  console.log("");
  console.log(c.bold("Conversation ID: ") + c.dim(result.conversationId));
  console.log("");
  console.log("Move to Build Step 2.");
}

main().catch((err) => {
  console.error(c.red("\ntest:client failed:"));
  console.error(err);
  process.exit(1);
});
