# Agent playbook: CI + lint templates

Use this when scaffolding or hardening lint/CI for a JS/TS, Python, or Android repo.

## Decision tree

1. **JS/TS app framework?**
   - Next.js → `oxlint/next-react.oxlintrc.json`
   - Vite + React → `oxlint/vite-react.oxlintrc.json`
   - Astro → `oxlint/astro.oxlintrc.json`
   - Expo / RN → `oxlint/expo-rn.oxlintrc.json`
   - Library / CLI / plain Node TS → `oxlint/library-cli-ts.oxlintrc.json`
2. **Package manager / language CI?**
   - Bun → `github-actions/bun-ci-parallel.yml`
   - pnpm → `github-actions/pnpm-ci-parallel.yml`
   - Python (uv) → `github-actions/python-uv-ruff.yml`
   - Android → `github-actions/android-gradle.yml`

## Apply rules

- Copy into the target repo; rename oxlint files to `.oxlintrc.json`.
- Do **not** enable `categories.style` if a formatter already runs in CI.
- Keep `plugins` as a complete list (oxlint replaces defaults when set).
- Add monorepo package ignores only after inspecting real output dirs (`.next`, `dist`, `.astro`, `android/app/build`, etc.).
- Wire CI script names to existing `package.json` / just / Task targets; do not invent scripts without checking.
- Prefer parallel jobs over one mega-job for lint/format/typecheck/build.
- Leave `options.typeAware` off until baseline CI is green.

## Quality bar after apply

- [ ] `oxlint` passes locally with the new config
- [ ] Formatter check does not duplicate oxlint style rules
- [ ] Workflow concurrency cancels stale PR runs
- [ ] Dependency cache keys include the lockfile
- [ ] Job timeouts set; permissions minimal

## Do not

- Commit secrets or enable `pull-requests: write` unless a job needs it
- Force-push template branches onto `main`
- Mix ESLint + oxlint on the same rule set without an explicit migration plan
- Enable nursery/pedantic categories in baselines without a team decision
