import { afterEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lineDiff, run } from "../skills/openrouter-expert/scripts/openrouter.mjs";

const temporary = [];
function directory() {
  const path = mkdtempSync(join(tmpdir(), "openrouter test "));
  temporary.push(path);
  return path;
}
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

async function invoke(args, { cacheDir = directory(), body = "", fetcher, ...options } = {}) {
  const output = [];
  let stderr = "";
  const status = await run(args, {
    cacheDir,
    fetcher: fetcher ?? (async () => new Response(body)),
    stdout: chunk => { output.push(Buffer.from(chunk)); },
    stderr: text => { stderr += text; },
    ...options,
  });
  return { status, stdout: Buffer.concat(output).toString(), bytes: Buffer.concat(output), stderr, cacheDir };
}

const catalog = '{\n "id": "ignored", "data": [{"id": "provider/first-model", "owner":{"id":"ignored"}}, {"id": "provider/SECOND-model"}, {"id": "provider/a.b[1]"}, {"id": "provider/quote\\\"雪"}]\n}\n';

test("models parse only data[].id and filter ASCII case-insensitive literal substrings", async () => {
  const all = await invoke(["list-models"], { body: catalog });
  expect(all.status).toBe(0);
  expect(all.stdout).toBe('provider/first-model\nprovider/SECOND-model\nprovider/a.b[1]\nprovider/quote"雪\n');
  expect((await invoke(["list-models", "SECOND"], { body: catalog })).stdout).toBe("provider/SECOND-model\n");
  expect((await invoke(["list-models", "a.b[1]"], { body: catalog })).stdout).toBe("provider/a.b[1]\n");
  expect((await invoke(["list-models", "no match"], { body: catalog })).stdout).toBe("");
  expect((await invoke(["list-models"], { body: '{"data":[]}' })).status).toBe(0);
});

test("--json preserves response bytes including whitespace and no final newline", async () => {
  const raw = Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from(catalog.trimEnd())]);
  const result = await invoke(["list-models", "--json"], { body: raw });
  expect(result.status).toBe(0);
  expect(result.bytes.equals(raw)).toBe(true);
});

test("malformed or incompatible models fail without partial output", async () => {
  for (const body of ["", "{invalid", "null", "{}", '{"data":{}}', '{"data":[{"id":"valid"},{}]}', '{"data":[null]}', '{"data":[{"id":1}]}']) {
    const result = await invoke(["list-models"], { body });
    expect(result.status).toBe(3);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("error:");
  }
});

test("cache rotation reports first, unchanged and changed fetches", async () => {
  const cacheDir = directory();
  const first = "one\ntwo\nthree\n";
  const second = "one\nchanged\nthree\n";
  const initial = await invoke(["pull-docs-index"], { cacheDir, body: first });
  expect(initial.status).toBe(0);
  expect(initial.stdout).toBe(`cached: ${cacheDir}/llms.txt\nfirst fetch (no previous cache to diff against)\n`);
  const unchanged = await invoke(["pull-docs-index"], { cacheDir, body: first });
  expect(unchanged.stdout).toContain("unchanged since last fetch");
  const changed = await invoke(["pull-docs-index"], { cacheDir, body: second });
  expect(changed.stdout).toContain("---- diff (prev -> current) ----");
  expect(changed.stdout).toContain("-two\n+changed\n");
  expect(readFileSync(join(cacheDir, "llms.txt"), "utf8")).toBe(second);
  expect(readFileSync(join(cacheDir, "llms.prev.txt"), "utf8")).toBe(first);
  expect(readdirSync(cacheDir).sort()).toEqual(["llms.prev.txt", "llms.txt"]);
});

test("failed, empty or interrupted downloads leave both cached snapshots intact", async () => {
  const cacheDir = directory();
  writeFileSync(join(cacheDir, "llms.txt"), "current");
  writeFileSync(join(cacheDir, "llms.prev.txt"), "previous");
  for (const fetcher of [
    async () => new Response("error", { status: 503 }),
    async () => new Response(""),
    async () => { throw new Error("connection refused"); },
    async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([65])); controller.error(new Error("connection reset")); } })),
  ]) {
    const result = await invoke(["pull-docs-index"], { cacheDir, fetcher });
    expect(result.status).toBe(3);
    expect(result.stdout).toBe("");
    expect(readFileSync(join(cacheDir, "llms.txt"), "utf8")).toBe("current");
    expect(readFileSync(join(cacheDir, "llms.prev.txt"), "utf8")).toBe("previous");
    expect(readdirSync(cacheDir).sort()).toEqual(["llms.prev.txt", "llms.txt"]);
  }
});

test("cache write errors fail and remove the temporary file", async () => {
  const cacheDir = directory();
  mkdirSync(join(cacheDir, "llms.prev.txt"));
  writeFileSync(join(cacheDir, "llms.txt"), "current");
  const result = await invoke(["pull-docs-index"], { cacheDir, body: "new" });
  expect(result.status).toBe(3);
  expect(readFileSync(join(cacheDir, "llms.txt"), "utf8")).toBe("current");
  expect(readdirSync(cacheDir).sort()).toEqual(["llms.prev.txt", "llms.txt"]);
});

