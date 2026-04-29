/**
 * Metrics subagent — GitHub repo metrics specialist.
 *
 * Calls the GitHub REST API for an owner/repo pair and returns:
 *   - stars, forks, watchers, open_issues
 *   - contributors (counted via Link-header pagination trick)
 *   - commits in the last 7 days
 *
 * Auth: GITHUB_API_KEY (PAT) in .env.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { githubFetch, totalFromLinkHeader } from "../tools/github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const metricsPrompt = readFileSync(
  join(__dirname, "../prompts/metrics.md"),
  "utf8",
);

const fetchRepoMetrics = tool(
  async ({ owner, repo }) => {
    // 1) Repo info — single call, gets stars/forks/watchers/open_issues.
    const repoRes = await githubFetch(`/repos/${owner}/${repo}`);
    const repoData = (await repoRes.json()) as {
      stargazers_count: number;
      forks_count: number;
      subscribers_count: number;
      open_issues_count: number;
      pushed_at: string;
    };

    // 2) Contributor count — via Link-header pagination trick. Cheap.
    const contribRes = await githubFetch(
      `/repos/${owner}/${repo}/contributors?per_page=1&anon=1`,
    );
    let contributors = totalFromLinkHeader(contribRes.headers.get("Link"));
    if (contributors == null) {
      // No Link header means the result fits on one page. Count the body.
      const body = (await contribRes.json()) as unknown[];
      contributors = Array.isArray(body) ? body.length : 0;
    }

    // 3) Commits in the last 7 days.
    const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
    const commitsRes = await githubFetch(
      `/repos/${owner}/${repo}/commits?since=${since}&per_page=100`,
    );
    const commits = (await commitsRes.json()) as unknown[];
    const commitsLastWeek = Array.isArray(commits) ? commits.length : 0;

    return JSON.stringify(
      {
        repo: `${owner}/${repo}`,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.subscribers_count,
        open_issues: repoData.open_issues_count,
        contributors,
        commits_last_week: commitsLastWeek,
        last_pushed: repoData.pushed_at,
      },
      null,
      2,
    );
  },
  {
    name: "fetchRepoMetrics",
    description:
      "Fetch GitHub repository metrics: stars, forks, watchers, contributors, commits in the last 7 days, open issues count.",
    schema: z.object({
      owner: z.string().describe("repo owner / org name (e.g. 'elastic')"),
      repo: z.string().describe("repo name (e.g. 'elasticsearch')"),
    }),
  },
);

export const metricsSubagent = {
  name: "metrics-agent",
  description:
    "Use to fetch GitHub repository metrics: stars, forks, contributors, commit velocity. Pass an owner/repo pair.",
  systemPrompt: metricsPrompt,
  tools: [fetchRepoMetrics],
};
