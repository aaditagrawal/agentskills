// Reproduce with: bun benchmarks/openrouter.mjs --samples 20 --output /tmp/openrouter-benchmark.json
// Requires the baseline's git, POSIX sh, curl, jq and diff, plus Bun. No public network service is contacted.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, cpus, loadavg, platform, release } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: {
  base: { type: "string", default: "d3a02cceb9f3c6c7a232edd88c6d4bc2c60c6ec0" },
  samples: { type: "string", default: "20" },
  output: { type: "string" },
  cases: { type: "string" },
  "ca-bundle": { type: "string", default: "/etc/ssl/certs/ca-certificates.crt" },
} });
const samples = Number(values.samples);
if (!Number.isInteger(samples) || samples < 5) throw new Error("use at least 5 samples");
const source = new URL("../skills/openrouter-expert/scripts/", import.meta.url);
const root = mkdtempSync(join(tmpdir(), "openrouter-benchmark-"));
const baseline = join(root, "baseline");
const candidate = join(root, "candidate");
mkdirSync(baseline);
cpSync(source, candidate, { recursive: true, filter: path => !path.includes(".cache") });
const certificate = new URL("fixtures/localhost-cert.pem", import.meta.url);
const bundle = join(root, "combined-ca.pem");
writeFileSync(bundle, readFileSync(values["ca-bundle"], "utf8") + "\n" + readFileSync(certificate, "utf8"));
let body = "";
const server = Bun.serve({
  hostname: "127.0.0.1", port: 0,
  tls: { cert: Bun.file(certificate), key: Bun.file(new URL("fixtures/localhost-key.pem", import.meta.url)) },
  fetch: () => new Response(body),
});
const endpoint = server.url.origin;
const git = args => {
  const result = Bun.spawnSync(["git", ...args]);
  if (result.exitCode) throw new Error(result.stderr.toString());
  return result.stdout.toString().trimEnd();
};
const base = git(["rev-parse", values.base]);
for (const name of ["list-models.sh", "pull-docs-index.sh", "check-doc-url.sh"]) {
  const original = git(["show", `${base}:skills/openrouter-expert/scripts/${name}`]);
  writeFileSync(join(baseline, name), original.replaceAll("https://openrouter.ai", endpoint) + "\n");
}
writeFileSync(join(candidate, "benchmark-fetch.mjs"), `const nativeFetch = globalThis.fetch; const ca = await Bun.file(process.env.BENCHMARK_CA).text(); globalThis.fetch = (url, options) => nativeFetch(new URL(new URL(url).pathname, process.env.BENCHMARK_ENDPOINT), { ...options, tls: { ca } });\n`);
const environment = {
  ...process.env,
  BUN_OPTIONS: "",
  CURL_CA_BUNDLE: bundle,
  NODE_EXTRA_CA_CERTS: "",
  NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost",
};
function prepare(directory, old) {
  const cache = join(directory, ".cache");
  rmSync(cache, { recursive: true, force: true });
  mkdirSync(cache);
  if (old !== undefined) writeFileSync(join(cache, "llms.txt"), old);
}
async function execute(command, cwd, env = environment) {
  const start = performance.now();
  const child = Bun.spawn(command, { cwd, env, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  const usage = child.resourceUsage();
  return { ms: performance.now() - start, cpu_ms: Number(usage.cpuTime.total) / 1000, max_rss_bytes: usage.maxRSS, involuntary_context_switches: usage.contextSwitches.involuntary, stdout, stderr, status };
}
async function command(which, scenario) {
  const directory = which === "baseline" ? baseline : candidate;
  prepare(directory, scenario.old);
  const env = which === "baseline" ? environment : {
    ...environment, BENCHMARK_ENDPOINT: endpoint, BENCHMARK_CA: bundle, BUN_OPTIONS: "--preload=./benchmark-fetch.mjs",
  };
  const result = await execute(["/bin/sh", join(directory, scenario.script), ...(scenario.args ?? [])], directory, env);
  if (result.status) throw new Error(`${which} ${scenario.name}: ${result.status} ${result.stderr}`);
  if (scenario.script === "list-models.sh") {
    if (result.stdout !== scenario.expected) throw new Error(`${which} ${scenario.name}: wrong model output`);
  } else {
    if (readFileSync(join(directory, ".cache/llms.txt"), "utf8") !== body) throw new Error("wrong current cache");
    if (scenario.old !== undefined && readFileSync(join(directory, ".cache/llms.prev.txt"), "utf8") !== scenario.old) throw new Error("wrong previous cache");
    if (scenario.old === body && !result.stdout.includes("unchanged since last fetch")) throw new Error("missing unchanged report");
    if (scenario.old !== undefined && scenario.old !== body && !result.stdout.includes("@@")) throw new Error("missing changed diff");
  }
  return result;
}
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { median_ms: sorted[Math.floor(sorted.length / 2)], p95_ms: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] };
}
const scenarios = [];
for (const [name, count] of [["small", 4], ["typical", 500], ["large", 20_000], ["adversarial", 5_000]]) {
  const ids = Array.from({ length: count }, (_, i) => `provider/${name === "adversarial" ? "a.b[1]-" : "model-"}${i}`);
  const data = JSON.stringify({ data: ids.map(id => ({ id, context_length: 128000, pricing: { prompt: "0.000001", completion: "0.000002" } })) });
  scenarios.push({ name: `models-${name}`, script: "list-models.sh", body: data, args: name === "adversarial" ? ["a.b[1]"] : [], expected: ids.join("\n") + "\n" });
  if (name === "typical") scenarios.push({ name: "models-no-match", script: "list-models.sh", body: data, args: ["not-present"], expected: "" });
  if (name === "large") scenarios.push({ name: "models-raw", script: "list-models.sh", body: data, args: ["--json"], expected: data });
}
for (const [name, count] of [["small", 10], ["typical", 500], ["large", 10_000]]) {
  const lines = Array.from({ length: count }, (_, i) => `- [Documentation ${i}](https://openrouter.ai/docs/entry-${i}.mdx)\n`);
  const old = lines.join("");
  const changed = [...lines];
  changed[Math.floor(count / 2)] = "- [New documentation](https://openrouter.ai/docs/new.mdx)\n";
  for (const mode of ["first", "unchanged", "changed"]) scenarios.push({
    name: `docs-${name}-${mode}`, script: "pull-docs-index.sh", body: mode === "changed" ? changed.join("") : old,
    old: mode === "first" ? undefined : old,
  });
  if (name === "large") {
    const disjoint = [...lines];
    for (let i = 0; i < count; i += 100) disjoint[i] = `changed-${i}\n`;
    scenarios.push({ name: "docs-adversarial-disjoint", script: "pull-docs-index.sh", body: disjoint.join(""), old });
  }
}
const results = [];
const loadAtStart = loadavg();
try {
  const pattern = values.cases ? new RegExp(values.cases) : null;
  const selected = scenarios.filter(scenario => !pattern || pattern.test(scenario.name));
  if (!selected.length) throw new Error("--cases did not match any workloads");
  const startup = {};
  for (const [name, argv] of [["posix_sh", ["/bin/sh", "-c", ":"]], ["bun", [process.execPath, "-e", ""]]]) {
    for (let i = 0; i < 3; i++) await execute(argv, root);
    const times = [];
    const cpuTimes = [];
    for (let i = 0; i < samples; i++) { const result = await execute(argv, root); times.push(result.ms); cpuTimes.push(result.cpu_ms); }
    startup[name] = { wall: stats(times), cpu: stats(cpuTimes) };
  }
  for (const scenario of selected) {
    body = scenario.body;
    for (let i = 0; i < 3; i++) {
      await command("baseline", scenario);
      await command("candidate", scenario);
    }
    const times = { baseline: [], candidate: [] };
    const resources = { baseline: [], candidate: [] };
    let outputBytes;
    for (let i = 0; i < samples; i++) {
      for (const which of i % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"]) {
        const result = await command(which, scenario);
        times[which].push(result.ms);
        resources[which].push({ cpu_ms: result.cpu_ms, max_rss_bytes: result.max_rss_bytes, involuntary_context_switches: result.involuntary_context_switches });
        outputBytes ??= {};
        outputBytes[which] = Buffer.byteLength(result.stdout);
      }
    }
    const result = { name: scenario.name, input_bytes: Buffer.byteLength(body), output_bytes: outputBytes, baseline: stats(times.baseline), candidate: stats(times.candidate) };
    result.samples_ms = times;
    result.resources = resources;
    result.cpu = { baseline: stats(resources.baseline.map(sample => sample.cpu_ms)), candidate: stats(resources.candidate.map(sample => sample.cpu_ms)) };
    result.ratio = result.candidate.median_ms / result.baseline.median_ms;
    result.pass = result.candidate.median_ms <= result.baseline.median_ms && result.candidate.p95_ms <= result.baseline.p95_ms;
    results.push(result);
    console.error(`${scenario.name}: median ${result.baseline.median_ms.toFixed(2)} -> ${result.candidate.median_ms.toFixed(2)} ms, p95 ${result.baseline.p95_ms.toFixed(2)} -> ${result.candidate.p95_ms.toFixed(2)} ms ${result.pass ? "PASS" : "FAIL"}`);
  }
  const report = {
    base, samples_per_implementation_per_case: samples, warmups_per_case: 3,
    environment: { bun: Bun.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, loadavg_at_start: loadAtStart, loadavg_at_end: loadavg(), curl: Bun.spawnSync(["curl", "--version"]).stdout.toString().split("\n")[0], jq: Bun.spawnSync(["jq", "--version"]).stdout.toString().trim() },
    method: "Alternating warmed complete shell commands. Baseline copied from git and only https://openrouter.ai URL literals replaced with localhost HTTPS endpoint. Candidate unchanged shell launcher with benchmark-only fetch preload mapping URLs to identical endpoint. Real curl and Bun fetch verify identical system-root-plus-fixture CA bundle, curl CURL_CA_BUNDLE and Bun tls.ca. Production client keeps default TLS validation. No proxy; 0 imposed server delay. Timings include process startup, TLS/network, processing and stdout consumption. Cache setup excluded. Child resourceUsage CPU includes shell-reaped descendants; CPU time excludes network/scheduler waits. Output and both cache snapshots verified after every command.",
    startup, results, pass: results.every(result => result.pass),
  };
  if (values.output) writeFileSync(values.output, JSON.stringify(report, null, 2) + "\n");
  else console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.pass ? 0 : 1;
} finally {
  server.stop(true);
  rmSync(root, { recursive: true, force: true });
}
