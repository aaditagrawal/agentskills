#!/bin/sh
# Fetch https://openrouter.ai/docs/llms.txt, cache it, and diff against the previous cache.
# Zero deps: POSIX sh + curl. diff is standard on POSIX systems.
#
# Usage: bash scripts/pull-docs-index.sh
# Exit codes:
#   0  success (cache written; diff printed if changed)
#   2  curl missing
#   3  fetch failed

set -eu

URL="https://openrouter.ai/docs/llms.txt"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CACHE_DIR="$SCRIPT_DIR/.cache"
CUR="$CACHE_DIR/llms.txt"
PREV="$CACHE_DIR/llms.prev.txt"
TMP="$CACHE_DIR/llms.new.txt"

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl not found on PATH" >&2
  exit 2
fi

mkdir -p "$CACHE_DIR"

# -f fail on HTTP errors, -sS silent but show errors, -L follow redirects
if ! curl -fsSL -o "$TMP" "$URL"; then
  echo "error: failed to fetch $URL" >&2
  rm -f "$TMP"
  exit 3
fi

if [ -s "$CUR" ]; then
  mv "$CUR" "$PREV"
fi
mv "$TMP" "$CUR"

echo "cached: $CUR"

if [ -s "$PREV" ]; then
  if diff -q "$PREV" "$CUR" >/dev/null 2>&1; then
    echo "unchanged since last fetch"
  else
    echo "---- diff (prev -> current) ----"
    diff -u "$PREV" "$CUR" || true
  fi
else
  echo "first fetch (no previous cache to diff against)"
fi
