# Elasticsearch Sandbox — `start-local` Setup

Everything in this folder is what you (or the setup scripts) feed to your local Kibana / Elasticsearch to wire up the workshop's Elastic side. The full step-by-step lives in [`Attendee-SETUP.md`](../Attendee-SETUP.md) at the project root — start there. This README is a reference for what each file does.

## Architecture

```
your laptop
├── elastic-start-local/                   ← created by start-local (gitignored, has secrets)
│   ├── docker-compose.yml
│   └── .env                               ← ES_LOCAL_API_KEY, ES_LOCAL_URL, KIBANA_LOCAL_URL
├── es-sandbox/                            ← this folder
│   ├── pre-setup.sh                       ← pre-workshop, no LiteLLM key needed
│   └── workshop-day-setup.sh              ← workshop-day, requires LITELLM_API_KEY
└── (the rest of the workshop project)
```

## Files

| File                              | What it is                                                         |
| --------------------------------- | ------------------------------------------------------------------ |
| `pre-setup.sh`                    | Pre-workshop script: creates index, seeds data, registers tool + agent |
| `workshop-day-setup.sh`           | Workshop-day script: creates the Kibana LLM connector              |
| `index-mapping.json`              | Mapping for the `technology-research` index (uses `semantic_text`) |
| `seed-data.ndjson`                | 10 curated technology entries for bulk loading                     |
| `find-similar-technologies.json`  | ES\|QL tool definition for Kibana Agent Builder                    |
| `agent-config.md`                 | System prompt + tool wiring for the Kibana agent (manual fallback) |
| `setup.sh`                        | Deprecated stub — prints a redirect to the two split scripts       |

## What each script does

### `pre-setup.sh` (run at home, before workshop)

1. Source `elastic-start-local/.env` for credentials
2. Wait for ES + Kibana to be healthy
3. Create the `technology-research` index (with `semantic_text` on `semantic_content`)
4. Bulk-load `seed-data.ndjson` — first write triggers ELSER auto-deploy (~30-60s)
5. Register the `find-similar-technologies` tool via Kibana Agent Builder API
6. Create the `technology-research-agent` via Kibana Agent Builder API
7. Print the values to paste into your `.env`, then a 🛑 STOP banner

### `workshop-day-setup.sh` (run at the workshop)

1. Source both `elastic-start-local/.env` and your project's `.env`
2. Validate that `LITELLM_API_KEY` and `LITELLM_API_BASE` are present (fail loudly if not)
3. Create the Kibana LLM connector pointing at the LiteLLM proxy
4. Print "next: `npm run verify` and `npm run smoke`"

## Manual fallback (if Agent Builder API calls fail)

Kibana Agent Builder is in tech preview in some Elastic versions. If the API endpoints `/api/agent_builder/tools` and `/api/agent_builder/agents` return 404, you can configure manually:

1. Open Kibana → **Agent Builder** in the left nav.
2. **Tools** → New tool. Paste the JSON from `find-similar-technologies.json`.
3. **Agents** → New agent. Use the system prompt from `agent-config.md`. Attach the `find-similar-technologies` tool.
4. Save and copy the agent's ID — that's your `ELASTIC_AGENT_ID`.

If "Agent Builder" doesn't appear in the left nav at all, your Kibana version is too old. The default `start-local` Kibana image should be recent enough.

## Tested Elastic version

Last validated against Elastic 9.x with `start-local`. ELSER-2 auto-deploys on first `semantic_text` write.
