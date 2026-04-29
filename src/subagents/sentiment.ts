/**
 * Sentiment subagent — community sentiment specialist.
 *
 * Pulls the most-recent N issues from a GitHub repo (filtering out PRs,
 * which the same endpoint returns) and hands the title + body preview
 * back to the subagent's LLM for thematic analysis.
 *
 * Auth: GITHUB_API_KEY in .env.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { githubFetch } from "../tools/github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const sentimentPrompt = readFileSync(
  join(__dirname, "../prompts/sentiment.md"),
  "utf8",
);

type GitHubIssue = {
  number: number;
  title: string;
  state: string;
  body: string | null;
  labels: { name: string }[];
  comments: number;
  created_at: string;
  html_url: string;
  pull_request?: unknown;
};

const fetchRecentIssues = tool(
  async ({ owner, repo, limit }) => {
    const lim = Math.min(Math.max(limit ?? 10, 1), 30);
    const res = await githubFetch(
      `/repos/${owner}/${repo}/issues?per_page=${lim}&state=all&sort=created&direction=desc`,
    );
    const raw = (await res.json()) as GitHubIssue[];

    // The issues endpoint returns PRs too — filter them out.
    const issues = raw
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        body_preview: (i.body ?? "").slice(0, 800),
        labels: i.labels.map((l) => l.name),
        comments: i.comments,
        created_at: i.created_at,
        url: i.html_url,
      }));

    return JSON.stringify(
      {
        repo: `${owner}/${repo}`,
        count: issues.length,
        issues,
      },
      null,
      2,
    );
  },
  {
    name: "fetchRecentIssues",
    description:
      "Fetch the most-recent N issues for a GitHub repo (excluding pull requests). Returns titles, body previews, labels, and comment counts.",
    schema: z.object({
      owner: z.string().describe("repo owner / org name"),
      repo: z.string().describe("repo name"),
      limit: z
        .number()
        .default(10)
        .describe("how many issues to fetch (1-30, default 10)"),
    }),
  },
);

export const sentimentSubagent = {
  name: "sentiment-agent",
  description:
    "Use to analyze community sentiment for a GitHub repo: pain points, praise, recurring themes from recent issues.",
  systemPrompt: sentimentPrompt,
  tools: [fetchRecentIssues],
};
