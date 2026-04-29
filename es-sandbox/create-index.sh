#!/usr/bin/env bash
# Create the technology-research index against your Elastic Cloud cluster.
#
# Prereqs (in your shell):
#   ELASTICSEARCH_HOST=https://<your-deployment>.es.<region>.elastic.cloud
#   ELASTICSEARCH_API_KEY=<base64 API key>
#
# Usage:
#   ./create-index.sh

set -euo pipefail

: "${ELASTICSEARCH_HOST:?Set ELASTICSEARCH_HOST}"
: "${ELASTICSEARCH_API_KEY:?Set ELASTICSEARCH_API_KEY}"

INDEX_NAME="${1:-technology-research}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Creating index '${INDEX_NAME}' on ${ELASTICSEARCH_HOST}..."

# Note: semantic_text fields auto-deploy ELSER-2 on first index creation in
# Elastic 8.16+. If your cluster is older, you'll need to deploy ELSER manually
# in Kibana → Machine Learning → Trained Models, and add an explicit
# inference_id to the semantic_content field in index-mapping.json.

curl -fsS -X PUT "${ELASTICSEARCH_HOST}/${INDEX_NAME}" \
  -H "Authorization: ApiKey ${ELASTICSEARCH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${SCRIPT_DIR}/index-mapping.json" \
  | python3 -m json.tool

echo ""
echo "Index '${INDEX_NAME}' created."
echo "Verify with: curl -H \"Authorization: ApiKey \$ELASTICSEARCH_API_KEY\" ${ELASTICSEARCH_HOST}/${INDEX_NAME}/_mapping"
