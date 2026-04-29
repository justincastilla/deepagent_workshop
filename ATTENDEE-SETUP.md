# Workshop Setup

You'll be building an Elasticsearch subagent for a deep agent during the workshop. Most of the runtime lives on your laptop, so we need to install a few things ahead of time. **Doing the pre-workshop steps at home prevents 50 of us from saturating the same WiFi pulling Docker images at the same time.**

This guide has two phases:

1. **Pre-workshop** (steps 1–9) — do alone at home. ~30 min including Docker image downloads.
2. **🛑 STOP — wait for workshop day**
3. **Workshop day** (steps 10–14) — do together with the instructor. ~5 min.

If anything in the pre-workshop section blocks you, ping the workshop organizer well in advance — debugging during the workshop costs everyone.

---

## What you'll have after the pre-workshop steps

- Docker Desktop (or Docker Engine)
- Node.js 20+
- This workshop repo cloned and `npm install`-ed
- A local Elasticsearch + Kibana running via Elastic's `start-local`
- The `technology-research` index seeded with sample data
- A Kibana Agent Builder agent registered (without an LLM connector yet — that's day-of)
- `npm run verify` showing 12 of 14 checks green (the two LiteLLM-related ones are red until day-of, which is expected)

---

## 1. Install Docker

You need Docker running on your machine.

- **macOS / Windows:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux:** Docker Engine ([install guide](https://docs.docker.com/engine/install/))

After install, verify:

```bash
docker --version
docker run --rm hello-world
```

If `hello-world` prints the welcome message, Docker is ready.

## 2. Install Node.js 20+

```bash
node --version    # should print v20.x or higher
```

If you need to install or upgrade, use [nvm](https://github.com/nvm-sh/nvm) or download from [nodejs.org](https://nodejs.org/).

## 3. Clone the workshop repo

```bash
git clone <REPO_URL_FROM_INSTRUCTOR> deepagent_workshop
cd deepagent_workshop
```

## 4. Install JS dependencies

```bash
npm install
```

This pulls down `deepagents`, LangChain, Express, etc. Takes a couple minutes.

## 5. Start a local Elasticsearch + Kibana

Run Elastic's official `start-local` from inside the workshop folder:

```bash
curl -fsSL https://elastic.co/start-local | sh
```

This will:

- Pull the Elasticsearch and Kibana Docker images (~2GB total — slowest step)
- Create a `elastic-start-local/` folder with `docker-compose.yml` and a `.env` containing your generated API key
- Boot ES on `http://localhost:9200` and Kibana on `http://localhost:5601`
- Auto-activate a trial license (full feature access for 30 days)

When it's done, you should be able to open `http://localhost:5601` in your browser and see Kibana.

> **Note:** Elasticsearch and Kibana together use ~4GB RAM. Make sure Docker Desktop's memory limit is set to at least 6GB (Docker Desktop → Settings → Resources).

## 6. Run the pre-workshop ES setup script

This creates the `technology-research` index, seeds it with sample data, and configures the Kibana Agent Builder agent the workshop's elastic subagent will talk to:

```bash
chmod +x es-sandbox/pre-setup.sh
./es-sandbox/pre-setup.sh
```

**Expected output (last section):**

```
============================================================
Pre-workshop ES setup complete.

Add these to your project .env (alongside the LITELLM_*
values you'll get on workshop day):
============================================================

ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_API_KEY=<your generated key>
KIBANA_URL=http://localhost:5601
ELASTIC_AGENT_ID=technology-research-agent

Next: run 'npm run verify' to confirm everything is wired up.
Pre-workshop, the LiteLLM checks will fail (red X) — that's
expected. Everything else should be green.

🛑 STOP HERE. Wait for workshop day. Do NOT run
   workshop-day-setup.sh until the instructor distributes
   your LITELLM_API_KEY.
```

The first run takes ~60 seconds because Elasticsearch downloads and warms up the ELSER model on the first `semantic_text` write. Subsequent runs are fast.

> `pre-setup.sh` will end with a "🛑 STOP HERE" banner. That's the boundary — don't run `workshop-day-setup.sh` until the instructor distributes your `LITELLM_API_KEY` at the workshop.

## 7. Get the third-party API keys

You need two free keys for the GitHub and Tavily subagents that ship pre-built in the skeleton. Both take ~2 minutes to grab.

### GitHub Personal Access Token (PAT)

The metrics and sentiment subagents call the GitHub API. A PAT raises your rate limit from 60 req/hr (unauth) to 5,000 req/hr (auth) and is required.

1. Go to **https://github.com/settings/tokens** (must be logged into GitHub).
2. Click **Generate new token → Generate new token (classic)**.
3. Set:
   - **Note:** `deepagent-workshop`
   - **Expiration:** 30 days (or any value past your workshop date)
   - **Scopes:** **none** — leave every checkbox unchecked. The metrics/sentiment subagents only read public repos, which doesn't need any scope.
4. Click **Generate token**. Copy the value (starts with `ghp_`). **You won't be able to see it again.**

### Tavily API key

The web subagent uses Tavily's search API for web adoption signals. Free tier is 1,000 calls/month, more than enough.

1. Go to **https://app.tavily.com/**.
2. Sign up (Google/GitHub OAuth or email).
3. Land on the dashboard → **API Keys** in the left nav.
4. Copy the default key (starts with `tvly-`).

## 8. Configure your `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in everything you have so far. **Leave `LITELLM_API_KEY` blank for now** — the instructor hands that out on workshop day.

```env
# LiteLLM (workshop-provided — your instructor will give you these on workshop day)
LITELLM_API_KEY=
LITELLM_API_BASE=https://deepagent-workshop.fly.dev

# Elasticsearch (from pre-setup.sh output above)
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_API_KEY=<paste from pre-setup.sh output>
KIBANA_URL=http://localhost:5601
ELASTIC_AGENT_ID=technology-research-agent

# Third-party APIs (your own, from step 7)
GITHUB_API_KEY=ghp_...
TAVILY_API_KEY=tvly-...
```

## 9. Run the verify script

This checks every piece of your setup. Pre-workshop, the LiteLLM checks will fail (you don't have the key yet). Everything else should be green.

```bash
npm run verify
```

**Pre-workshop expected output:**

- `env: LITELLM_API_KEY` — ✗ (red, expected — you'll get the key on workshop day)
- `LiteLLM proxy reachable` — ✗ (red, expected, depends on the key above)
- **All 12 other checks** — ✓ green

If any check besides the two LiteLLM ones is red, the hint after the X tells you what to fix. Get those green before workshop day.

---

# 🛑 STOP HERE — Wait for Workshop Day

**The remaining steps require a `LITELLM_API_KEY` from your instructor. Don't run them on your own.**

We'll do them together at the start of the workshop. It takes ~5 minutes.

When you arrive, you'll have:

1. A green-as-far-as-possible setup from step 9
2. Your laptop on the workshop WiFi
3. Docker still running with `start-local` containers up

Bring all three.

---

# Workshop-Day Steps (do these together with the instructor)

## 10. Get your `LITELLM_API_KEY` from the instructor

The instructor hands you a virtual key (string starting with `sk-`). Each Attendee gets a different one with a per-key budget cap.

## 11. Add it to `.env`

Open `.env` and paste the key:

```env
LITELLM_API_KEY=sk-...your-key...
```

## 12. Run `workshop-day-setup.sh` to create the Kibana LLM connector

Now that `LITELLM_API_KEY` is in `.env`, this script wires up the Kibana connector so the Agent Builder agent can use the LiteLLM proxy for its reasoning.

```bash
chmod +x es-sandbox/workshop-day-setup.sh
./es-sandbox/workshop-day-setup.sh
```

You should see "Connector created." in the output (or "Connector already exists. Skipping." — both are fine).

## 13. Re-run `npm run verify` — should be all green

```bash
npm run verify
```

All 14 checks green. If anything's red, raise a hand — the instructor will help in real time.

## 14. Smoke-test the LLM stack

```bash
npm run smoke
```

You should see the agent invoke a tool and produce a one-sentence reply ("I greeted 'workshop' using the sayHello tool."). Total time: ~5 seconds.

You're ready to build. The workshop proceeds from here.

---

## Troubleshooting

### `start-local` fails to boot

Run `docker logs es-local-dev` to see what ES is complaining about. Most common issue is insufficient memory — bump Docker Desktop's resource limits.

### `pre-setup.sh` says "elastic-start-local/.env not found"

You ran `start-local` from a different directory. Either re-run it from the workshop root, or move the `elastic-start-local/` folder into the workshop root.

### `pre-setup.sh` errors during the ELSER warm-up step

ELSER takes time to download (~1.5GB). If your network is slow, the first bulk-load can time out. Re-run `pre-setup.sh` — it's idempotent and skips already-created resources.

### Agent Builder API returns 404

Your Kibana version might not have Agent Builder enabled. Check `http://localhost:5601` for an "Agent Builder" item in the left nav. If it's missing, ping the instructor — there's a manual fallback path documented in `es-sandbox/README.md`.

### Converse fails with "No connector available for chat execution"

The Kibana Agent Builder agent exists but has no LLM connector to do reasoning with. This means you haven't run `workshop-day-setup.sh` yet (or it errored out). Fix:

1. Make sure `LITELLM_API_KEY` and `LITELLM_API_BASE` are set in `.env`.
2. Run `./es-sandbox/workshop-day-setup.sh`.

Or configure manually in Kibana → Stack Management → Connectors → Create → OpenAI, with URL `<LITELLM_API_BASE>/chat/completions` and your `LITELLM_API_KEY`.

### Converse fails with `litellm.UnsupportedParamsError: Anthropic doesn't support tool calling without 'tools=' param`

You hit a known LiteLLM/Anthropic compatibility issue. Your instructor needs to add `modify_params: true` to the LiteLLM proxy's `litellm_settings` and redeploy. If you're seeing this on workshop day, ping them — they can fix it without you doing anything on your machine.

### `npm run smoke` errors with `LITELLM_API_KEY` missing

Expected if you haven't filled in your key yet. The instructor will hand keys out at workshop start.

---

## After setup, what the workshop covers

Once you're through step 14, the rest of the 2 hours covers:

1. **Deep-agent concepts** — what makes an agent "deep" (planning, sub-agents, virtual filesystem)
2. **LLM-via-LiteLLM pattern** — why we proxy, what `llm-gateway/...` means, how production agents handle vendor swaps
3. **ES + Kibana Agent Builder primer** — what `semantic_text` and ES|QL are, what the Agent Builder layer does
4. **Build 1 — the Kibana client** (`src/tools/kibanaClient.ts`)
5. **Build 2 — the `askElasticAgent` tool** (`src/tools/askElasticAgent.ts`)
6. **Build 3 — the Elastic subagent + prompt** (`src/subagents/elastic.ts`, `src/prompts/elastic.md`)
7. **Demo** — end-to-end query through the web UI, all four subagents working

After each build step, a sanity-check script (`npm run test:client`, `npm run test:tool`) tells you whether you're cleared to move on.

---

## One last ask

If anything in the **pre-workshop** section didn't work for you, **please reach out before workshop day**. We can fix one person's setup over chat in 10 minutes; we can't fix 30 people's setup during the first 30 minutes of a 2-hour workshop.

See you there.
