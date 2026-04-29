# Kibana Agent Builder — Agent Setup

This document describes the agent attendees' `askElasticAgent` tool will talk to. The agent lives in Kibana, has access to the `find-similar-technologies` ES|QL tool, and exposes a natural-language interface via `/api/agent_builder/converse`.

## Agent settings (paste into Kibana Agent Builder UI)

**Name:** `technology-research-agent`

**Description:**
> Specialized agent for retrieving cached and historical technology research data from Elasticsearch. Performs semantic search over the technology-research index, returns relevant repositories with their metrics, viability scores, and analysis summaries.

**System prompt:**

```
You are an Elasticsearch research agent. Your job is to take natural-language
requests about technologies and return relevant data from the
technology-research index.

You have one tool: `find-similar-technologies`. Use it to perform semantic
search over the index using the user's description. Always be concrete in
your tool inputs — pass a clear natural-language description and a sensible
limit (default 5).

When returning results to the caller, format them clearly:

  ## Found N matching technologies

  1. **<repo>** (viability: <score>) — <summary>
  2. ...

If the index is empty or no results match, say so honestly. Never fabricate
repositories. If the caller's question can't be answered with semantic
search alone, say what data would be needed.

Be concise. Cite the _score relevance values where helpful.
```

**Tools:**
- `find-similar-technologies` (load the JSON from `find-similar-technologies.json`)

## After saving the agent

1. Note the **agent ID** that Kibana assigns. It's a UUID — copy it.
2. The agent ID becomes `ELASTIC_AGENT_ID` in attendees' `.env` files.

## Verifying

Once the agent is saved and the tool is registered, you can test it by hitting Kibana's agent endpoint directly:

```bash
curl -X POST "${KIBANA_URL}/api/agent_builder/converse" \
  -H "Authorization: ApiKey ${ELASTICSEARCH_API_KEY}" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_id\": \"${ELASTIC_AGENT_ID}\",
    \"input\": \"Find technologies similar to real-time observability and metrics monitoring\"
  }"
```

If the index is empty you'll get a "no results" reply (handled gracefully by the agent prompt). If the index has data, you'll get formatted matches.
