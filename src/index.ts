/**
 * CLI entrypoint for the orchestrator.
 *
 * Pass a query as command-line arguments; if none, uses a default
 * question. Prints the final agent reply to stdout.
 *
 *   tsx src/index.ts "Evaluate elastic/elasticsearch as a search technology"
 *
 * (Once the web UI lands in task #8, `npm run dev` will start the
 * server instead of running this CLI.)
 */

import "dotenv/config";

import { orchestrator } from "./orchestrator.js";

async function main() {
  const query =
    process.argv.slice(2).join(" ") ||
    "Evaluate elastic/elasticsearch — should we recommend it?";

  console.log(`Query: ${query}\n`);
  console.log("Invoking orchestrator (this routes through subagents)...\n");

  const result = await orchestrator.invoke({
    messages: [{ role: "user", content: query }],
  });

  console.log("\n=== Final reply ===\n");
  const last = result.messages.at(-1);
  console.log(
    typeof last?.content === "string"
      ? last.content
      : JSON.stringify(last?.content, null, 2),
  );

  console.log(`\n=== Total messages exchanged: ${result.messages.length} ===`);
}

main().catch((err) => {
  console.error("\nOrchestrator run failed:");
  console.error(err);
  process.exit(1);
});
