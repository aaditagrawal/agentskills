# OpenRouter helper benchmark

Run from the repository root with Bun 1.4.4 and the baseline's POSIX shell, git, curl, jq and diff utilities available. No package installation or public network request is needed.

```sh
bun benchmarks/openrouter.mjs --samples 20 --output /tmp/openrouter-benchmark.json
# A smaller subset for an independent check:
bun benchmarks/openrouter.mjs --samples 20 --cases 'models-small|docs-typical-changed' --output /tmp/openrouter-subset.json
```

The default baseline is PR base `d3a02cceb9f3c6c7a232edd88c6d4bc2c60c6ec0`. Use `--base <commit>` to compare another committed snapshot. The script reads it through `git show`, copies both implementations to temporary directories, and removes them on completion. It never changes a checkout.

Both clients contact one loopback HTTPS server with no imposed delay. Baseline scripts only have the `https://openrouter.ai` URL literals redirected. Candidate shell launchers stay unchanged, with a benchmark-only preload mapping their fetch URLs to the same server. The clients verify an identical CA bundle containing system roots and the fixture certificate. Curl uses `CURL_CA_BUNDLE` and Bun uses `tls.ca` in the preload. Production code keeps default TLS validation. Use `--ca-bundle <path>` if the system root bundle is not at `/etc/ssl/certs/ca-certificates.crt`.

Each case runs three warmups, then alternates baseline-first and candidate-first pairs. Timings cover the complete shell command, TLS/network, processing and consumed stdout. Cache setup happens before timing. Every model output and both docs cache snapshots are checked after every command. Cases cover small, typical, large and adversarial catalogs, raw bytes, no-match filtering, and first, unchanged and changed docs refreshes. Disjoint index edits include the candidate's larger single-hunk output in the timed work.

The JSON reports every sample, wall-clock median and p95, child CPU time, peak RSS, involuntary context switches, startup measurements, tool versions and system load. Child CPU usage includes shell-reaped descendants. CPU time excludes network and scheduler waits. The command exits unsuccessfully if any case regresses in median or p95 wall time. Run it under the coordinated exclusive benchmark gate on a quiet host before treating results as performance evidence. Preliminary measurements under heavy host contention do not establish a pass.

The cached URL checker retains its existing shell implementation. It is not a Bun replacement and is outside this benchmark.

`fixtures/localhost-cert.pem` and `fixtures/localhost-key.pem` are public, test-only TLS fixtures generated for this benchmark. The key is intentionally committed and must never be used for a real service. The local fixture server exists only for the duration of the benchmark.
