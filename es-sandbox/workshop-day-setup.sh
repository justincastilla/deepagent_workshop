#!/usr/bin/env bash
#
# Workshop-day ES setup. Run this AT THE WORKSHOP, after the instructor
# hands you a LITELLM_API_KEY.
#
# This script does ONE thing: creates the Kibana LLM connector that
# powers the technology-research-agent. The connector points at the
# workshop's LiteLLM proxy so the agent's reasoning runs through Sonnet.
#
# Prereqs:
#   1. You ran ./es-sandbox/pre-setup.sh at home and it succeeded.
#   2. Your start-local containers are still running (docker ps).
#   3. .env has LITELLM_API_KEY (from instructor) and LITELLM_API_BASE.
#
# Usage:
#   cd <workshop-folder>
#   ./es-sandbox/workshop-day-setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---------- 1. Source credentials ------------------------------------------

START_LOCAL_ENV="${PROJECT_ROOT}/elastic-start-local/.env"
PROJECT_ENV="${PROJECT_ROOT}/.env"

if [[ ! -f "${START_LOCAL_ENV}" ]]; then
  echo "ERROR: ${START_LOCAL_ENV} not found." >&2
  echo "Did you run pre-setup.sh? Are your start-local containers still up?" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "${START_LOCAL_ENV}"

if [[ ! -f "${PROJECT_ENV}" ]]; then
  echo "ERROR: ${PROJECT_ENV} not found." >&2
  echo "Run pre-setup.sh first, then create .env from .env.example." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "${PROJECT_ENV}"
set +a

ES_URL="${ES_LOCAL_URL:-http://localhost:9200}"
KIBANA_URL="${KIBANA_LOCAL_URL:-http://localhost:5601}"
API_KEY="${ES_LOCAL_API_KEY:?ES_LOCAL_API_KEY not set}"

# ---------- 2. Validate LITELLM_* values are set ---------------------------

if [[ -z "${LITELLM_API_KEY:-}" ]]; then
  echo "ERROR: LITELLM_API_KEY is not set in .env." >&2
  echo "" >&2
  echo "The instructor hands these out on workshop day. Once you have" >&2
  echo "the key, add it to .env and re-run this script:" >&2
  echo "" >&2
  echo "  LITELLM_API_KEY=sk-...your-key..." >&2
  echo "  LITELLM_API_BASE=https://deepagent-workshop.fly.dev" >&2
  echo "" >&2
  exit 1
fi

if [[ -z "${LITELLM_API_BASE:-}" ]]; then
  echo "ERROR: LITELLM_API_BASE is not set in .env." >&2
  echo "Set it to the URL the instructor provided, typically:" >&2
  echo "  LITELLM_API_BASE=https://deepagent-workshop.fly.dev" >&2
  exit 1
fi

echo "Workshop-day setup. Using:"
echo "  Kibana:        ${KIBANA_URL}"
echo "  LiteLLM proxy: ${LITELLM_API_BASE}"
echo "  LiteLLM key:   ${LITELLM_API_KEY:0:6}…${LITELLM_API_KEY: -4}"
echo ""

# ---------- 3. Create the Kibana LLM connector -----------------------------

echo "Creating Kibana LLM connector pointing at the LiteLLM proxy..."

CONN_BODY=$(cat <<EOF
{
  "name": "LiteLLM Proxy",
  "connector_type_id": ".gen-ai",
  "config": {
    "apiUrl": "${LITELLM_API_BASE%/}/chat/completions",
    "apiProvider": "OpenAI",
    "defaultModel": "${LLM_MODEL:-llm-gateway/claude-sonnet-4-5}"
  },
  "secrets": {
    "apiKey": "${LITELLM_API_KEY}"
  }
}
EOF
)

HTTP=$(curl -sS -o /tmp/kb-connector.json -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/actions/connector" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d "$CONN_BODY" || true)

if [[ "$HTTP" == "200" ]]; then
  echo "  Connector created."
elif grep -qi "already exists\|conflict" /tmp/kb-connector.json 2>/dev/null; then
  echo "  Connector already exists. Skipping."
else
  echo "  ERROR: connector creation returned HTTP ${HTTP}." >&2
  cat /tmp/kb-connector.json >&2
  echo "" >&2
  echo "  Manual fallback in Kibana:" >&2
  echo "    Stack Management → Connectors → Create → OpenAI" >&2
  echo "    URL:           ${LITELLM_API_BASE%/}/chat/completions" >&2
  echo "    Default model: llm-gateway/claude-sonnet-4-5" >&2
  echo "    API Key:       (your LITELLM_API_KEY)" >&2
  exit 1
fi
echo ""

# ---------- 4. Tell the attendee what to do next ----------------------------

echo "============================================================"
echo "Workshop-day setup complete."
echo "============================================================"
echo ""
echo "Now run:"
echo ""
echo "  npm run verify       # all 14 checks should be green"
echo "  npm run smoke        # full LLM stack confirmation"
echo ""
echo "If both pass, you're ready to build."
echo ""
