/**
 * Pre-workshop setup verification.
 *
 * Run this AFTER `.env` is filled in to confirm everything's wired up
 * before workshop day. It checks env vars, then pings each service
 * (LiteLLM, Elasticsearch, Kibana, the Agent Builder agent, GitHub,
 * Tavily) and prints a green check or red X for each.
 *
 *     npm run verify
 *
 * If all checks pass, you're ready. If any fail, the hint after the X
 * tells you what to fix.
 */

import "dotenv/config";

type CheckResult = {
  ok: boolean;
  message: string;
  hint?: string;
};

type Check = {
  name: string;
  run: () => Promise<CheckResult>;
};

// ---------- ANSI helpers (no deps) ------------------------------------

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

// ---------- check helpers ---------------------------------------------

function checkEnv(name: string): CheckResult {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    return {
      ok: false,
      message: "missing or empty",
      hint: `Set ${name} in your .env (see .env.example)`,
    };
  }
  return { ok: true, message: "set" };
}

async function timed<T>(
  fn: () => Promise<T>,
  timeoutMs = 8000,
): Promise<T> {
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

async function pingLiteLLM(): Promise<CheckResult> {
  const base = process.env.LITELLM_API_BASE;
  const key = process.env.LITELLM_API_KEY;
  if (!base || !key) return { ok: false, message: "env vars not set" };
  try {
    const res = await timed(() =>
      fetch(`${base.replace(/\/$/, "")}/v1/models`, {
        headers: { Authorization: `Bearer ${key}` },
      }),
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status}`,
        hint: "Check LITELLM_API_KEY (the sk- value from your handout) and LITELLM_API_BASE",
      };
    }
    return { ok: true, message: "200 OK" };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
      hint: "Is the LITELLM_API_BASE URL correct? Are you online?",
    };
  }
}

async function pingES(): Promise<CheckResult> {
  const host = process.env.ELASTICSEARCH_HOST;
  const key = process.env.ELASTICSEARCH_API_KEY;
  if (!host || !key) return { ok: false, message: "env vars not set" };
  try {
    const res = await timed(() =>
      fetch(`${host.replace(/\/$/, "")}/_cluster/health?timeout=2s`, {
        headers: { Authorization: `ApiKey ${key}` },
      }),
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status}`,
        hint:
          "Is start-local running? Try `docker ps | grep es-local`. " +
          "If ES is up, check ELASTICSEARCH_API_KEY matches the value in elastic-start-local/.env",
      };
    }
    const body = (await res.json()) as { status: string; number_of_nodes: number };
    return {
      ok: true,
      message: `cluster=${body.status}, nodes=${body.number_of_nodes}`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
      hint: "Is ES reachable at ELASTICSEARCH_HOST? Default for start-local is http://localhost:9200",
    };
  }
}

