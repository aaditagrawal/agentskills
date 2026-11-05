import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const docsURL = "https://openrouter.ai/docs/llms.txt";
const modelsURL = "https://openrouter.ai/api/v1/models";
const defaultCache = join(import.meta.dir, ".cache");

function readCache(path) {
  try {
    return readFileSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return Buffer.alloc(0);
    throw error;
  }
}

// Write beside the destination so rename never exposes a partially written cache.
function replaceCache(path, bytes) {
  const temporary = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    try {
      unlinkSync(temporary);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

// One changed hunk, bounded by the common prefix and suffix. This is linear in
// input size rather than a quadratic search for the smallest possible edit set.
export function lineDiff(before, after, beforePath, afterPath) {
  if (before === after) return "";
  const oldLines = before.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const newLines = after.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) prefix++;
  let suffix = 0;
  while (suffix < oldLines.length - prefix && suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]) suffix++;
  const start = Math.max(0, prefix - 3);
  const oldEnd = Math.min(oldLines.length, oldLines.length - suffix + 3);
  const newEnd = Math.min(newLines.length, newLines.length - suffix + 3);
  const oldCount = oldEnd - start;
  const newCount = newEnd - start;
  const result = [
    `--- ${beforePath}\n+++ ${afterPath}\n`,
    `@@ -${oldCount ? start + 1 : start},${oldCount} +${newCount ? start + 1 : start},${newCount} @@\n`,
  ];
  function append(mark, line) {
    result.push(mark + line);
    if (!line.endsWith("\n")) result.push("\n\\ No newline at end of file\n");
  }
  for (let i = start; i < prefix; i++) append(" ", oldLines[i]);
  for (let i = prefix; i < oldLines.length - suffix; i++) append("-", oldLines[i]);
  for (let i = prefix; i < newLines.length - suffix; i++) append("+", newLines[i]);
  for (let i = oldLines.length - suffix; i < oldEnd; i++) append(" ", oldLines[i]);
  return result.join("");
}

async function download(url, fetcher) {
  try {
    const response = await fetcher(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw new Error(`failed to fetch ${url}: ${error.message}`);
  }
}

function modelIDs(bytes, query) {
  const catalog = JSON.parse(bytes.toString("utf8"));
  if (!catalog || !Array.isArray(catalog.data) || catalog.data.some(model => !model || typeof model.id !== "string")) {
    throw new Error("invalid models response: expected data[].id strings");
  }
  const fold = text => text.replace(/[A-Z]/g, letter => letter.toLowerCase());
  const ids = catalog.data.map(model => model.id);
  if (!query) return ids;
  const needle = fold(query);
  return ids.filter(id => fold(id).includes(needle));
}

export async function run(args, {
  cacheDir = defaultCache,
  fetcher = globalThis.fetch,
  stdout = bytes => Bun.write(Bun.stdout, bytes),
  stderr = text => Bun.write(Bun.stderr, text),
} = {}) {
  const [command, value = ""] = args;
  if (!["pull-docs-index", "list-models"].includes(command)) {
    await stderr("usage: openrouter.mjs pull-docs-index | list-models [substring|--json]\n");
    return 4;
  }
  const current = join(cacheDir, "llms.txt");
  const previous = join(cacheDir, "llms.prev.txt");
  async function refresh() {
    const bytes = await download(docsURL, fetcher);
    if (!bytes.length) throw new Error("docs index is empty");
    mkdirSync(cacheDir, { recursive: true });
    const old = readCache(current);
    if (old.length) replaceCache(previous, old);
    replaceCache(current, bytes);
    await stdout(`cached: ${current}\n`);
    if (!old.length) {
      await stdout("first fetch (no previous cache to diff against)\n");
    } else if (old.equals(bytes)) {
      await stdout("unchanged since last fetch\n");
    } else {
      await stdout("---- diff (prev -> current) ----\n");
      await stdout(lineDiff(old.toString("utf8"), bytes.toString("utf8"), previous, current));
    }
  }
  try {
    if (command === "list-models") {
      const bytes = await download(modelsURL, fetcher);
      if (value === "--json") {
        await stdout(bytes);
      } else {
        const ids = modelIDs(bytes, value);
        if (ids.length) await stdout(ids.join("\n") + "\n");
      }
    } else {
      await refresh();
    }
    return 0;
  } catch (error) {
    await stderr(`error: ${error.message}\n`);
    return 3;
  }
}

if (import.meta.main) process.exitCode = await run(Bun.argv.slice(2));
