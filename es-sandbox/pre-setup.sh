#!/usr/bin/env bash
#
# Pre-workshop ES setup. Run this AT HOME, before the workshop.
#
# Assumes start-local has already been run from the workshop folder
# (creates ./elastic-start-local/.env which we source for credentials).
#
# This script:
#   1. Waits for ES + Kibana to be healthy
#   2. Creates the technology-research index (semantic_text + ELSER)
#   3. Bulk-loads seed-data.ndjson
#   4. Registers the find-similar-technologies ES|QL tool
#   5. Creates the technology-research-agent
#
# It does NOT create the Kibana LLM connector. That's workshop-day work
# (workshop-day-setup.sh) because it needs your LITELLM_API_KEY, which
# the instructor hands out on workshop day.
#
# Usage:
#   cd <workshop-folder>
#   ./es-sandbox/pre-setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---------- 1. Source start-local credentials ------------------------------

START_LOCAL_ENV="${PROJECT_ROOT}/elastic-start-local/.env"

if [[ ! -f "${START_LOCAL_ENV}" ]]; then
  echo "ERROR: ${START_LOCAL_ENV} not found." >&2
  echo "Run start-local from this directory first:" >&2
  echo "  cd ${PROJECT_ROOT} && curl -fsSL https://elastic.co/start-local | sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${START_LOCAL_ENV}"

ES_URL="${ES_LOCAL_URL:-http://localhost:9200}"
KIBANA_URL="${KIBANA_LOCAL_URL:-http://localhost:5601}"
API_KEY="${ES_LOCAL_API_KEY:?ES_LOCAL_API_KEY not set in ${START_LOCAL_ENV}}"

echo "Pre-workshop setup. Using:"
echo "  ES:     ${ES_URL}"
echo "  Kibana: ${KIBANA_URL}"
echo ""

# ---------- 2. Wait for ES + Kibana health ---------------------------------

wait_for() {
  local name="$1"
  local url="$2"
  local max=60
  for _ in $(seq 1 $max); do
    if curl -fsS -o /dev/null -H "Authorization: ApiKey ${API_KEY}" "${url}"; then
      echo "  ${name} is up."
      return 0
    fi
    sleep 2
  done
  echo "ERROR: ${name} did not become healthy at ${url} after $((max*2))s" >&2
  return 1
}

echo "Waiting for ES..."
wait_for "Elasticsearch" "${ES_URL}/_cluster/health?wait_for_status=yellow&timeout=30s"

echo "Waiting for Kibana..."
wait_for "Kibana" "${KIBANA_URL}/api/status"
echo ""

# ---------- 3. Create the technology-research index ------------------------

echo "Creating technology-research index..."
HTTP=$(curl -sS -o /tmp/es-create.json -w "%{http_code}" \
  -X PUT "${ES_URL}/technology-research" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${SCRIPT_DIR}/index-mapping.json" || true)

if [[ "$HTTP" == "200" ]]; then
  echo "  Index created."
elif grep -q "resource_already_exists_exception" /tmp/es-create.json 2>/dev/null; then
  echo "  Index already exists. Skipping."
else
  echo "  ERROR creating index (HTTP ${HTTP}):" >&2
  cat /tmp/es-create.json >&2
  exit 1
fi
echo ""

# ---------- 4. Bulk-load seed data -----------------------------------------

echo "Bulk-loading seed data (this may take ~30s on first run as ELSER warms up)..."
curl -fsS -o /tmp/es-bulk.json -X POST "${ES_URL}/_bulk" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @"${SCRIPT_DIR}/seed-data.ndjson"

if grep -q '"errors":true' /tmp/es-bulk.json; then
  echo "  WARN: some documents failed to index. Inspect /tmp/es-bulk.json" >&2
else
  echo "  Seed data indexed."
fi
echo ""

# ---------- 5. Register the find-similar-technologies tool -----------------

echo "Registering Kibana Agent Builder tool 'find-similar-technologies'..."
HTTP=$(curl -sS -o /tmp/kb-tool.json -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/agent_builder/tools" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d @"${SCRIPT_DIR}/find-similar-technologies.json" || true)

if [[ "$HTTP" == "200" || "$HTTP" == "201" ]]; then
  echo "  Tool registered."
elif grep -qi "already exists\|conflict" /tmp/kb-tool.json 2>/dev/null; then
  echo "  Tool already registered. Skipping."
else
  echo "  WARN: tool registration returned HTTP ${HTTP}." >&2
  echo "  Response:" >&2
  cat /tmp/kb-tool.json >&2
  echo "" >&2
  echo "  If this is a 404, your Kibana version may not have Agent Builder enabled." >&2
  echo "  See es-sandbox/README.md for manual UI fallback steps." >&2
fi
echo ""

# ---------- 6. Create the agent --------------------------------------------

echo "Creating Kibana Agent Builder agent 'technology-research-agent'..."
AGENT_BODY=$(cat <<'EOF'
{
  "id": "technology-research-agent",
  "name": "Technology Research Agent",
  "description": "Specialized agent for retrieving cached and historical technology research data from Elasticsearch via semantic search.",
  "configuration": {
    "instructions": "You are an Elasticsearch research agent. Your job is to take natural-language requests about technologies and return relevant data from the technology-research index.\n\nYou have one tool: find-similar-technologies. Use it to perform semantic search over the index using the user's description. Always be concrete in your tool inputs — pass a clear natural-language description and a sensible limit (default 5).\n\nWhen returning results to the caller, format them clearly:\n\n## Found N matching technologies\n\n1. **<repo>** (viability: <score>) — <summary>\n2. ...\n\nIf the index is empty or no results match, say so honestly. Never fabricate repositories. Be concise.",
    "tools": [
      {"tool_ids": ["find-similar-technologies"]}
    ]
  }
}
EOF
)

HTTP=$(curl -sS -o /tmp/kb-agent.json -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/agent_builder/agents" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d "$AGENT_BODY" || true)

if [[ "$HTTP" == "200" || "$HTTP" == "201" ]]; then
  echo "  Agent created."
elif grep -qi "already exists\|conflict" /tmp/kb-agent.json 2>/dev/null; then
  echo "  Agent already exists. Skipping creation."
else
  echo "  WARN: agent creation returned HTTP ${HTTP}." >&2
  cat /tmp/kb-agent.json >&2
  echo "" >&2
  echo "  See es-sandbox/README.md for manual UI fallback." >&2
fi
echo ""

# ---------- 7. Print values for attendee .env -------------------------------

echo "============================================================"
echo "Pre-workshop ES setup complete."
echo ""
echo "Add these to your project .env (alongside the LITELLM_*"
echo "values you'll get on workshop day):"
echo "============================================================"
echo ""
echo "ELASTICSEARCH_HOST=${ES_URL}"
echo "ELASTICSEARCH_API_KEY=${API_KEY}"
echo "KIBANA_URL=${KIBANA_URL}"
echo "ELASTIC_AGENT_ID=technology-research-agent"
echo ""
echo "Next: run 'npm run verify' to confirm everything is wired up."
echo "Pre-workshop, the LiteLLM checks will fail (red X) — that's"
echo "expected. Everything else should be green."
echo ""
echo "🛑 STOP HERE. Wait for workshop day. Do NOT run"
echo "   workshop-day-setup.sh until the instructor distributes"
echo "   your LITELLM_API_KEY."
echo ""
