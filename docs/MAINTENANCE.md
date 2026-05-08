# Maintenance Guide

This document defines the operational procedures required to keep the **Team 4
Pro Coaching** website healthy, secure, and up-to-date.

## Table of Contents

- [Objectives](#objectives)
- [Maintenance Lifecycle](#maintenance-lifecycle)
- [Regular Maintenance Tasks](#regular-maintenance-tasks)
- [Dependency Management](#dependency-management)
- [Automated Testing](#automated-testing)
- [Automated Quality Checks](#automated-quality-checks)
- [Security Operations](#security-operations)
- [Link Health Monitoring](#link-health-monitoring)
- [Emergency Procedures](#emergency-procedures)
- [Reference](#reference)

---

## Objectives

The maintenance strategy follows the design principles defined in the
[Architecture Overview](ARCHITECTURE.md):

| Principle              | Implementation                                     |
| :--------------------- | :------------------------------------------------- |
| **Automation First**   | Renovate and CI/CD do the heavy lifting            |
| **Proactive Security** | Fix vulnerabilities before they can be exploited   |
| **Stability**          | Updates accepted only if they pass strict CI gates |
| **Zero Downtime**      | Maintenance tasks never impact live site           |

### Roles & Responsibilities

| Role               | Responsibility                               | Frequency    |
| :----------------- | :------------------------------------------- | :----------- |
| **Maintainer**     | Review Renovate PRs, monitor Security Alerts | Weekly (Mon) |
| **Developer**      | Fix CI failures, implement feature updates   | Ad-hoc       |
| **Content Editor** | Verify content rendering on Preview          | Ad-hoc       |

---

## Maintenance Lifecycle

```mermaid
graph TD
    subgraph "Triggers"
        Weekly[Weekly Schedule<br/>Mon Start]
        Monthly[Monthly Schedule<br/>1st of Month]
        PR_Human[PR: Developer]
        PR_Bot[PR: Renovate/Bot]
    end

    Weekly -->|Trigger| Renovate[Renovate Bot]
    Monthly -->|Trigger| Renovate

    Renovate -->|Create PR| PR_Bot

    PR_Human -->|Trigger| Quality["Quality Checks<br/>(TypeCheck, Lint, Format)"]
    PR_Human -->|Trigger| Tests["Unit Tests<br/>(Vitest)"]
    PR_Human -->|Trigger| LinkFast["Link Check<br/>(Fast/Internal)"]
    PR_Human -->|Trigger| SemgrepDiff["Semgrep SAST<br/>(Diff Only)"]

    PR_Bot -->|Trigger| Quality
    PR_Bot -->|Trigger| Tests
    PR_Bot -->|Trigger| LinkFast
    PR_Bot -.->|Skip| SemgrepDiff

    Weekly -->|02:00 UTC| LinkFull["Link Check<br/>(Full/External)"]
    Weekly -->|04:30 UTC| SemgrepFull["Semgrep SAST<br/>(Full Scan)"]

    Quality -->|Gate| CI_Gate{CI Pass?}
    Tests -->|Gate| CI_Gate
    LinkFast -->|Gate| CI_Gate
    SemgrepDiff -->|Gate| CI_Gate

    LinkFull -->|Failure| Issue[GitHub Issue]
    SemgrepFull -->|Results| SecTab[GitHub Security Tab]

    CI_Gate -->|Yes| Merge[Merge to Main]
    CI_Gate -->|No| Fix[Request Changes]

    style Quality fill:#805ad5,stroke:#333,color:#fff
    style SemgrepDiff fill:#e53e3e,stroke:#333,color:#fff
    style SemgrepFull fill:#e53e3e,stroke:#333,color:#fff
    style SecTab fill:#e53e3e,stroke:#333,color:#fff
    style Renovate fill:#00c7b7,stroke:#333,color:#fff
    style LinkFull fill:#3182ce,stroke:#333,color:#fff
    style Tests fill:#38a169,stroke:#333,color:#fff
```

---

## Regular Maintenance Tasks

### Weekly Routine (Mondays)

Renovate is configured to group updates and open PRs every Monday morning
(before 4am). See [`renovate.json`](../renovate.json) for the exact schedule and
[reference/renovate.md](reference/renovate.md) for detailed configuration.

#### 1. Check Dependency Dashboard (5 min)

Navigate to: GitHub Issues → "📄 Dependency Updates Dashboard"

**Actions**:

- Look for errors or rate limits
- Check checkboxes to un-pause updates if needed

#### 2. Review Open PRs (10 min)

| PR Type              | Automation Level | Action               |
| :------------------- | :--------------- | :------------------- |
| **Code Quality**     | Auto-merge       | Monitor only         |
| **Patch/Minor**      | Auto-merge       | Monitor only         |
| **Astro Framework**  | Grouped, Manual  | Review rendering     |
| **Tailwind CSS**     | Grouped, Manual  | Verify styling       |
| **Major Updates**    | Manual           | Read changelog, test |
| **Security Updates** | Immediate        | Prioritize review    |

#### 3. Housekeeping (2 min)

- Delete stale branches if not auto-deleted
- Check for "Pending" status (Renovate limits concurrent PRs to 5)

### Monthly Tasks (As Needed)

#### 1. Review Security Alerts (5 min)

- Dependabot/GitHub security advisories
- Renovate PRs with `security` label
- Socket.dev warnings in recent PRs

#### 2. Review Documentation (15 min)

Check if updates needed:

- README.md
- docs/DEVELOPMENT.md
- docs/ARCHITECTURE.md
- docs/MAINTENANCE.md

#### 3. Check Deployment Health (5 min)

- Visit https://team4procoaching.com
- Verify site loads correctly
- Check Netlify dashboard for issues
- Review build times (should be <2 minutes)

### Quarterly Audit

#### 1. Dependency Hygiene (15 min)

```bash
# Check for outdated packages Renovate might have missed
pnpm outdated

# List top-level dependencies — review against actual imports
pnpm ls --depth=0
```

`pnpm outdated` finds _outdated_ packages. For _unused_ dependencies (installed
but never imported), manually review the list against actual usage in `src/` and
`scripts/`. If the project grows, consider adding `knip` for automated dead
dependency detection.

#### 2. Config Validation (10 min)

```bash
# Validate Renovate config
pnpm validate:renovate

# Check for stricter Biome rules
pnpm check
```

#### 3. Runtime Sync (5 min)

Verify `engines` in `package.json` matches production environment.

---

## Dependency Management

We use **Renovate Bot** with configuration in
[`renovate.json`](../renovate.json).

### Update Strategy Matrix

| Type                | Example                         | Automation       | Schedule      |
| :------------------ | :------------------------------ | :--------------- | :------------ |
| **Patch/Minor**     | `1.0.1` → `1.1.0`               | Auto-merge       | Weekly (Mon)  |
| **Code Quality**    | Biome, Prettier, Husky          | Auto-merge       | Weekly (Mon)  |
| **Astro Framework** | `astro`, `@astrojs/*`           | Grouped + Manual | Weekly (Mon)  |
| **Tailwind CSS**    | `tailwindcss`, `@tailwindcss/*` | Grouped + Manual | Weekly (Mon)  |
| **Major**           | `1.0.0` → `2.0.0`               | Manual Review    | Weekly (Mon)  |
| **Runtime**         | Node, pnpm                      | Manual Review    | Monthly (1st) |
| **Security**        | CVE patches                     | Immediate        | Any time      |

### Handling Major Updates

Major updates often introduce breaking changes:

#### 1. Read the Changelog

Renovate embeds the changelog in the PR body. Look for "BREAKING CHANGES".

#### 2. Local Test

```bash
gh pr checkout <PR-NUMBER>
pnpm install

# Run full quality suite
pnpm check

# Verify visually
pnpm dev
```

#### 3. Fix Issues

- Linter errors: Run `pnpm fix`
- Logic breaks: Fix manually, commit, push to PR branch

---

## Automated Testing

Configuration: [`.github/workflows/tests.yml`](../.github/workflows/tests.yml)

| Trigger          | Scope        | Behavior                          |
| :--------------- | :----------- | :-------------------------------- |
| **PR**           | All PRs      | Blocking (fails on test failures) |
| **Push to main** | All pushes   | Validates integrity after merge   |
| **Bot commits**  | Runs as well | Catches broken dependencies       |

The workflow runs `pnpm test:run` (Vitest, single pass) on every PR — no path
filtering. This avoids the GitHub Actions "pending check" problem where
workflow-level path filters can cause required status checks to hang. Tests
complete in <10 seconds with cached dependencies.

Test failures appear as inline annotations in the PR diff via Vitest's
`--reporter=github-actions`.

---

## Automated Quality Checks

Configuration:
[`.github/workflows/quality.yml`](../.github/workflows/quality.yml)

| Trigger          | Scope        | Behavior                      |
| :--------------- | :----------- | :---------------------------- |
| **PR**           | All PRs      | Blocking (fails on any check) |
| **Push to main** | All pushes   | Validates quality after merge |
| **Bot commits**  | Runs as well | Catches type/lint errors      |

The workflow runs four checks as separate steps for diagnostic visibility:
TypeScript type checking, Biome linting, format validation (Biome + Prettier),
and project convention checks. The Job Summary shows a per-check pass/fail
table. Any failure blocks merge via branch protection.

These checks also run locally via pre-commit hooks (lint-staged) and
`pnpm check`. The CI workflow catches bypasses (`--no-verify`) and forgotten
local checks.

### Local Duplication Gate

See [ADR-0045](adr/0045-local-jscpd-duplication-gate.md) for the full rationale.

A `.husky/pre-push` hook runs `pnpm check:duplication`, which executes
[jscpd](https://github.com/kucherenko/jscpd) against `src/` and `scripts/`.
Configuration lives in [`.jscpd.json`](../.jscpd.json) at the repo root with
`minTokens: 100` and `mode: strict`. The threshold for failures is `0` — any
detected cluster of 100 tokens or more fails the push.

| Trigger        | Scope               | Behavior                              |
| :------------- | :------------------ | :------------------------------------ |
| **git push**   | `src/` + `scripts/` | Blocking (fails on any cluster)       |
| **Manual run** | `src/` + `scripts/` | `pnpm check:duplication` ad-hoc       |
| **CI**         | -                   | Not run in CI; local prevention layer |

Typical run time on Windows is ~7–8 s wall-clock (cold first run is slightly
slower than subsequent warm runs). Run `pnpm check:duplication` before push if
you want to inspect the cluster inventory locally without committing.

#### Bypass

During the post-activation phase, while the day-one cluster inventory is being
reduced via follow-up streams, use `git push --no-verify` to bypass the gate.
Bypass is intended for inventory reduction, not as a default workflow — every
bypassed push leaves a cluster the next contributor will hit.

#### Activation push

The introductory PR that lands this gate must bypass it on its first push,
because the day-one cluster inventory (refactor, test-builder, fixture,
astro-template, and domain-data categories) was pre-existing at activation time:

```
git push --no-verify -u origin HEAD
```

See [ADR-0045](adr/0045-local-jscpd-duplication-gate.md) for the cluster
categories and per-category disposition.

#### Threshold-stability contract

Any change to `.jscpd.json`'s `minTokens`, `mode`, or `formatsExts` requires
explicit owner sign-off and a Status update on
[ADR-0045](adr/0045-local-jscpd-duplication-gate.md). These values are not
contributor-tunable — they define the contract the gate enforces.

#### Accepted duplication

`.jscpd.json` → `ignore` carries explicit per-file entries for the small, closed
set of files where duplication is intentional under the project's domain-data
and test-fixture rules. The acceptance criteria — when a new cluster belongs in
the ignore list and when it does not — live in
[CONVENTIONS.md § Accepted Duplication in Domain Data and Test Fixtures](CONVENTIONS.md#accepted-duplication-in-domain-data-and-test-fixtures).
Before adding an entry, check the criteria there.

#### Editing `.jscpd.json`

The file must be plain JSON. Comments (`//` or `/* */`) break the parser: jscpd
loads the config via `jsonfile`, which calls strict `JSON.parse` and rejects any
non-JSON input. Do not add JSON5-style annotations.

### Branch Protection Configuration

In GitHub Branch Protection settings, add the **status job names** as required
checks — not the main job names:

| Workflow      | Required Check Name   | Not This             |
| :------------ | :-------------------- | :------------------- |
| `quality.yml` | **Quality Status**    | Quality Checks       |
| `tests.yml`   | **Test Status**       | Unit Tests           |
| `links.yml`   | **Link Check Status** | Check Internal Links |

The status jobs run unconditionally (`if: always()`), ensuring every PR receives
a definitive pass or fail. The main jobs could theoretically be skipped (e.g.,
by a future `if` condition), which would leave a required check in "Pending"
state indefinitely.

> **Drift warning**: If a status job is renamed (e.g., `Quality Status` →
> `Code Quality Status`), update GitHub Branch Protection immediately — the old
> name will stop matching and PRs will hang as "Pending".

---

## Security Operations

We operate on a **Defense in Depth** model with automated scanning and strict
gates.

### Automated Scanning (Semgrep)

Configuration:
[`.github/workflows/semgrep.yml`](../.github/workflows/semgrep.yml)

| Scan Type     | Trigger          | Scope              | Behavior                              |
| :------------ | :--------------- | :----------------- | :------------------------------------ |
| **Diff Scan** | PR (Developers)  | Changed files only | Blocking (fails on high-severity)     |
| **Full Scan** | Monday 04:30 UTC | Entire Codebase    | Monitoring (detect drift)             |
| **Bot Skip**  | PR (Renovate)    | -                  | Skipped (deps checked via Socket.dev) |

Semgrep is a source code scanner (SAST) — it analyzes _your_ code for
vulnerabilities, not dependency code. Dependency security is handled by
Socket.dev (supply chain) and Renovate's vulnerability alerts. Running Semgrep
on a dependency-only PR would scan unchanged source files for no benefit.

**Rule Sources** (run as separate steps — `semgrep ci` does not accept
`--config` when authenticated):

- **Platform Rules**: `semgrep ci` with `SEMGREP_APP_TOKEN` — managed rulesets,
  diff-aware scanning on PRs
- **Custom Rules**: `semgrep scan --config .semgrep/` — project-specific rules
  for Astro patterns (e.g., JSX comment placement in `.semgrep/astro-rules.yml`)

**Viewing Results**:

- **PRs**: Failures in PR checks
- **Overview**: GitHub → Security → Code scanning

### Handling Security Alerts

#### Scenario A: Semgrep Fails on PR

1. Click "Details" on failing CI check
2. Review flagged code line
3. **Fix**: Rewrite code to be secure (e.g., sanitize input)
4. **False Positive (single line)**: Add `// nosemgrep: RULE_ID` with
   explanation
5. **False Positive (file category)**: Add pattern to `.semgrepignore`

**Note**: Test source files (`*.test.ts`, `*.spec.ts`) are excluded from Semgrep
scanning via `.semgrepignore`. Test code legitimately uses patterns like
`innerHTML` for DOM fixture setup that would be flagged as security issues in
production code.

#### Scenario B: Supply Chain Alert (Socket.dev/Renovate)

1. **Assess Severity**: Critical/High requires immediate action
2. **Verify Context**: Is the vulnerable function actually used?
3. **Remediate**: Update package or use `pnpm.overrides` if no patch exists

#### Scenario C: Secrets Leaked (GitGuardian)

See
[Emergency Procedures → Secrets Leaked to GitHub](#scenario-a-secrets-leaked-to-github)
for the canonical Revoke → Rotate → Clean runbook. Treat a GitGuardian alert as
the trigger that activates that procedure.

---

## Link Health Monitoring

Broken links damage SEO and user trust. We use **Lychee** for automated link
validation.

Configuration: [`.github/workflows/links.yml`](../.github/workflows/links.yml)

### Scanning Strategy

| Mode          | Trigger          | Scope             | Purpose                             |
| :------------ | :--------------- | :---------------- | :---------------------------------- |
| **Fast Scan** | PR / Push        | Internal Only     | Prevents broken relative links      |
| **Full Scan** | Monday 02:00 UTC | Internal+External | Checks external resources are alive |

### Handling Link Failures

#### Scenario A: PR Check Failed

1. Check "Job Summary" in GitHub Actions
2. Fix broken internal link or typo
3. Push fix to update PR

#### Scenario B: Weekly Issue Created

Issue title: "🔗 Link Check Weekly Scan: Broken Links Detected"

1. **Analyze**: Read report snippet in issue body
2. **Verify**: Check if external site is down or blocking bots (403/429)
3. **Fix**:
   - **Dead Link**: Remove or replace in content
   - **False Positive**: Add URL to `.lycheeignore`

### Configuration (`.lycheeignore`)

Exclude specific URLs from checking:

```text
# Example .lycheeignore
https://www.linkedin.com/in/  # Blocks bots consistently
http://localhost:3000         # Local dev examples
https://example.com/protected # Requires login
```

---

## Emergency Procedures

> **Critical**: In case of major security breach or site outage, follow these
> steps strictly.

### Scenario A: Secrets Leaked to GitHub

**Trigger**: GitGuardian alert or manual discovery.

1. **REVOKE** credential immediately at provider (stops attack)
2. **ROTATE** secrets in Netlify Environment Variables / GitHub Secrets
3. **CLEAN** git history:
   ```bash
   # Use BFG Repo-Cleaner or git filter-repo
   git push --force
   ```

### Scenario B: Production Broken (Bad Deploy)

**Trigger**: Site is offline or broken layout.

1. **Go to Netlify Dashboard** → **Deploys**
2. Find last successful deploy (green)
3. Click **"Publish deploy"** (instant rollback)
4. **Revert** bad merge in GitHub:
   ```bash
   git revert -m 1 <COMMIT-HASH>
   git push
   ```

### Scenario C: Build Failures

1. Check if the failure was caused by an auto-merged Renovate PR:
   ```bash
   git log --oneline -5
   ```
   If the latest commit is `chore(deps):` from Renovate, revert it (see Scenario
   B) and investigate the dependency update.
2. Check Netlify build logs for specific error
3. Test locally:
   ```bash
   rm -rf node_modules
   pnpm install --frozen-lockfile
   pnpm build
   ```
4. Common causes: TypeScript errors, missing deps, invalid env vars, Node
   version mismatch

### Accessing Critical Systems

| System      | Access Method                        |
| :---------- | :----------------------------------- |
| **Netlify** | Contact organization owner           |
| **GitHub**  | Request repository access            |
| **DNS**     | Check registrar (documented offline) |

---

## Reference

### Project Documentation

| Document                              | Purpose                             |
| :------------------------------------ | :---------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)    | System design & decision records    |
| [DEVELOPMENT.md](DEVELOPMENT.md)      | Setup, commands, and local workflow |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution guidelines             |
| [ADR Log](adr/)                       | History of architectural decisions  |

### Configuration & Tooling

| Config                                        | Documentation                                             |
| :-------------------------------------------- | :-------------------------------------------------------- |
| [`renovate.json`](../renovate.json)           | [Renovate Docs](https://docs.renovatebot.com/)            |
| [`biome.json`](../biome.json)                 | [Biome Rules](https://biomejs.dev/linter/)                |
| [`.github/workflows/`](../.github/workflows/) | [GitHub Actions Docs](https://docs.github.com/en/actions) |

### Operational Dashboards

| Dashboard                                                                   | Purpose                   |
| :-------------------------------------------------------------------------- | :------------------------ |
| [Netlify Dashboard](https://app.netlify.com/)                               | Logs, Deploys, Domains    |
| [GitHub Security Tab](https://github.com/team4procoaching/website/security) | Code Scanning, Dependabot |
| [Netlify Status](https://www.netlifystatus.com/)                            | Platform Status           |
| [GitHub Status](https://www.githubstatus.com/)                              | Platform Status           |

---

**Remember**: Most maintenance is automated. Your job is to monitor, review, and
handle exceptions. Trust the automation for routine tasks.
