#!/bin/sh
# Usage: bash scripts/list-models.sh [substring|--json]
# Exit codes: 0 success; 2 Bun missing; 3 fetch/JSON/output failed.
set -eu
if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun not found on PATH" >&2
  exit 2
fi
case $0 in */*) script_dir=${0%/*} ;; *) script_dir=. ;; esac
exec bun "$script_dir/openrouter.mjs" list-models "$@"
