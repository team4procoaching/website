# Local jscpd Duplication Gate as the Fourth Local-Prevention Layer

Date: 2026-05-05

## ADR Warrant Check

- [x] **A — Contract**: this ADR creates a contract that the local pre-push
      duplication gate runs at a fixed, deliberately-chosen threshold and scope.
      Any change to `.jscpd.json`'s `minTokens`, `mode`, or `formatsExts` is a
      change to the contract: it requires explicit owner sign-off and an
      ADR-0045 Status update. The contract is **about local
      threshold-stability**, not about parity with any other detector.
- [ ] **B — Asymmetry**: not invoked.
- [ ] **C — External revisit**: not invoked.

## Status

Accepted

## Context

[ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) established
SonarLint VS Code in Connected Mode as the primary local edit-time prevention
layer for SonarCloud findings.
[ADR-0042](0042-agent-side-sonarcloud-findings-query.md) added a scriptable
per-file lookup of existing SonarCloud findings via `pnpm check:sonar-findings`
(the third local-prevention layer, per its title and the ADR Quick Reference).
Both layers shift left from the SonarCloud PR-time gate, but neither covers
**duplication detection** — neither SonarLint nor the agent-side findings query
exposes `duplicated_blocks` / `duplicated_lines_density`.

SonarLint surfaces rule findings (code smells, bugs, vulnerabilities), not
duplications. The agent-side findings query reads `/api/issues/search`, which
does not include CPD blocks. The local prevention stack therefore had a
structural gap: every duplication cluster surfaced for the first time on the
SonarCloud PR analysis, several minutes after the commit reached GitHub.

This gap was operational, not theoretical. The SonarCloud-driven refactor that
merged as PR #196 ran four iterations of the SonarCloud branch quality gate; the
fourth iteration was triggered by duplication clusters the contributor could not
see locally — they only surfaced after push. A subsequent review of the same
branch identified a non-trivial backlog of pre-existing duplication clusters
that had been in the repo silently because no local detector saw them.

The decision this ADR closes: **what fills the local-prevention gap for
duplication detection?**

### Decision drivers

- **AI-first working mode.** The repo optimises for typed boundaries, low blast
  radius, and structural enforcement over per-contributor discipline. A pre-push
  gate is structural; "remember to look at SonarCloud after pushing" is
  discipline.
- **Independence is honest; mirror-claims are not.** Any local detector and
  SonarCloud's CPD use different tokenisers and different normalisation rules.
  Empirical file-level overlap on the project's current `main` is partial (2 of
  7 SonarCloud-flagged files appear in jscpd's strict-100 output; jscpd flags 11
  files SonarCloud does not). A claim of "the local gate mirrors SonarCloud"
  does not survive that data. The local gate is therefore framed as **an
  independent local layer at jscpd's own calibration**, not a SonarCloud
  predictor.
