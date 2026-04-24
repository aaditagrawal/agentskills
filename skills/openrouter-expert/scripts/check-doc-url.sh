#!/bin/sh
# Verify that a given openrouter.ai/docs URL appears in the cached llms.txt index.
# If the cache is missing, fetch it first via pull-docs-index.sh.
#
# Usage: bash scripts/check-doc-url.sh <url>
# Example: bash scripts/check-doc-url.sh https://openrouter.ai/docs/quickstart.mdx
#
# Exit codes:
#   0  URL found in llms.txt
#   1  URL not found
#   2  curl missing
#   3  fetch failed
#   4  bad arguments

set -eu

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <openrouter-docs-url>" >&2
  exit 4
fi

URL_TO_CHECK="$1"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CACHE_DIR="$SCRIPT_DIR/.cache"
CUR="$CACHE_DIR/llms.txt"

if [ ! -s "$CUR" ]; then
  echo "no cached index; fetching..." >&2
  sh "$SCRIPT_DIR/pull-docs-index.sh" >/dev/null
fi

if [ ! -s "$CUR" ]; then
  echo "error: cache still empty after fetch" >&2
  exit 3
fi

# Exact substring match against the cached index.
if grep -Fq "$URL_TO_CHECK" "$CUR"; then
  echo "ok: $URL_TO_CHECK found in $CUR"
  exit 0
fi

echo "missing: $URL_TO_CHECK is NOT present in $CUR" >&2
echo "hint: run pull-docs-index.sh to refresh, then recheck." >&2
exit 1
