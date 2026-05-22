---
name: local-tooling-probes
description: Use when validating a tooling claim — jscpd threshold sweeps, format-mapping behaviour, performance measurement, config-schema probing. Triggers on any probe that would otherwise reach for `pnpm dlx <tool>`, and on the decision of whether a missing tool should become a devDependency.
---

# Local Tooling Probes

## Overview

When the Architect or Reviewer needs to validate tooling claims (jscpd threshold
sweeps, format-mapping behaviour, performance measurement, config schema
probing), the validation is executed against **the locally pinned version of the
tool**, not against `pnpm dlx <tool>@<version>`.

**Core principle:** probe with the exact version the CI/hook layer enforces, so
the probe's findings reflect what the gate actually does.

## When to Use

Apply this discipline whenever you are about to run a tool to validate a claim,
and especially when any of these are true:

- The probe is a jscpd threshold sweep, a format-mapping check, a performance
  measurement, or a config-schema probe.
- You are tempted to reach for `pnpm dlx <tool>@<version>`.
- The probe's result will inform a concept document or a review finding.
- A tool the probe needs is not yet pinned in `package.json`.

## Why the Pinned Version

1. **Identical version to the CI/hook layer.** When jscpd runs in the pre-push
   hook with the version pinned in `package.json`, an Architect probe with
   `pnpm dlx jscpd@<other-version>` may produce different findings (different
   default thresholds, format detection, output schema). The PR then merges
   based on probings that don't reflect what the gate actually enforces. Using
   the pinned version eliminates the gap.
2. **No permission prompt for the run itself.** `pnpm dlx <tool>` is on the
   `ask` list because it fetches and executes external code at runtime. The
   pinned dev-dependency is already trusted (it ships in `package.json` and
   `pnpm-lock.yaml`); running it does not warrant the same gate.
3. **Reproducibility.** A future maintainer reading the concept document can
   re-run the exact probe by reading `package.json` for the version, without
   having to dig through Architect-historical pin choices.

## Preferred Forms, In Order

1. **An existing `package.json` script.** For jscpd: `pnpm check:duplication`
   (or `pnpm --dir <worktree> check:duplication` from main-CWD). For typecheck:
   `pnpm typecheck`. For tests: `pnpm test:run`. The script name carries the
   project's intent — that is what should be probed. If the script does not
   accept the parameters needed for the probe (custom config path, custom
   min-tokens), proceed to form 2.
2. **Direct invocation of the locally-installed binary** for parameter sweeps
   not expressible through the project script. The path is
   `node ./node_modules/.pnpm/<package>@<version>/node_modules/<package>/bin/<bin>`
   when running from the worktree root, or `node ./<worktree>/node_modules/...`
   from main-CWD. This bypasses `pnpm dlx` and does not prompt.
3. **`pnpm dlx <tool>@<version>` is a last resort** for tools that are genuinely
   not pinned in `package.json` and where adding them as a devDependency is out
   of scope for the current task. When the Architect uses this form, that fact
   is recorded in the concept document under Open Assumptions, because it is a
   probe against a different version surface than the future pre-push hook.

## Missing Tools Become Findings

When the Architect determines that a tool _should_ be a devDependency and isn't
yet (e.g., a missing performance-measurement tool like `hyperfine`), that is
recorded as a finding for the Implementer to add. The Architect does not
silently work around the missing pin.

## Why This Matters

The deliberate `pnpm dlx *` Ask-gate and the rationale for keeping it despite
the convention above are documented in
[`docs/reference/claude-permissions.md`](../../../docs/reference/claude-permissions.md)
§ Ask-List Rationale.
