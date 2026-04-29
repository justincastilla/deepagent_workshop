/**
 * Sanity check for Build Step 2.
 *
 * Invokes the askElasticAgent LangGraph tool directly — still no agent
 * loop, still no orchestrator — and ASSERTS:
 *
 *   - the tool returns a non-empty string
 *   - the tool's invocation didn't throw
 *
 * Run this after you've finished implementing src/tools/askElasticAgent.ts:
 *
 *     npm run test:tool
 *
 * If you see "Build 2 sanity check passed", move on to Build Step 3.
 */

import "dotenv/config";

import { askElasticAgent } from "../src/tools/askElasticAgent.js";

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function main() {
  console.log("Invoking askElasticAgent tool with a test query...\n");

  const result = await askElasticAgent.invoke({
    query: "Find technologies similar to 'AI agent orchestration frameworks'",
  });

  // Assertions
  const errors: string[] = [];
  if (typeof result !== "string") {
    errors.push(`tool returned a non-string (${typeof result})`);
  } else if (result.length === 0) {
    errors.push("tool returned an empty string");
  }

  if (errors.length > 0) {
    console.log(c.red("✗ Build 2 sanity check FAILED:"));
    for (const e of errors) console.log(`  - ${e}`);
    console.log("");
    console.log(c.dim("Raw tool output:"));
    console.log(c.dim(String(result).slice(0, 600)));
    process.exit(1);
  }

  console.log(c.green("✓ Build 2 sanity check passed."));
  console.log("");
  console.log(c.bold("Tool output") + ` (${result.length} chars):`);
  console.log(result.slice(0, 500) + (result.length > 500 ? "…" : ""));
  console.log("");
  console.log("Move to Build Step 3.");
}

main().catch((err) => {
  console.error(c.red("\ntest:tool failed:"));
  console.error(err);
  process.exit(1);
});
