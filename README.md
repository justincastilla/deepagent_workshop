# DevRel-DeepAgent — JS Workshop Edition

A JavaScript/TypeScript port of [DevRel-DeepAgent](https://github.com/justincastilla/DevRel-DeepAgent), built for a 2-hour hands-on workshop.

In this workshop you'll implement the **Elasticsearch subagent** of a multi-subagent deep agent. By the end, you'll have a working agent that researches technologies by orchestrating four specialized subagents — one of which (the elastic one) you wrote yourself.

## What's already built (the skeleton)

- Orchestrator (`src/orchestrator.ts`) using `deepagents` + LangGraph
- Three fully-working subagents: `metrics` (GitHub API), `sentiment` (GitHub Issues), `web` (Tavily)
- A web UI (Express + WebSockets) that streams subagent activity in real time
- A LiteLLM-backed model factory (`src/llm.ts`) so you don't need your own LLM API key
- A pre-configured Elasticsearch + Kibana sandbox (via `start-local`) with a `technology-research` index and a Kibana Agent Builder agent

## What you'll build during the workshop

| Step | File | What it does |
| --- | --- | --- |
| Build 1 | `src/tools/kibanaClient.ts` | HTTP client for Kibana Agent Builder's `/converse` endpoint |
| Build 2 | `src/tools/askElasticAgent.ts` | LangGraph tool wrapping the client |
| Build 3 | `src/subagents/elastic.ts` + `src/prompts/elastic.md` | The Elastic subagent definition + its system prompt |

## Setup

**Don't run `npm install` blind.** The workshop has a specific pre-workshop setup flow involving Docker, `start-local`, and a `.env` file. Follow [`Attendee-SETUP.md`](./Attendee-SETUP.md) end-to-end before workshop day.

The TL;DR is:

```bash
# 1. Pre-workshop (do at home, ~30 min):
npm install
curl -fsSL https://elastic.co/start-local | sh
./es-sandbox/pre-setup.sh
cp .env.example .env && $EDITOR .env       # fill in everything except LITELLM_API_KEY
npm run verify                              # 12/14 green expected pre-workshop

# 🛑 STOP HERE — wait for workshop day

# 2. Workshop day (with the instructor, ~5 min):
$EDITOR .env                                # paste LITELLM_API_KEY from instructor
./es-sandbox/workshop-day-setup.sh
npm run verify                              # all 14 green
npm run smoke                               # full LLM stack confirmation
```

If anything breaks, see the troubleshooting section of [`Attendee-SETUP.md`](./Attendee-SETUP.md).

## npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the web UI server on `http://localhost:3000`. Watches files; restarts on save. |
| `npm run ask -- "<query>"` | Run the orchestrator once from the CLI and print the result. Useful for quick agent debugging. |
| `npm run smoke` | Minimal deep agent against the LiteLLM proxy. Confirms the LLM stack works end-to-end. |
| `npm run verify` | 14-check pre-workshop verifier. Env vars + LiteLLM + ES + Kibana + Agent Builder + GitHub + Tavily. |
| `npm run test:client` | (After Build 1) Sanity check for the Kibana client. Pass/fail. |
| `npm run test:tool` | (After Build 2) Sanity check for the `askElasticAgent` tool. Pass/fail. |
| `npm run typecheck` | TypeScript no-emit check. |
| `npm run build` | Compile to `dist/`. |

## Workshop run order

1. **Smoke test** the skeleton — three subagents work, the elastic one fails (that's what you'll fix)
2. **Concepts** — what makes an agent "deep"; why subagents
3. **LLM access pattern** — what `llm-gateway/...` means and why we use a proxy
4. **ES + Agent Builder primer** — `semantic_text`, ES\|QL, Kibana Agent Builder
5. **Build 1** — `src/tools/kibanaClient.ts` → run `npm run test:client`
6. **Build 2** — `src/tools/askElasticAgent.ts` → run `npm run test:tool`
7. **Build 3** — `src/subagents/elastic.ts` + `src/prompts/elastic.md`
8. **Demo** — full end-to-end query through the web UI, all four subagents firing

## Project layout

```
.
├── README.md                     ← this file
├── Attendee-SETUP.md              ← pre-workshop + workshop-day setup walkthrough
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── llm.ts                    ← LiteLLM-backed ChatOpenAI factory
│   ├── orchestrator.ts           ← createDeepAgent with all 4 subagents
│   ├── index.ts                  ← CLI entrypoint
│   ├── subagents/
│   │   ├── metrics.ts            ← GitHub repo metrics
│   │   ├── sentiment.ts          ← Community sentiment from issues
│   │   ├── web.ts                ← Tavily web-search adoption signals
│   │   └── elastic.ts            ← (you write this)
│   ├── tools/
│   │   ├── github.ts             ← shared GitHub fetch helper
│   │   ├── kibanaClient.ts       ← (you write this)
│   │   └── askElasticAgent.ts    ← (you write this)
│   └── prompts/
│       ├── orchestrator.md
│       ├── metrics.md
│       ├── sentiment.md
│       ├── web.md
│       └── elastic.md            ← (you write this)
├── server/
│   ├── app.ts                    ← Express + ws server
│   └── public/                   ← UI page + styles + JS
└── scripts/
    ├── smoke.ts
    ├── verify.ts
    ├── test-client.ts
    └── test-elastic-tool.ts
```

## License

MIT — see [`LICENSE`](./LICENSE). Use it, fork it, teach it. Just keep the copyright notice.
