# CI Quality Workflow — Requirements

This document specifies two changes to the GitHub Actions CI pipeline. Both
should be implemented in a single PR.

---

## Change 1: New `quality.yml` Workflow

### Purpose

Add a GitHub Actions workflow that runs the project's quality checks
(TypeScript, Biome lint, format validation, convention checks) on every PR and
push to `main`. These checks currently run only locally via pre-commit hooks and
`pnpm check`. A developer who bypasses hooks (`--no-verify`) or forgets to run
`pnpm check` can merge code that violates project standards.

### Checks to Run

The workflow must execute `pnpm check`, which expands to:

```
pnpm typecheck      → astro check (TypeScript validation)
pnpm lint           → biome lint . (Biome linting)
pnpm format:check   → biome format --diagnostic-level=error . && prettier --check "**/*.{astro,md,mdx,yml,yaml}" --cache
pnpm check:conventions → node scripts/check-conventions.mjs
```

Run these as a single `pnpm check` command, not as separate steps. If any step
fails, `pnpm check` exits non-zero and the workflow fails.

### Trigger Conditions

| Trigger        | Branches | Path Filter     | Bot Skip                                         |
| :------------- | :------- | :-------------- | :----------------------------------------------- |
| `pull_request` | `main`   | Yes (see below) | Yes — skip `renovate[bot]` and `dependabot[bot]` |
| `push`         | `main`   | Yes (see below) | Yes — same actors                                |

### Path Filter

Trigger when any of these paths change:

```yaml
paths:
  - 'src/**'
  - 'scripts/**'
  - 'public/**'
  - '*.config.mjs'
  - '*.config.ts'
  - 'biome.json'
  - 'tsconfig.json'
  - '.prettierrc.mjs'
  - 'package.json'
  - 'pnpm-lock.yaml'
  - '.github/workflows/quality.yml'
```

This is intentionally broader than the tests workflow because formatting and
linting apply to all source file types (`.astro`, `.ts`, `.css`, `.md`), not
just TypeScript.

### Environment Setup

Follow the same pattern as `tests.yml`:

1. Checkout repository
2. Enable Corepack (`corepack enable`)
3. Setup Node.js (read version from `.nvmrc`, cache pnpm)
4. `pnpm install --frozen-lockfile`

Do **not** use `pnpm/action-setup` — Corepack handles pnpm activation. This is
consistent with `tests.yml`.

### Status Check Pattern

Include a `quality-status` job (same pattern as `test-status` in `tests.yml` and
`link-check-status` in `links.yml`) that provides a consistent status check for
branch protection:

- `success` → exit 0
- `skipped` (no relevant files changed or bot commit) → exit 0
- `failure` or `cancelled` → exit 1

### Job Summary

Create a Job Summary step that reports pass/fail status, similar to `tests.yml`.

### Constraints

- Timeout: 5 minutes (typical run: <30 seconds)
- Permissions: `contents: read` only
- Concurrency: cancel-in-progress, grouped by workflow + ref
- Inline documentation: follow the commenting style of the existing workflows
  (header block explaining strategy, section dividers for each step)

---

## Change 2: Fix `tests.yml` Path Filter

### Problem

`vitest.config.ts` includes `scripts/**/*.test.mjs` in its test discovery, but
the `tests.yml` workflow path filter only watches `src/**/*.ts`. Changes to
`scripts/conventions/checks.mjs` or `scripts/conventions/checks.test.mjs` do not
trigger CI test runs.

### Fix

Add `scripts/**` to the paths filter in `tests.yml`, for both the `pull_request`
and `push` triggers:

```yaml
paths:
  - 'src/**/*.ts'
  - 'scripts/**' # ← add this line
  - 'vitest.config.ts'
  - 'tsconfig.json'
  - 'package.json'
  - 'pnpm-lock.yaml'
  - '.github/workflows/tests.yml'
```

---

## Documentation Updates

After both changes are implemented, update the following:

1. **ARCHITECTURE.md → CI/CD Pipeline**: Add TypeCheck, Lint, Format,
   Conventions to the GitHub Actions group in the mermaid diagram. Remove the
   "Local-only checks" paragraph (it becomes obsolete).

2. **ARCHITECTURE.md → Infrastructure Enhancements**: Change the "CI Quality
   Workflow" status from "Local only (pre-commit + build)" to "Implemented" (or
   remove the row).

3. **MAINTENANCE.md → Maintenance Lifecycle diagram**: Add the quality workflow
   node alongside Tests, Links, and Semgrep. Same trigger pattern (PR_Human
   triggers it, PR_Bot skips it).

4. **MAINTENANCE.md**: Add an "Automated Quality Checks" section (same structure
   as the existing "Automated Testing" section) describing the workflow, its
   triggers, and what it validates. Remove the "Path filter gap" note from the
   Automated Testing section once the `scripts/**` path is added.

5. **DEVELOPMENT.md → Daily Workflow → Step 5**: The description of `pnpm check`
   can note that the same checks also run in CI via GitHub Actions.

---

## Acceptance Criteria

- [ ] `pnpm check` runs as a GitHub Actions status check on every PR to `main`
- [ ] Bot commits (Renovate, Dependabot) skip the quality workflow
- [ ] The quality workflow does not trigger when only non-source files change
      (e.g., README.md edits)
- [ ] Changes to `scripts/**` trigger the tests workflow
- [ ] Both workflows provide a stable status check name for branch protection
- [ ] All documentation listed above is updated in the same PR
- [ ] The workflow follows the inline documentation style of existing workflows