async function pingKibana(): Promise<CheckResult> {
  const url = process.env.KIBANA_URL;
  const key = process.env.ELASTICSEARCH_API_KEY;
  if (!url || !key) return { ok: false, message: "env vars not set" };
  try {
    const res = await timed(() =>
      fetch(`${url.replace(/\/$/, "")}/api/status`, {
        headers: {
          Authorization: `ApiKey ${key}`,
          "kbn-xsrf": "true",
        },
      }),
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status}`,
        hint: "Is Kibana running? Default for start-local is http://localhost:5601",
      };
    }
    return { ok: true, message: "200 OK" };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
      hint: "Is Kibana reachable at KIBANA_URL?",
    };
  }
}

async function pingAgent(): Promise<CheckResult> {
  const url = process.env.KIBANA_URL;
  const key = process.env.ELASTICSEARCH_API_KEY;
  const agentId = process.env.ELASTIC_AGENT_ID;
  if (!url || !key || !agentId) return { ok: false, message: "env vars not set" };
  try {
    const res = await timed(
      () =>
        fetch(`${url.replace(/\/$/, "")}/api/agent_builder/converse`, {
          method: "POST",
          headers: {
            Authorization: `ApiKey ${key}`,
            "kbn-xsrf": "true",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agent_id: agentId, input: "ping" }),
        }),
      20_000, // agent calls take longer
    );
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        message: `HTTP ${res.status}`,
        hint:
          res.status === 404
            ? `Agent '${agentId}' not found. Did setup.sh complete successfully? ` +
              "Check ELASTIC_AGENT_ID matches the agent registered in Kibana."
            : `Response: ${body.slice(0, 200)}`,
      };
    }
    return { ok: true, message: "agent responded" };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
      hint: "Did you run ./es-sandbox/setup.sh? It registers the agent.",
    };
  }
}

async function pingGitHub(): Promise<CheckResult> {
  const key = process.env.GITHUB_API_KEY;
  if (!key) {
    return {
      ok: false,
      message: "GITHUB_API_KEY not set",
      hint:
        "Create a Personal Access Token at https://github.com/settings/tokens — " +
        "no scopes needed for public repos",
    };
  }
  try {
    const res = await timed(() =>
      fetch("https://api.github.com/rate_limit", {
        headers: {
          Authorization: `token ${key}`,
          "User-Agent": "deepagent-workshop",
          Accept: "application/vnd.github+json",
        },
      }),
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status}`,
        hint: "Token may be expired or invalid. Generate a fresh PAT.",
      };
    }
    const body = (await res.json()) as { rate: { remaining: number; limit: number } };
    return {
      ok: true,
      message: `${body.rate.remaining}/${body.rate.limit} req remaining`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function pingTavily(): Promise<CheckResult> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    return {
      ok: false,
      message: "TAVILY_API_KEY not set",
      hint: "Sign up free at https://app.tavily.com/ for an API key",
    };
  }
  try {
    const res = await timed(() =>
      fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, query: "test", max_results: 1 }),
      }),
    );
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        message: `HTTP ${res.status}`,
        hint: `Response: ${body.slice(0, 200)}`,
      };
    }
    return { ok: true, message: "200 OK" };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------- check registry ---------------------------------------------

const checks: Check[] = [
  // Env-var checks (instant, no network)
  { name: "env: LITELLM_API_KEY", run: async () => checkEnv("LITELLM_API_KEY") },
  { name: "env: LITELLM_API_BASE", run: async () => checkEnv("LITELLM_API_BASE") },
  { name: "env: ELASTICSEARCH_HOST", run: async () => checkEnv("ELASTICSEARCH_HOST") },
  { name: "env: ELASTICSEARCH_API_KEY", run: async () => checkEnv("ELASTICSEARCH_API_KEY") },
  { name: "env: KIBANA_URL", run: async () => checkEnv("KIBANA_URL") },
  { name: "env: ELASTIC_AGENT_ID", run: async () => checkEnv("ELASTIC_AGENT_ID") },
  { name: "env: GITHUB_API_KEY", run: async () => checkEnv("GITHUB_API_KEY") },
  { name: "env: TAVILY_API_KEY", run: async () => checkEnv("TAVILY_API_KEY") },
  // Network checks
  { name: "LiteLLM proxy reachable", run: pingLiteLLM },
  { name: "Elasticsearch reachable", run: pingES },
  { name: "Kibana reachable", run: pingKibana },
  { name: "Agent Builder agent responds", run: pingAgent },
  { name: "GitHub token works", run: pingGitHub },
  { name: "Tavily key works", run: pingTavily },
];

// ---------- main ------------------------------------------------------

async function main() {
  console.log(`\n${c.bold("Verifying workshop setup...")}\n`);

  let pass = 0;
  let fail = 0;
  const failures: { name: string; hint?: string }[] = [];

  for (const check of checks) {
    process.stdout.write(`  ${check.name.padEnd(38)} `);
    let result: CheckResult;
    try {
      result = await check.run();
    } catch (err) {
      result = {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
    if (result.ok) {
      console.log(`${c.green("✓")} ${c.dim(result.message)}`);
      pass++;
    } else {
      console.log(`${c.red("✗")} ${result.message}`);
      if (result.hint) console.log(`    ${c.dim(result.hint)}`);
      fail++;
      failures.push({ name: check.name, hint: result.hint });
    }
  }

  console.log("");
  if (fail === 0) {
    console.log(c.green(`✓ All ${pass} checks passed. You're ready for the workshop.`));
    console.log("");
  } else {
    console.log(c.red(`✗ ${fail} of ${pass + fail} checks failed.`));
    console.log("");
    console.log("Fix the items above and re-run:");
    console.log(`  ${c.bold("npm run verify")}`);
    console.log("");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nverify failed unexpectedly:");
  console.error(err);
  process.exit(1);
});
