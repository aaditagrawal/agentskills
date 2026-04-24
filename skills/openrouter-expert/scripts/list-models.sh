#!/bin/sh
# Fetch https://openrouter.ai/api/v1/models and pretty-print model IDs (optionally filtered).
# Uses curl; uses jq if available for pretty output, otherwise falls back to a basic grep.
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
else
  # Fallback: crude regex. jq is strongly preferred.
  echo "warning: jq not found; falling back to grep parsing" >&2
  if [ -n "$MODE" ]; then
    grep -oE '"id":"[^"]+"' "$TMP" | sed 's/^"id":"//;s/"$//' | grep -i -- "$MODE" || true
  else
    grep -oE '"id":"[^"]+"' "$TMP" | sed 's/^"id":"//;s/"$//'
  fi
fi
