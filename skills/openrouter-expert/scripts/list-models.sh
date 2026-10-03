#!/bin/sh
# Fetch https://openrouter.ai/api/v1/models and pretty-print model IDs (optionally filtered).
# Uses curl and either jq or Python 3 to parse the JSON response.
#
# Usage:
#   bash scripts/list-models.sh                # print all IDs, one per line
#   bash scripts/list-models.sh <substring>    # filter IDs by case-insensitive substring
#   bash scripts/list-models.sh --json         # dump the full raw JSON
#
# Exit codes:
#   0  success
#   2  curl missing
#   3  fetch failed
#   4  JSON parser missing

set -eu

URL="https://openrouter.ai/api/v1/models"

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl not found on PATH" >&2
  exit 2
fi

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

if ! curl -fsSL -o "$TMP" "$URL"; then
  echo "error: failed to fetch $URL" >&2
  exit 3
fi

MODE="${1:-}"

if [ "$MODE" = "--json" ]; then
  cat "$TMP"
  exit 0
fi

if command -v jq >/dev/null 2>&1; then
  if [ -n "$MODE" ]; then
    # shellcheck disable=SC2016
    jq -r --arg q "$MODE" '.data[].id | select(ascii_downcase | contains($q | ascii_downcase))' "$TMP"
  else
    jq -r '.data[].id' "$TMP"
  fi
elif command -v python3 >/dev/null 2>&1; then
  python3 - "$TMP" "$MODE" <<'PYTHON'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as response:
    models = json.load(response)["data"]
query = sys.argv[2].lower()
for model in models:
    model_id = model["id"]
    if query in model_id.lower():
        print(model_id)
PYTHON
else
  echo "error: install jq or Python 3 to parse model JSON" >&2
  exit 4
fi