test("unknown commands return 4", async () => {
  expect((await invoke(["unknown"])).status).toBe(4);
});

test("HTTP redirects, status errors and request cancellation settings use runtime fetch", async () => {
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/redirect") return new Response(null, { status: 302, headers: { location: "/models" } });
    if (path === "/models") return new Response(catalog);
    return new Response("unavailable", { status: 503 });
  } });
  try {
    const fetcher = path => async (_url, options) => {
      expect(options.redirect).toBe("follow");
      expect(options.signal).toBeInstanceOf(AbortSignal);
      return fetch(new URL(path, server.url), options);
    };
    expect((await invoke(["list-models", "SECOND"], { fetcher: fetcher("/redirect") })).stdout).toBe("provider/SECOND-model\n");
    const failure = await invoke(["list-models"], { fetcher: fetcher("/failure") });
    expect(failure.status).toBe(3);
    expect(failure.stderr).toContain("HTTP 503");
  } finally {
    server.stop(true);
  }
});

test("line diff emits bounded context, empty-file ranges and missing-newline markers", () => {
  expect(lineDiff("same\n", "same\n", "old", "new")).toBe("");
  expect(lineDiff("", "new\n", "old", "new")).toBe("--- old\n+++ new\n@@ -0,0 +1,1 @@\n+new\n");
  expect(lineDiff("old\n", "", "old", "new")).toBe("--- old\n+++ new\n@@ -1,1 +0,0 @@\n-old\n");
  expect(lineDiff("old", "new\n", "old", "new")).toBe("--- old\n+++ new\n@@ -1,1 +1,1 @@\n-old\n\\ No newline at end of file\n+new\n");
  expect(lineDiff("one", "one\n", "old", "new")).toContain("-one\n\\ No newline at end of file\n+one\n");
  expect(lineDiff("one\nthree\n", "one\ntwo\nthree\n", "old", "new")).toContain(" one\n+two\n three\n");
  expect(lineDiff("one\ntwo\nthree\n", "one\nthree\n", "old", "new")).toContain(" one\n-two\n three\n");
  const prefix = Array.from({ length: 10_000 }, (_, i) => `${i}\n`).join("");
  const suffix = "end\n".repeat(10_000);
  const diff = lineDiff(prefix + "old\n" + suffix, prefix + "new\n" + suffix, "old", "new");
  expect(diff).toContain("@@ -9998,7 +9998,7 @@");
  expect(diff.split("\n")).toHaveLength(12);
});

test("shell launchers run from paths with spaces with only Bun available on PATH", async () => {
  const root = directory();
  const scripts = join(root, "scripts");
  cpSync(new URL("../skills/openrouter-expert/scripts/", import.meta.url), scripts, { recursive: true, filter: source => !source.includes(".cache") });
  const bin = join(root, "bin");
  mkdirSync(bin);
  symlinkSync(process.execPath, join(bin, "bun"));
  const fixture = join(scripts, "fixture.mjs");
  writeFileSync(fixture, `globalThis.fetch = async url => new Response(url.includes('/models') ? ${JSON.stringify(catalog)} : process.env.OPENROUTER_TEST_DOCS ?? '- [Quickstart](https://openrouter.ai/docs/quickstart.mdx)\\n');\n`);
  const shell = async (script, args = [], options = {}) => {
    const subprocess = Bun.spawn(["/bin/sh", script, ...args], {
      cwd: scripts,
      env: { ...process.env, PATH: bin, BUN_OPTIONS: "--preload=./fixture.mjs", ...options },
      stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, status] = await Promise.all([new Response(subprocess.stdout).text(), new Response(subprocess.stderr).text(), subprocess.exited]);
    return { stdout, stderr, status };
  };
  expect(await shell("list-models.sh", ["SECOND"])).toEqual({ status: 0, stdout: "provider/SECOND-model\n", stderr: "" });
  expect((await shell(join(scripts, "pull-docs-index.sh"))).status).toBe(0);
  const left = "left\n".repeat(4_000);
  const right = "right\n".repeat(4_000);
  const concurrent = await Promise.all([
    shell("pull-docs-index.sh", [], { OPENROUTER_TEST_DOCS: left }),
    shell("pull-docs-index.sh", [], { OPENROUTER_TEST_DOCS: right }),
  ]);
  expect(concurrent.map(result => result.status)).toEqual([0, 0]);
  expect([left, right]).toContain(readFileSync(join(scripts, ".cache/llms.txt"), "utf8"));
  expect(readdirSync(join(scripts, ".cache")).sort()).toEqual(["llms.prev.txt", "llms.txt"]);
  const missing = await shell("list-models.sh", [], { PATH: root });
  expect(missing.status).toBe(2);
  expect(missing.stderr).toBe("error: bun not found on PATH\n");
});