- **No paid SaaS, no new CI credit cost.** Per the
  [Operational Principles](../ARCHITECTURE.md#operational-principles)
  (Cost-Conscious). jscpd is OSS and runs locally.
- **Cross-platform, Windows-first.** The maintainer's primary platform is
  Windows without WSL. The chosen tool runs from PowerShell or cmd via `pnpm`.
  Husky 9 normalises hook execution across Windows, macOS, and Linux;
  `pnpm exec` resolves the local `node_modules/.bin/jscpd` identically on all
  three.
- **Bus factor.** The mechanism ships as a `pnpm` script, a configuration file
  at the repo root, and a documentation section in `docs/MAINTENANCE.md` —
  discoverable without tribal knowledge.

### Evaluated approaches

1. **Status quo plus discipline.** Continue trusting the SonarCloud PR-side gate
   as the only duplication detector. **Rejected:** every PR-time duplication
   finding triggers a fresh push round-trip; the AI-assisted working mode
   amplifies the cost.
2. **CI integration of jscpd as a hard gate.** Run jscpd in GitHub Actions
   alongside the existing quality and tests workflows. **Rejected:** SonarCloud
   already enforces duplication on the PR side; the local pre-push gate already
   catches the layer the developer can fix pre-push; adding a CI duplicate adds
   cost without new signal.
3. **Pre-commit hook running jscpd on staged files.** The earliest-possible
   feedback loop. **Rejected on two counts:** (a) jscpd cannot ride
   `lint-staged`'s file-list mechanism — it must scan a meaningful slice of the
   repository to detect cross-file duplication, and per-staged-file scanning
   misses the entire cross-file class. (b) The pre-existing-cluster inventory
   (13 clusters at activation) would retroactively block every commit that
   touches one of those files until the cluster is resolved. The owner's
   WIP-commit flow does not survive that level of friction.
4. **Pre-push hook running jscpd over a fixed scope, hard-fail on any
   threshold-meeting cluster. Chosen.** Pre-push delays feedback past the
   per-commit moment but lets WIP commits flow freely; the gate fires once
   before the bundle leaves the laptop. The threshold and scope are chosen at
   jscpd's own calibration. The hook ships as a `.husky/pre-push` file invoking
   a `pnpm check:duplication` script that runs the locally-installed
   devDependency `jscpd` against a `.jscpd.json` configuration at the repo root.

## Decision

A new pre-push Husky hook runs jscpd locally against a fixed, locally-chosen
configuration. The gate hard-fails on any cluster meeting the threshold,
mirroring how the existing pre-commit chain (`gitleaks`, `lint-staged`)
hard-fails. SonarCloud's PR-side duplication metric remains the authoritative
gate for the post-push side; the local hook is an **independent local layer with
a complementary signal**, not a SonarCloud predictor.

Load-bearing values fixed by this ADR:

- **Threshold:** `minTokens: 100`, `threshold: 0` (any cluster meeting
  `minTokens` fails the gate).
- **Mode:** `strict` (jscpd's stricter token comparison; produces 13 day-one
  clusters at a usable false-positive rate, vs. 1 cluster under `mild`).
- **Scope:** `src/` (TypeScript + Astro components) + `scripts/` (TypeScript +
  JavaScript build/CI tooling). Tests included; the day-one cluster inventory
  shows the test-file clusters are predominantly test-builder candidates —
  exactly the pattern the gate is meant to surface.
- **`formatsExts`:** TypeScript covers `ts` + `astro`; the explicit enumeration
  is required because jscpd's `formatsExts` overrides the defaults rather than
  merging.
- **Hook surface:** `.husky/pre-push`, single-line `pnpm check:duplication`,
  hard-fail on any cluster.
- **Bypass:** `git push --no-verify`, the intentional emergency escape hatch
  documented in `docs/MAINTENANCE.md`.
- **Composition with future pre-push entries:** Husky 9 runs each line
  sequentially and short-circuits on the first non-zero exit. A future addition
  appends a line; jscpd runs first as the cheap-fast detector.

### Threshold-stability contract

The `.jscpd.json` values (`minTokens: 100`, `mode: strict`, `formatsExts`
mapping) are **fixed by this ADR**. The contract a future contributor or
AI-assisted edit must honour:

- A change to `minTokens`, `mode`, or `formatsExts` requires explicit owner
  sign-off and an update to this ADR's Status (or a successor ADR). Threshold
  drift without ADR update is a contract breach.
- The contract is about **local stability**. There is no claim of parity with
  SonarCloud's CPD detector. Future Sonar JS/TS plugin upgrades on the
  SonarCloud side do not by themselves trigger a `.jscpd.json` change.
- The complementary post-push surface — extending `pnpm check:sonar-findings`
  with a duplications metric — is the structurally-aligned mechanism for
  catching SonarCloud-flagged duplications the local gate misses by design. That
  work is tracked as a separate follow-up; it would extend ADR-0042, not this
  ADR.

### What does NOT change

- ADR-0041's prevention model is **extended**, not revised. SonarLint Connected
  Mode (edit-time, VS Code), the agent-side findings query (the third
  local-prevention layer per ADR-0042), and the Biome rule-baseline canary all
  remain. **This ADR adds pre-push duplication as the fourth local-prevention
  layer.**
- The existing `pnpm check` chain (`typecheck` → `lint` → `format:check` →
  `check:conventions`) is unchanged. `pnpm check:duplication` is a sibling, not
  a chain extension, mirroring how `check:sonar-findings` and
  `check:biome-rules` are arranged.
- The pre-commit hook (`gitleaks`, `lint-staged`) is unchanged. The CI quality
  and tests workflows are unchanged.
- No Astro source code is touched. The `formatsExts` mapping affects how jscpd
  tokenizes `.astro` files at scan time, not how Astro builds them.
- No new ADR-0036 slot work, no `routes.ts` edits, no Critical-Rules surface.

### Out of scope

- Cleanup of the pre-existing duplication clusters surfaced when the gate
  activates. Each cluster becomes a separate follow-up, dispositioned by
  category (`real duplication`, `test-builder candidate`, `fixture pattern`,
  `astro-template`, `domain-data`).
- Adding duplication metrics to `pnpm check:sonar-findings` — a separate
  follow-up that extends ADR-0042.
- A CI-side jscpd run. SonarCloud already enforces duplication PR-side.
- Native `.astro` script-block parsing. jscpd treats the whole file as a
  TypeScript token stream; SonarCloud has an `.astro` blindspot (its
  `component_tree` contains zero `.astro` files), so the local gate is the only
  layer the project has that sees `.astro` duplication. One day-one cluster is
  HTML-template duplication (SuccessStoryGridCard ↔ SuccessStoryOverviewCard,
  lines 75-89 / 82-96); the conventional resolution is partial extraction, not
  threshold tuning.

## Consequences

### Positive

- **The duplication gap closes for the local pre-push surface.** Clusters jscpd
  flags at the configured threshold are visible locally before the commit
  reaches GitHub.
- **`.astro` duplication is detectable for the first time.** SonarCloud's CPD
  has an `.astro` blindspot; the local gate is the only layer that sees it.
- **Same configuration source for every contributor.** `.jscpd.json` is one file
  at the repo root, editable in isolation, tracked by Renovate via the
  `devDependencies` entry, and bus-factor-readable.
- **No new infrastructure cost.** jscpd is OSS, the hook runs locally, no CI
  credit cost, no paid SaaS.
- **Predictable timing.** Empirical extrapolation produces ~1.5–2.5 s per push
  for the chosen scope (167 files); actual `pnpm exec jscpd` cold/warm timing is
  measured during the introductory PR and recorded in its body. The 5-second
  budget holds.
- **Composable with future pre-push entries.** Husky 9's sequential-line
  semantics let future streams append a `pnpm test:run` or similar without this
  ADR being revisited.

### Negative

- **First push after the hook lands hard-fails.** The 13-cluster day-one
  inventory means the introductory PR's first push would fail. Mitigation:
  `git push --no-verify -u origin HEAD` once, with the cluster list and
  disposition table in the PR body. Subsequent pushes against unchanged files
  are clean; new clusters are blocked.
- **The local gate is independent of SonarCloud, not a predictor.** Some
  SonarCloud-flagged duplications (file-level overlap is partial: 2 of 7 on the
  current `main`) will still surface for the first time on the SonarCloud PR
  scan. The future `pnpm check:sonar-findings` duplications-metric extension is
  the structural mechanism for catching those; it is not part of this ADR's
  contract.
- **`.astro` files are tokenized whole.** HTML markup, frontmatter, and module
  scripts share the same TS token stream. Pure HTML-template clusters can
  register at min-tokens 100 (one of the 13 day-one clusters is exactly that).
  The operator sees the file pair and the cluster boundaries in the failure
  output; resolving via component extraction or accepting the asymmetry are both
  proportional responses.
- **`git push --no-verify` is a real bypass.** Intentional, documented in
  `docs/MAINTENANCE.md`. SonarCloud catches bypassed duplications post-push.

### Risk mitigation

- **Pre-existing-cluster activation moment.** The introductory PR's body
  enumerates all 13 clusters with their per-cluster disposition, names the
  `--no-verify` bypass for the introductory push, and points at the follow-up
  cleanup work.
- **Threshold drift.** The threshold-stability contract above. The future
  `pnpm check:sonar-findings` duplications-metric extension provides the
  post-push structural signal for cases where the local calibration misses
  something the PR-side detector catches.
- **Renovate-rebase friction on jscpd major bumps.** jscpd's major-version
  history shows breaking config-shape changes (e.g., 3.x → 4.x). The commit plan
  separates the dependency-pin commit from the configuration commit, so a
  major-version Renovate PR only needs to re-validate `.jscpd.json` against the
  new schema, not re-author the hook.

## Success criteria

- After this ADR's PR merges, `git push` from any feature branch runs
  `pnpm check:duplication` and either passes (no clusters meeting the threshold)
  or hard-fails with a list of file pairs.
- A future contributor changing `.jscpd.json`'s `minTokens`, `mode`, or
  `formatsExts` map without updating this ADR's Status (or producing a successor
  ADR) trips the threshold-stability contract; the change is either reverted or
  this ADR is updated in the same PR.

