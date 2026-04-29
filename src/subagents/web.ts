/**
 * Web subagent — web adoption signals specialist.
 *
 * Calls Tavily's search API for a natural-language query and returns
 * ranked results (title, URL, content preview, relevance score).
 *
 * Auth: TAVILY_API_KEY in .env.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

const webPrompt = readFileSync(join(__dirname, "../prompts/web.md"), "utf8");

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}. Set it in .env.`);
  return v;
}

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

const searchAdoptionSignals = tool(
  async ({ query, maxResults }) => {
    const apiKey = requireEnv("TAVILY_API_KEY");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: maxResults ?? 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Tavily error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { results: TavilyResult[] };

    return JSON.stringify(
      {
        query,
        result_count: data.results?.length ?? 0,
        results: (data.results ?? []).map((r) => ({
          title: r.title,
          url: r.url,
          content_preview: (r.content ?? "").slice(0, 400),
          score: r.score,
        })),
      },
      null,
      2,
    );
  },
  {
    name: "searchAdoptionSignals",
    description:
      "Web-search for blog posts, case studies, talks, and job postings about a technology. Use a focused natural-language query.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "the natural-language search query (e.g. 'who is using LangGraph in production?')",
        ),
      maxResults: z
        .number()
        .default(5)
        .describe("how many results to return (1-10, default 5)"),
    }),
  },
);

export const webSubagent = {
  name: "web-agent",
  description:
    "Use to search the web for adoption evidence of a technology: blog posts, case studies, conference talks, job postings.",
  systemPrompt: webPrompt,
  tools: [searchAdoptionSignals],
};
