# CI + Lint Reference Templates

Reusable baselines for **oxlint** and **GitHub Actions**. Copy into a repo; do not treat as a shared package dependency unless you promote them later.

Paths:

| Kind | Path |
|------|------|
| Oxlint baselines | [`oxlint/`](./oxlint/) |
| Workflow snippets | [`github-actions/`](./github-actions/) |
| Agent playbook | [`AGENTS.md`](./AGENTS.md) |

## Oxlint — when to use which

| Template | Use when | Key plugins |
|----------|----------|-------------|
| [`next-react`](./oxlint/next-react.oxlintrc.json) | Next.js App/Pages Router + React | `react`, `nextjs`, `jsx-a11y`, `import` |
| [`vite-react`](./oxlint/vite-react.oxlintrc.json) | Vite + React SPA/library UI | `react`, `jsx-a11y`, `import`, `vitest` |
| [`astro`](./oxlint/astro.oxlintrc.json) | Astro sites (islands / SSR) | `react` (islands), `import`, `jsx-a11y` |
| [`library-cli-ts`](./oxlint/library-cli-ts.oxlintrc.json) | TS libraries, CLIs, Node tools | `node`, `import`, `promise`, `jsdoc` |
| [`expo-rn`](./oxlint/expo-rn.oxlintrc.json) | Expo / React Native | `react`, `react-perf`, `jsx-a11y`, `promise` |

### Design defaults (all oxlint templates)

- **Categories:** `correctness=error`, `suspicious=warn`, `perf=warn`. Style/pedantic/nursery/restriction stay off — formatters own style; pedantic/nursery are opt-in.
- **Plugins:** Explicit full lists (setting `plugins` replaces defaults). Always keep `eslint`, `typescript`, `unicorn`, `oxc` unless you have a reason not to.
- **Ignores:** Build outputs, caches, generated dirs, lockfile-adjacent noise. Prefer `ignorePatterns` in config; still respect `.gitignore`.
- **Overrides:** Tests get framework plugins (`vitest`/`jest`) and relaxed `no-console` / `any` where useful.
- **Type-aware:** Not enabled by default (slower CI). Turn on later via `"options": { "typeAware": true }` in the root config once the project is green.
- **Install as:** copy → rename to `.oxlintrc.json` at package/app root. Schema: `./node_modules/oxlint/configuration_schema.json` after `oxlint` is installed.

### Pairing with formatters

These configs intentionally avoid style-category rules. Pair with **oxfmt**, Prettier, or Biome format-only in CI (`format --check`).

## GitHub Actions — when to use which

| Template | Use when |
|----------|----------|
| [`bun-ci-parallel.yml`](./github-actions/bun-ci-parallel.yml) | Bun lockfile (`bun.lock` / `bun.lockb`); want lint/format/typecheck/build as parallel jobs |
| [`pnpm-ci-parallel.yml`](./github-actions/pnpm-ci-parallel.yml) | pnpm workspace / `pnpm-lock.yaml`; same parallel shape |
| [`python-uv-ruff.yml`](./github-actions/python-uv-ruff.yml) | Python with `uv` + Ruff (lint/format) + optional typecheck |
| [`android-gradle.yml`](./github-actions/android-gradle.yml) | Android Gradle modules; lint + unit tests + assemble |

### Workflow design defaults

- **Concurrency:** `group` per workflow + ref; `cancel-in-progress` on PRs.
- **Permissions:** least privilege (`contents: read` for pure CI).
- **Caching:** Bun/pnpm via official setup actions; uv cache; Gradle via `gradle/actions/setup-gradle`.
- **Parallelism:** separate jobs for lint / format / typecheck / build so failures isolate and runners overlap.
- **Timeouts:** every job has `timeout-minutes`.
- **Scripts assumed:** `lint`, `format:check` (or `fmt:check`), `typecheck`, `build` in `package.json` / `pyproject` / Gradle tasks — adapt names to the repo.

## Quick apply

```bash
# Example: Next app
cp oxlint/next-react.oxlintrc.json /path/to/app/.oxlintrc.json

# Example: Bun CI
mkdir -p /path/to/repo/.github/workflows
cp github-actions/bun-ci-parallel.yml /path/to/repo/.github/workflows/ci.yml
# Edit script names / Node version / filters
```

## Agent note

If you are an agent applying these: read [`AGENTS.md`](./AGENTS.md) first, pick the closest stack template, copy (do not symlink across unrelated repos), then tighten ignores and script names to match the target repo.