## Documentation Updates

This ADR requires the following updates in the same set of commits as the ADR
itself:

- `docs/ARCHITECTURE.md#adr-quick-reference` — append the row for ADR-0045.
- `docs/ARCHITECTURE.md#code-quality` — append a `jscpd` entry to the Code
  Quality tools table.
- `docs/MAINTENANCE.md#automated-quality-checks` — add a "Local Duplication
  Gate" subsection naming the hook, the configuration source, the local
  threshold (100, jscpd's own calibration), the `--no-verify` bypass, the
  one-time `--no-verify` activation push, and the threshold-stability contract.

`docs/CONVENTIONS.md`, `CLAUDE.md` Conventions Quick Reference, and
`docs/AGENTS.md` are intentionally **not** updated. The decision is a push-time
gate, not a coding pattern contributors apply at edit time.

## References

- [ADR-0006](0006-enforce-strict-environment-and-dependency-pinning.md) —
  exact-version pinning for `devDependencies`; the rationale for jscpd shipping
  as a `devDependency` rather than via `pnpm dlx`.
- [ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) — SonarLint
  Connected Mode as the primary edit-time prevention layer. The
  `pnpm check`-chain commit-plan policy (no chain extension; sibling script)
  originated there.
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) — agent-side
  SonarCloud findings query, the third local-prevention layer. The future
  duplications-metric extension to `pnpm check:sonar-findings` (post-push parity
  coverage) extends ADR-0042, not this ADR.
- [SonarCloud — Duplication settings](https://docs.sonarsource.com/sonarcloud/digging-deeper/managing-duplications/)
  — context for SonarCloud's CPD behaviour. The current project state
  (`/api/measures/component` returns `duplicated_blocks: 25`,
  `duplicated_files: 7`) is documented as background, not as a calibration
  anchor for the local gate's threshold.
- [jscpd — README](https://github.com/kucherenko/jscpd) — the tool's documented
  CLI, configuration shape, and language-format list. The `formatsExts`
  override-not-merge behaviour that drove the explicit extension enumeration is
  documented in the `jscpd-config` package source.
- [Husky 9 — pre-push](https://typicode.github.io/husky/) — the hook surface
  used.
