---
name: ci-lint-templates
description: Apply reusable oxlint baselines and GitHub Actions CI workflows for Next/Vite/Astro/Expo/TS libraries, plus Bun, pnpm, Python uv+Ruff, and Android Gradle. Use when scaffolding lint config, hardening CI, adding oxlint, parallel CI jobs, caching, concurrency, or the user mentions ci-lint-templates, oxlintrc, bun-ci-parallel, pnpm CI, uv ruff workflow, or android-gradle CI.
metadata:
  version: 1.0.0
---

# CI + lint templates

Copy baselines from `assets/` into the target repo. Do not symlink across unrelated projects.

## Templates

| Need | Asset |
|------|--------|
| Next.js + React oxlint | `assets/oxlint/next-react.oxlintrc.json` → `.oxlintrc.json` |
| Vite + React oxlint | `assets/oxlint/vite-react.oxlintrc.json` |
| Astro oxlint | `assets/oxlint/astro.oxlintrc.json` |
| TS library / CLI oxlint | `assets/oxlint/library-cli-ts.oxlintrc.json` |
| Expo / RN oxlint | `assets/oxlint/expo-rn.oxlintrc.json` |
| Bun parallel CI | `assets/github-actions/bun-ci-parallel.yml` |
| pnpm parallel CI | `assets/github-actions/pnpm-ci-parallel.yml` |
| Python uv + Ruff CI | `assets/github-actions/python-uv-ruff.yml` |
| Android Gradle CI | `assets/github-actions/android-gradle.yml` |

Read `assets/README.md` for when-to-use tables and `assets/AGENTS.md` for the apply checklist.

## Defaults to preserve

- Oxlint: `correctness=error`, `suspicious=warn` (error for libraries), `perf=warn`; style/pedantic/nursery/restriction off.
- Explicit full `plugins` lists (oxlint replaces defaults when `plugins` is set).
- `settings.react.version` must be semver (not `"detect"`).
- React hooks/refresh rules use the `react/` prefix (`react/rules-of-hooks`, `react/only-export-components`).
- Workflows: concurrency + cancel-in-progress on PRs, lockfile-backed caches, parallel jobs, `ci-ok` gate, minimal permissions.

## Apply steps

1. Pick the closest stack row above.
2. Copy the file; rename oxlint assets to `.oxlintrc.json`.
3. Align ignores and `settings.next.rootDir` / React version with the repo.
4. Align CI script names with existing `package.json` / Gradle / uv commands.
5. Run lint locally once; only then enable `options.typeAware` if desired.

## Do not

- Enable `categories.style` when a formatter already runs in CI.
- Mix a full ESLint + oxlint duplicate rule set without a migration plan.
- Commit secrets or widen workflow permissions without need.
