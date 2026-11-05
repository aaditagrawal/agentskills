#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
mkdir -p "$TEST_DIR/scripts/.cache" "$TEST_DIR/bin"
cp "$ROOT/skills/openrouter-expert/scripts/check-doc-url.sh" "$TEST_DIR/scripts/"
cat > "$TEST_DIR/scripts/.cache/llms.txt" <<'INDEX'
- [Quickstart](https://openrouter.ai/docs/quickstart.mdx)
An unindexed mention: https://openrouter.ai/docs/not-indexed.mdx
INDEX
sh "$TEST_DIR/scripts/check-doc-url.sh" https://openrouter.ai/docs/quickstart.mdx
if sh "$TEST_DIR/scripts/check-doc-url.sh" https://openrouter.ai/docs/quickstart; then
  echo "URL prefixes must not pass" >&2
  exit 1
fi
if sh "$TEST_DIR/scripts/check-doc-url.sh" https://openrouter.ai/docs/not-indexed.mdx; then
  echo "Prose mentions must not pass" >&2
  exit 1
fi

cat > "$TEST_DIR/models.json" <<'JSON'
{"data": [{"id": "provider/first-model"}, {"id": "provider/SECOND-model"}]}
JSON
cat > "$TEST_DIR/mock-fetch.mjs" <<'FETCH'
globalThis.fetch = async () => new Response(await Bun.file(process.env.MODEL_FIXTURE).arrayBuffer());
FETCH
ln -s "$(command -v bun)" "$TEST_DIR/bin/bun"
BUN_OPTIONS="--preload=$TEST_DIR/mock-fetch.mjs"
export BUN_OPTIONS
MODEL_FIXTURE="$TEST_DIR/models.json"
export MODEL_FIXTURE
RESULT=$(PATH="$TEST_DIR/bin" /bin/sh "$ROOT/skills/openrouter-expert/scripts/list-models.sh")
test "$RESULT" = "$(printf 'provider/first-model\nprovider/SECOND-model')"
RESULT=$(PATH="$TEST_DIR/bin" /bin/sh "$ROOT/skills/openrouter-expert/scripts/list-models.sh" SECOND)
test "$RESULT" = "provider/SECOND-model"
printf '{invalid json' > "$MODEL_FIXTURE"
if PATH="$TEST_DIR/bin" /bin/sh "$ROOT/skills/openrouter-expert/scripts/list-models.sh"; then
  echo "Invalid JSON must fail" >&2
  exit 1
fi
echo "OpenRouter script regression checks passed"
