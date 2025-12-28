# Renovate Configuration & Workflow

Detailed documentation for the Renovate Bot configuration
[`renovate.json`](../../renovate.json) and our automated dependency management
strategy.

## 📋 Table of Contents

- [Overview](#-overview)
- [Strict Pinning Strategy](#-strict-pinning-strategy)
- [Base Configuration](#️-base-configuration)
- [Scheduling & Rate Limiting](#-scheduling--rate-limiting)
- [Pull Request Strategy](#-pull-request-strategy)
- [Update Strategy & Package Rules](#-update-strategy--package-rules)
- [Security Workflow](#️-security-workflow)
- [Pull Request Lifecycle](#-pull-request-lifecycle)
- [Maintenance & Validation](#️-maintenance--validation)
- [Related Documentation](#-related-documentation)

---

## 🎯 Overview

[Renovate](https://docs.renovatebot.com/) is our automated dependency manager.
It monitors our dependencies and creates pull requests for updates based on
strict schedules and rules.

We rely on Renovate to enforce the **Immutable Artifacts** principle as defined
in:

- [ADR 0005](../adr/0005-adopt-renovate-for-automated-dependency-management.md)
- [ADR 0006](../adr/0006-enforce-strict-environment-and-dependency-pinning.md)

By working in tandem with `pnpm` and strict engine settings, it ensures our
environments remain deterministic.

**Key Benefits:**

- Automated dependency updates
- Configurable auto-merge strategies
- Security vulnerability tracking
- Supply chain security (via Socket.dev integration)
- Minimal manual intervention

---

## 📌 Strict Pinning Strategy

Our project enforces **Exact Version Pinning** as defined in
[ADR 0006](../adr/0006-enforce-strict-environment-and-dependency-pinning.md).
This strategy ensures mathematically deterministic builds across all
environments, treating dependencies with the same rigor as compiled code.

This strategy is configured in two places to ensure consistency between manual
installs and automated updates:

1. **Local Development**: `.npmrc` sets `save-exact=true`
2. **Automation**: `renovate.json` sets `rangeStrategy: "pin"`

| Strategy            | `package.json` Entry | Behavior                                                                      |
| :------------------ | :------------------- | :---------------------------------------------------------------------------- |
| **Pin (Ours)**      | `"astro": "5.16.6"`  | **Exact.** Identical `node_modules` everywhere. Required for `engine-strict`. |
| Bump                | `"astro": "^5.16.6"` | **Range preserved.** Updates version but keeps `^` prefix.                    |
| Caret (Default npm) | `"astro": "^5.16.6"` | **Floating.** Allows minor updates. Can lead to "works on my machine".        |
| Tilde               | `"astro": "~5.16.6"` | **Floating.** Allows patch updates.                                           |

**Why Pin?**

- **Determinism**: `pnpm-lock.yaml` is the single source of truth
- **Java/Go-like Stability**: Brings the predictability of compiled language
  build systems to JavaScript
- **Safety**: Updates only happen via PRs, which run our full CI suite
  (`pnpm run check`)
- **Transparency**: You can see exactly which version is running by looking at
  `package.json`
- **No surprises** from transitive dependency updates
- **Required for `engine-strict`**: Ensures identical environments across local
  development and Netlify

**Renovate Behavior:**

```json
// Before update (with caret from manual install without save-exact)
"astro": "^5.16.5"

// After update (NO caret prefix - exact version)
"astro": "5.16.6"
```

---

## ⚙️ Base Configuration

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests"],
  "timezone": "Europe/Berlin"
}
```

### Extends

**`config:recommended`**

- Renovate's opinionated best practices
- Includes sensible defaults for most projects
- Handles common dependency types (npm, Docker, GitHub Actions, etc.)
- [Full preset documentation](https://docs.renovatebot.com/presets-config/#configrecommended)

**`helpers:pinGitHubActionDigests`**

- Pins GitHub Actions to SHA digests for security
- Example: `actions/checkout@v4` → `actions/checkout@abc123...`
- Prevents supply chain attacks via tag manipulation

### Timezone

**`"Europe/Berlin"`**

- All schedules use Berlin timezone (CET/CEST)
- Aligns update schedules with the team's working hours
- Schedule times are local time

---

## ⏰ Scheduling & Rate Limiting

```json
{
  "schedule": ["before 4am on Monday"],
  "prConcurrentLimit": 5,
  "prHourlyLimit": 0,
  "minimumReleaseAge": "3 days"
}
```

### Schedule

**`"before 4am on Monday"`**

All automated updates run Monday mornings before European work hours start. This
timing allows issues to be caught early in the week.

**Why Monday morning?**

- Fresh week start - time to review and address issues
- Avoids Friday deployments (risky)
- Aligns with weekly planning cycles

### Rate Limiting

| Setting             | Value | Purpose                                                   |
| :------------------ | :---- | :-------------------------------------------------------- |
| `prConcurrentLimit` | `5`   | Prevents "PR fatigue" by limiting noise in the repository |
| `prHourlyLimit`     | `0`   | No hourly limit (batch updates)                           |

**Strategy**: Create multiple PRs at once (up to 5), but don't spam throughout
the day.

### Minimum Release Age

**`"3 days"`**

**Safety Buffer.** Wait 3 days after a package release before updating. This
allows time for the community to find critical bugs or malicious "day-zero"
releases, reducing the risk of adopting broken releases.

**Exceptions**: Security updates bypass this (reduced to 1 day - see
[Security Workflow](#️-security-workflow))

---

## 🔀 Pull Request Strategy

```json
{
  "prCreation": "not-pending",
  "prNotPendingHours": 3,
  "assignees": ["andregmoeller"],
  "semanticCommits": "enabled",
  "commitMessagePrefix": "chore(deps):",
  "platformAutomerge": true,
  "rangeStrategy": "pin",
  "dependencyDashboard": true,
  "dependencyDashboardTitle": "🔄 Dependency Updates Dashboard"
}
```

### PR Creation

| Setting             | Value           | Purpose                                 |
| :------------------ | :-------------- | :-------------------------------------- |
| `prCreation`        | `"not-pending"` | Only create PR after status checks pass |
| `prNotPendingHours` | `3`             | Wait 3 hours before creating PR         |

**Why wait 3 hours?**

Allows Renovate to batch related updates. For example, if React and React-DOM
update together, create one grouped PR instead of two separate PRs. This reduces
notification noise.

### Assignee & Commits

| Setting               | Value               | Purpose                         |
| :-------------------- | :------------------ | :------------------------------ |
| `assignees`           | `["andregmoeller"]` | Auto-assign PRs to maintainer   |
| `semanticCommits`     | `"enabled"`         | Use Conventional Commits format |
| `commitMessagePrefix` | `"chore(deps):"`    | All commits start with this     |

**Commit Format:**

```
chore(deps): update astro to v5.16.6
chore(deps): update dependency @biomejs/biome to v2.3.10
```

### Automerge Strategy

| Setting             | Value   | Purpose                                                  |
| :------------------ | :------ | :------------------------------------------------------- |
| `platformAutomerge` | `true`  | Use GitHub's automerge feature                           |
| `rangeStrategy`     | `"pin"` | Pin dependencies to exact versions (removes `^` and `~`) |

**How automerge works:**

1. Renovate creates PR
2. CI runs (Socket.dev, Semgrep, GitGuardian)
3. ✅ If all checks pass → GitHub auto-merges
4. ❌ If checks fail → PR stays open for manual review

**Safety guarantee:**

PRs are only created after status checks pass (`prCreation: "not-pending"`). If
any security scan fails, automerge is automatically disabled.

### Dependency Dashboard

**`"🔄 Dependency Updates Dashboard"`**

Renovate maintains a pinned Issue with this title.

**View:**

- Pending updates
- Ignored packages
- Rate-limited updates
- Errors

**Action:**

- Check dashboard weekly for update status
- Tick a checkbox in the issue to force a retry or trigger a manual run
- See why updates are pending/blocked

---

## 🚦 Update Strategy & Package Rules

We apply different rules based on the package type and risk level. Renovate
groups and handles different package types differently:

| Category           | Packages                     | Strategy   | Auto-Merge? | Rationale                                            |
| :----------------- | :--------------------------- | :--------- | :---------- | :--------------------------------------------------- |
| **Minor/Patch**    | Most dependencies            | `batch`    | **Yes** ✅  | Low risk. Merged automatically if CI passes.         |
| **Framework**      | `astro`, `@astrojs/*`        | `group`    | **No** ❌   | High risk. Requires manual testing of build/preview. |
| **Code Quality**   | `biome`, `prettier`, `husky` | `group`    | **Yes** ✅  | Dev-only tools. Very low risk of breaking prod.      |
| **GitHub Actions** | `actions/*`                  | `group`    | **No** ❌   | **Security Risk.** Must verify source integrity.     |
| **Major Updates**  | All                          | `separate` | **No** ❌   | Breaking changes expected. Dedicated PR per dep.     |
| **Node.js**        | `.nvmrc`                     | `single`   | **No** ❌   | Runtime change. Monthly updates. Medium priority.    |
| **pnpm**           | `packageManager` field       | `single`   | **No** ❌   | Runtime change. Monthly updates. Medium priority.    |

### 1. Minor/Patch Updates (Auto-merge)

```json
{
  "matchUpdateTypes": ["minor", "patch"],
  "automerge": true,
  "automergeType": "pr",
  "automergeStrategy": "squash"
}
```

**Applies to:** All patch and minor updates

**Behavior:**

- ✅ Auto-merge if CI passes
- Uses "squash and merge" (clean history)
- 3-day minimum release age

**Example:**

- `astro: 5.16.5 → 5.16.6` (patch) ✅ Auto-merge
- `astro: 5.16.0 → 5.17.0` (minor) ✅ Auto-merge

### 2. Astro Framework (Manual Review)

```json
{
  "matchPackageNames": ["astro", "prettier-plugin-astro"],
  "matchPackagePatterns": ["^@astrojs/"],
  "groupName": "Astro Framework",
  "automerge": false
}
```

**Applies to:**

- `astro`
- `prettier-plugin-astro`
- All `@astrojs/*` packages

**Behavior:**

- Groups all Astro updates into one PR
- ❌ Never auto-merge (manual review required)
- Framework updates need testing

**Why manual review?**

- Framework updates can have breaking changes
- May require code changes
- Need to test build and deployment

### 3. Code Quality Tools (Auto-merge)

```json
{
  "matchPackageNames": [
    "@biomejs/biome",
    "prettier",
    "husky",
    "lint-staged",
    "@commitlint/cli",
    "@commitlint/config-conventional"
  ],
  "groupName": "Code Quality Tools",
  "automerge": true
}
```

**Applies to:** Development tools (formatters, linters, Git hooks)

**Behavior:**

- Groups all quality tools into one PR
- ✅ Auto-merge if CI passes
- Low risk (dev dependencies)

**Rationale:** These tools rarely break builds, safe to auto-update.

### 4. GitHub Actions (Manual Review)

```json
{
  "matchManagers": ["github-actions"],
  "groupName": "GitHub Actions",
  "automerge": false
}
```

| Setting         | Value                | Purpose                        |
| :-------------- | :------------------- | :----------------------------- |
| `matchManagers` | `["github-actions"]` | Applies to all GitHub Actions  |
| `groupName`     | `"GitHub Actions"`   | Groups all updates into one PR |
| `automerge`     | `false`              | ❌ Never auto-merge            |

**Behavior:**

- Updates SHA digests/pins for all GitHub Actions
- Groups all action updates into a single PR
- **Requires manual review and approval**

**Why manual review?**

High supply chain security risk:

- GitHub Actions run with **full repository permissions**
- Actions have access to **repository secrets** (deployment keys, tokens)
- Compromised actions can exfiltrate sensitive data
- Must verify the source and changes before approval

**Verification process:**

1. Review changelog and release notes
2. Verify action source repository integrity
3. Check for unexpected permission changes
4. Approve only after manual inspection

### 5. Major Updates (Manual Review)

```json
{
  "matchUpdateTypes": ["major"],
  "groupName": null,
  "automerge": false,
  "schedule": ["before 4am on Monday"]
}
```

**Applies to:** All major version updates

**Behavior:**

- Each major update gets its own PR (not grouped)
- ❌ Never auto-merge
- Scheduled for Monday mornings

**Why individual PRs?**

- Major updates can have breaking changes
- Need to review changelog individually
- May require code changes

**Example:**

- `astro: 5.16.0 → 6.0.0` (major) → Separate PR, manual review

### 6. Node.js Runtime Updates (Manual Review)

```json
{
  "matchManagers": ["nvm"],
  "matchPackageNames": ["node"],
  "groupName": "Node.js",
  "automerge": false,
  "schedule": ["before 4am on the first day of the month"],
  "prPriority": 5,
  "labels": ["runtime"]
}
```

**Applies to:** Node.js version in `.nvmrc`

**Behavior:**

- Updates once per month (first Monday)
- ❌ Never auto-merge
- Labeled with `runtime` for visibility
- Medium priority (5)

**Why monthly + manual review?**

- Runtime changes can have subtle breaking effects
- Need to test entire application after Node.js updates
- Monthly cadence balances stability with staying current

### 7. pnpm Package Manager Updates (Manual Review)

```json
{
  "matchManagers": ["npm"],
  "matchDepTypes": ["packageManager"],
  "matchPackageNames": ["pnpm"],
  "automerge": false,
  "schedule": ["before 4am on the first day of the month"],
  "prPriority": 5,
  "labels": ["runtime"]
}
```

**Applies to:** pnpm version in `package.json` `packageManager` field

**Behavior:**

- Updates once per month (first Monday)
- ❌ Never auto-merge
- Labeled with `runtime` for visibility
- Medium priority (5)

**Why monthly + manual review?**

- Package manager updates can affect lock file behavior
- Need to verify compatibility with existing workflows
- Monthly cadence prevents frequent churn

---

## 🛡️ Security Workflow

Security vulnerabilities are treated as **Critical Emergencies**. They bypass
standard schedules and stability buffers.

```json
{
  "matchDatasources": ["npm"],
  "matchDepTypes": ["dependencies"],
  "matchUpdateTypes": ["patch", "minor", "major"],
  "prPriority": 10,
  "labels": ["security", "critical"],
  "schedule": ["at any time"],
  "minimumReleaseAge": "1 day",
  "prCreation": "immediate",
  "automerge": false,
  "commitMessagePrefix": "fix(deps):"
}
```

### The "Emergency Lane" Protocol

| Setting               | Value                      | Purpose                                      |
| :-------------------- | :------------------------- | :------------------------------------------- |
| `matchDatasources`    | `["npm"]`                  | Applies to npm packages only                 |
| `matchDepTypes`       | `["dependencies"]`         | Production dependencies (not devDeps)        |
| `prPriority`          | `10`                       | Highest priority (processed first)           |
| `labels`              | `["security", "critical"]` | Visual alarm - clear indicators              |
| `schedule`            | `["at any time"]`          | Ignores the "Monday morning" rule            |
| `minimumReleaseAge`   | `"1 day"`                  | Fast track - reduced stability buffer        |
| `prCreation`          | `"immediate"`              | Creates PR without waiting                   |
| `automerge`           | `false`                    | ❌ Manual gate - requires human verification |
| `commitMessagePrefix` | `"fix(deps):"`             | Semantic commit type for security fixes      |

**Critical vulnerabilities bypass standard rules:**

1. **Immediate Trigger**: Ignores the Monday schedule
2. **Fast Track**: Reduced stability buffer (1 day vs 3 days)
3. **Visual Alarm**: Labeled with `security` and `critical`
4. **Manual Gate**: **Never** auto-merged - requires human verification

**Why no automerge?**

Security fixes require human verification:

- May introduce breaking changes or side effects
- Need to verify the fix doesn't break functionality
- Socket.dev scans for supply chain security issues
- Must ensure the "fix" isn't a malicious package takeover

**Workflow:**

1. **Vulnerability detected** → Immediate PR creation
2. **Socket.dev** scans for supply chain security issues
3. **CI pipeline** runs full test suite (`pnpm run check`)
4. **Manual review** of changes and release notes
5. **Approve and merge** after verification

**Commit Format:**

Security fixes use `fix(deps):` instead of `chore(deps):`:

```
fix(deps): update astro to v5.16.7 [SECURITY]
fix(deps): update dependency express to v4.18.3 [CVE-2024-XXXXX]
```

### Vulnerability Alerts

```json
{
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"],
    "assignees": ["andregmoeller"]
  }
}
```

**What happens:**

1. GitHub Security Advisory detects vulnerability
2. Renovate creates high-priority PR
3. PR auto-assigned to maintainer
4. Labeled "security" for visibility

### Lock File Maintenance

```json
{
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 4am on Monday"]
  }
}
```

**What it does:**

- Updates `pnpm-lock.yaml` even when `package.json` doesn't change
- Catches transitive dependency updates
- Resolves version conflicts

**When:** Monday mornings (same as other updates)

---

## 🔄 Pull Request Lifecycle

### 1. Creation

Renovate creates a PR only after:

- The `minimumReleaseAge` (3 days) has passed
- Build checks pass (status: `not-pending`)
- It respects the limit of 5 concurrent PRs

### 2. Validation (CI)

Every PR triggers our `check` script defined in `package.json`:

```bash
pnpm run check
# Executes: typecheck && lint && format:check
```

Additionally, external security tools run:

- **Socket.dev** - Supply chain security check (scans dependencies for malicious
  code)
- **Semgrep** - Security scan (analyzes your code for vulnerabilities)
- **GitGuardian** - Secret detection (prevents accidental credential commits)

### 3. Auto-Merging

If `automerge: true` is set for the group **AND** all CI checks pass, the
platform automatically squashes and merges the PR.

> **Note:** If _any_ check fails (e.g., Biome linting fails), the PR remains
> open for manual intervention.

### Weekly Update Flow

**Monday, 04:00 Berlin time:**

1. **Renovate scans for updates**
   - Checks all dependencies
   - Respects minimum release age (3 days)
   - Groups updates per package rules

2. **Creates PRs** (up to 5 concurrent)
   - "Code Quality Tools" (grouped)
   - "Astro Framework" (grouped)
   - "GitHub Actions" (grouped)
   - Individual major updates
   - Lock file maintenance
   - Node.js/pnpm updates (monthly, on first Monday)

3. **CI runs on each PR**
   - Socket.dev supply chain check
   - Semgrep security scan
   - GitGuardian secret detection
   - Link checking

4. **Automerge happens** (if configured)
   - Minor/Patch updates auto-merge if CI passes
   - Code Quality Tools auto-merge if CI passes
   - Others require manual review

### Manual Intervention Needed

**When to manually merge:**

- Astro Framework updates
- GitHub Actions updates
- Major version updates
- Node.js runtime updates
- pnpm package manager updates
- Security patches
- Any PR that fails CI

**Where to check:**

- Dependency Dashboard (GitHub Issues)
- Pull Requests tab
- Email notifications (if enabled)

---

## 🛠️ Maintenance & Validation

### Validate Configuration

We have a dedicated script to ensure `renovate.json` is valid before pushing
changes.

```bash
# Validate renovate.json locally
pnpm validate:renovate
```

_Runs `renovate-config-validator` via `pnpm dlx`._

**Run this after editing** `renovate.json` to catch syntax errors.

### Force Renovate Run

**Via Dependency Dashboard:**

1. Go to Issues → "🔄 Dependency Updates Dashboard"
2. Check "Check this box to trigger a request for Renovate to run"
3. Renovate runs within minutes

**Via GitHub Actions:**

- Renovate can be triggered via workflow_dispatch (if configured)

### Debug Renovate

**Check Renovate logs:**

1. Go to Dependency Dashboard issue
2. Scroll to bottom for recent activity
3. Look for errors or warnings

**Common issues:**

- Rate limit hit (GitHub API)
- Invalid configuration (check `pnpm validate:renovate`)
- Package not found (typo in package name)

---

## 📚 Related Documentation

- [ADR 0005: Adopt Renovate for Automated Dependency Management](../adr/0005-adopt-renovate-for-automated-dependency-management.md)
- [ADR 0006: Enforce Strict Environment and Dependency Pinning](../adr/0006-enforce-strict-environment-and-dependency-pinning.md)
- [Renovate Official Docs](https://docs.renovatebot.com/)
- [Biome Configuration & Workflow](biome.md)
