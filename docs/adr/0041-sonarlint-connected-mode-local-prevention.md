# SonarLint VS Code Connected Mode as Local Prevention; Biome Rule Registry Insufficient to Mirror SonarCloud Sonar JS/TS Plugin

Date: 2026-05-01

## Status

Accepted

## Context

SonarCloud Automatic Analysis (configured at the SonarCloud-organisation level
against this repository) surfaces JS/TS code smells, bugs, and vulnerabilities
under the Sonar way default quality profile. The findings appear after a pull
request is opened, several minutes after the developer's edit-time feedback loop
has closed. A SonarCloud-only enforcement model has three operational
consequences:

1. Reviewers and the project owner inherit the cost of pushing back on findings
   that a local linter could have flagged before the commit.
2. The maintainer-discipline rule "no new Sonar findings; reduce the existing
   backlog" carries no structural guard. There is nothing that fails fast when a
   developer (human or AI-assisted) reintroduces a fixed pattern in the same
   edit cycle.
3. The repository carries an open snapshot of approximately 98 SonarCloud
   findings spread across about 13 distinct rules (captured in
   `sonar-issues.csv`, untracked, snapshot date 2026-05-01). Some of those rules
   look superficially as if Biome — the project's pinned local linter at version
   2.3.10 — should be able to enforce them. An empirical probe of each candidate
   (recorded below) shows the overlap is far smaller than the names suggest.

The task this ADR closes is the question of **what fills the local-prevention
gap**. Two enforcement layers are available without paid SaaS or new CI
services:

- **Biome rule activations.** Biome is already wired into `pnpm lint`, the
  pre-commit `lint-staged` hook, and the CI `quality.yml` workflow. Adding rules
  is one config edit per rule.
- **SonarLint VS Code in Connected Mode** against the existing SonarCloud
  project. Free extension. Real-time editor feedback. Connected Mode shares the
  SonarCloud project's quality profile, so the rules SonarLint enforces locally
  match the rules SonarCloud enforces on the PR.

The first instinct is to activate Biome rules wherever the rule name on
biomejs.dev resembles a Sonar rule, and rely on SonarLint for the residual set.
The empirical evidence below shows this is the wrong shape: at the pinned Biome
2.3.10, the rule registry **does not** mirror SonarCloud's Sonar JS/TS plugin
closely enough for Biome to be the structural prevention layer.

### Decision drivers

- **Bus factor.** A future maintainer must inherit a structurally enforced
  ruleset, not a memorised list of "things SonarCloud will complain about".
- **Cost-conscious.** Biome is already in the toolchain; SonarLint is a free VS
  Code extension. No paid SaaS, no new CI services.
- **Cross-platform.** The local prevention layer must work on Linux, Windows,
  and macOS without per-developer installation friction.
- **Empirical rule mapping.** The published Biome rule list at biomejs.dev
  reflects the current development branch, not the pinned 2.3.10 release.
  Mappings must be verified against the installed binary, not the documentation.
- **No silent debt creation.** Activating a Biome rule that surfaces findings
  outside the existing CSV ships baseline `biome-ignore` suppressions on day
  one. Every suppression is a deferred finding; this ADR refuses to introduce
  them as a side-effect of "structural prevention".
- **Filename-headline alignment.** ADR slugs in this repository follow the
  headline conclusion. The headline conclusion here is SonarLint adoption as the
  primary local-prevention layer; the Biome-mirroring evidence is the supporting
  case. The slug aligns with the headline rather than with the supporting case.

### Evaluated approaches

1. **SonarCloud-only enforcement (status quo).** Keep the disciplinary rule;
   accept the PR-time feedback delay. Rejected: leaves the prevention layer one
   human checkpoint deep, and the AI-assisted working mode amplifies the
   review-time cost.
2. **Adopt SonarLint as the only local linter.** Replace Biome with SonarLint
   CLI in pre-commit. Rejected: SonarLint has no headless CLI suited to a
   pre-commit hook on three operating systems, and it would duplicate Biome's
   formatter and other coverage. Biome is already wired into `lint-staged` and
   `quality.yml`.
3. **Mirror SonarCloud findings into Biome rule activations and rely on
   SonarLint only for what Biome cannot express.** This was the initial plan.
   Rejected after empirical probing: at Biome 2.3.10 the candidate rules either
   do not exist, do not fire on the actual CSV target shapes, or carry autofixes
   that break typecheck. Activating any of them today ships either no detection
   value or new debt as `biome-ignore` suppressions. The plan is not
   categorically wrong — it is wrong at the pinned version and wrong with the
   autofix tactic.
4. **SonarLint VS Code Connected Mode as the primary local-prevention layer;
   per-change Biome rule activations for the rare rules that match cleanly.
   Chosen.** SonarLint runs the Sonar JS/TS plugin inside the editor against the
   SonarCloud project's quality profile, giving real-time warnings on every
   Sonar rule SonarCloud already enforces — including the ones with no Biome
   counterpart. Biome remains the formatting and core- linting tool; rule
   activations that mirror Sonar findings happen in the work that _also_ removes
   the matching CSV row, so each activation lands without baseline suppressions.

## Decision

SonarLint VS Code in Connected Mode against the existing SonarCloud project is
the project's primary local edit-time prevention layer for SonarCloud findings.
Biome remains the formatting and core-linting tool. New Biome rule activations
that mirror SonarCloud findings are evaluated **per change** — specifically, in
the same code-change that also clears the matching CSV row. This couples
activation to detection in a way that ships zero baseline `biome-ignore`
suppressions.

The repository ships three artefacts to make Connected Mode discoverable and
reproducible:

- `.vscode/extensions.json` recommends `SonarSource.sonarlint-vscode`.
- `.sonarlint/connectedMode.json` carries the SonarCloud-binding metadata
  (organisation key, project key, server URL). The file is generated by the
  SonarLint VS Code command palette ("SonarLint: Share Connected Mode
  Configuration") and committed verbatim. Hand-editing is prohibited; the schema
  is owned by the IDE.
- `.gitignore` ignores `.sonarlint/*` except `connectedMode.json`, so the
  binding artefact ships while per-developer caches and logs stay local.

Per-developer setup is documented in `docs/DEVELOPMENT.md` § SonarLint Connected
Mode. Token handling is per-developer SecretStorage; the token never lands in
any repo file.

The local-prevention model this ADR establishes is extended by
[ADR-0042](0042-agent-side-sonarcloud-findings-query.md), which adds a
scriptable per-file findings lookup against SonarCloud's REST API for the
automated-contributor working mode where SonarLint Connected Mode does not run.
ADR-0042 layers on top of this ADR's prevention model without revising any of
the decisions captured below; the empirical-evidence table, the residual-rule
roll-up, and the per-change Biome-activation principle remain authoritative.

### Empirical evidence — Biome 2.3.10 rule registry vs. SonarCloud findings

Each row was probed against the pinned Biome 2.3.10 binary. Reproducer commands
appear in the cells; results were captured during the writing of this ADR. The
probes are repeatable from any clean clone after `pnpm install`.

| SonarCloud rule (CSV count)          | Hypothesised Biome rule                     | Probe outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Disposition                                                                                                                                                                                                                                   |
| :----------------------------------- | :------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript:S7764` (~26 findings)    | `nursery.useGlobalThis`                     | `biome explain useGlobalThis` returns _Unrecognized option useGlobalThis_. `grep '"useGlobal[A-Za-z]*"'` over the schema returns no match. The rule does not exist in Biome 2.3.10.                                                                                                                                                                                                                                                                                                                                                   | **Drop.** No Biome activation possible at the pinned version. Findings remain SonarCloud-side until a future Biome version ships the rule.                                                                                                    |
| `javascript:S6594` (1 finding)       | `nursery.useRegexpExec`                     | Rule exists. With the correct domain shape `linter.domains.project: "all"` (the boolean shape is schema-invalid; see Risk Mitigation), the rule fires on a string literal `'literal'.match(re)` but does not fire on a JSDoc-typed function parameter (the actual CSV target shape at `scripts/generate-csp-hashes.mjs:117`). Type-inference-driven; the CSV target evades it.                                                                                                                                                        | **Drop.** Activating the rule produces zero detection value on the existing CSV target; the only side-effect is enabling the project domain across the whole repo, which has its own opt-in cost.                                             |
| `typescript:S7755` (2 in CSV, 3 new) | `style.useAtIndex`                          | Rule exists; autofix is unsafe. Applied to the actual CSV sites, the autofix rewrites `arr[arr.length - 1]` → `arr.at(-1)`, which: (a) on `NodeListOf<T>` receivers fails with `Property 'at' does not exist on type 'NodeListOf<…>'` because the DOM lib type lacks `.at`; (b) on `Array<T>` receivers narrows the result to `T \| undefined`, breaking downstream property-access chains.                                                                                                                                           | **Drop.** The autofix is not mechanical; applying it requires either an `Array.from(...)` rewrite (behavioural change) or per-site casts (type-safety regression). The five findings stay open for a dedicated rewrite.                       |
| `typescript:S7735` (1 finding)       | `style.noNegationElse`                      | Rule exists; the safe autofix flips `if (!cond) … else …` to `if (cond) … else …`. The CSV finding at `src/utils/bootstrap.ts:32` is `if (document.readyState !== 'loading')`, an _inequality_ expression. Biome's rule flags only prefix-negation (`!cond`); SonarCloud's S7735 also flags `!==`. The semantic gap means the Biome rule does not catch the CSV finding.                                                                                                                                                              | **Drop.** Activating the rule produces zero new findings on the current code. The single CSV finding is not detected. The rule's forward-protective value is real but does not justify a config addition without a matching detected finding. |
| `typescript:S3776` (0 in CSV, 0 new) | `complexity.noExcessiveCognitiveComplexity` | Rule exists; activated. The four sites named in the prior `Defer to refactor` row are now compliant after extracting per-section helpers (`populateImage`, `populateNameAndTitle`, `populateStats`, `populateBio`, `populateAchievements`, `populateSpecialties`, `populateCta`, `populateChipList`) in `coachDetailModalController.ts`, lifting `hideOtherDisclosures` from the click handler in `accordionController.ts`, and extracting `populateResultText` / `buildContactHref` / `handleNavAction` in `quizModalController.ts`. | **Active.** Threshold 15 enforced via `pnpm lint`; baseline-canary asserts the rule's continued existence.                                                                                                                                    |
| `javascript:S3358` (1 finding)       | `style.noNestedTernary`                     | Rule exists; reports one site at `scripts/generate-csp-hashes.mjs:195` (a `changed ? (dryRun ? a : b) : c` expression). No autofix; the rewrite is mechanical (extract to an `if`/`else` chain or a local variable).                                                                                                                                                                                                                                                                                                                  | **Defer to fix.** Activate the rule together with the rewrite of the existing finding. The fix-and-activate pair lands as one change with zero baseline suppressions.                                                                         |

The pattern across the table is consistent: _rule names suggest mirror coverage;
empirical probes do not confirm it_. The four rules in the "Drop" disposition
contribute zero structural prevention at Biome 2.3.10. The two "Defer" rules
contribute structural prevention if and only if the activation travels with the
matching fix.

### Residual SonarCloud-only rules

These rules have no Biome equivalent in 2.3.10 and stay covered by SonarLint
Connected Mode at edit time, plus SonarCloud Automatic Analysis at PR time:

- `typescript:S7761` — prefer `.dataset` over
  `getAttribute / setAttribute / hasAttribute`
- `typescript:S7764` — prefer `globalThis` over `window` (also discussed in the
  empirical-evidence table above; listed here for the residual-coverage roll-up)
- `typescript:S7781` — prefer `String#replaceAll()` over
  `String#replace(/.../g)`
- `javascript:S2871` — sort with `localeCompare`
- `typescript:S6564` — redundant type alias
- `typescript:S4325` — unnecessary type assertion
- `typescript:S1854` — useless assignment
- `typescript:S1135` — TODO comments
- `javascript:S7785` — top-level await
- `githubactions:*` — workflow permission scope, image tag pinning, TODO

These are the rules SonarLint Connected Mode catches in real time; before this
ADR, they were caught only by SonarCloud after the PR opened.

### Cross-platform SonarLint setup

Per-repo committed:

- `.vscode/extensions.json` — recommends `SonarSource.sonarlint-vscode`. The
  publisher and extension slug remain unchanged after SonarSource's product
  rebrand to "SonarQube for IDE"; the marketplace install ID is the
  authoritative identifier.
- `.sonarlint/connectedMode.json` — generated by the SonarLint extension via the
  command palette entry "SonarLint: Share Connected Mode Configuration" and
  committed verbatim. The file's schema is determined by the extension version
  that produces it; consumers do not hand-edit it. Forward compatibility is the
  IDE's responsibility — a future SonarLint version that ships a different
  schema regenerates the file on demand.
- `.gitignore` — excludes `.sonarlint/*` with a negation exception
  `!.sonarlint/connectedMode.json` so per-developer SonarLint artefacts (caches,
  logs, telemetry) stay local while the binding metadata ships.

Per-developer (not committed):

- A SonarCloud Personal-Access Token from
  `https://sonarcloud.io/account/security`. The token resides in VS Code's
  SecretStorage automatically when the developer runs the "SonarLint: Connect to
  SonarCloud" command. The token must never appear in any repo file.

The SonarLint VS Code extension (current branding "SonarQube for IDE") bundles a
Java 21 JRE for Windows x64, Linux x64, and macOS (x64 and arm64). No external
JDK is required. The bundling claim is documented in the SonarSource extension
changelog at
`https://docs.sonarsource.com/sonarqube-for-ide/vs-code/getting-started/installation/`,
which `docs/DEVELOPMENT.md` cites at the per-platform setup step.

### What does NOT change

- Biome's existing rule set — `recommended` plus the project-specific style and
  suspicious overrides — is unchanged. This ADR adds zero rules to `biome.json`.
- SonarCloud Automatic Analysis on PRs is unchanged — it remains the
  authoritative measurement of Sonar findings against the default quality
  profile.
- The `pnpm check` chain (`typecheck` → `lint` → `format:check` →
  `check:conventions`) is unchanged.
- The pre-commit hook (`lint-staged` running `biome check --write` on staged
  files) is unchanged.
- `.astro` files remain excluded from Biome (`linter.includes` includes
  `!**/*.astro`).

### Scope and non-goals

**In scope:**

- Documenting the SonarLint Connected Mode setup and shipping the binding
  artefact.
- Recording the empirical evidence above so future Biome upgrades and future
  rule re-evaluations have a primary-source reference.
- Establishing the principle: when a Biome rule activation is contemplated to
  mirror a SonarCloud finding, the activation lands in the same change that
  removes the matching CSV row, never as a standalone "structural prevention"
  addition that ships baseline suppressions.
- A CI canary (`scripts/check-biome-rule-baseline.mjs`) that asserts the
  empirical-evidence table's rule-existence claims against the installed Biome
  binary, so a future Biome upgrade that resurfaces a "Drop" rule or removes a
  "Defer" rule fails CI before merging.

**Out of scope:**

- Refactoring any of the existing Sonar findings. This ADR ships no behavioural
  code change.
- Activating any Biome rule. The two "Defer to refactor" / "Defer to fix" rows
  above are explicit non-decisions for this ADR; they are inputs to the future
  code-change tasks that own the matching fixes.
- Introducing a per-change rulebook or a meta-policy for "when Biome and when
  SonarLint". The decision is settled per rule by the empirical-evidence table
  above; future rules are evaluated with the same probe shape (run
  `biome explain`, run `biome lint --only`, observe).

## Consequences

### Positive

- **Edit-time visibility for the Sonar JS/TS plugin's full rule set.** SonarLint
  Connected Mode runs the SonarCloud project's quality profile inside the
  editor. The longest-running feedback delay (commit → push → PR → SonarCloud
  Automatic Analysis) collapses to keystroke-time for every rule SonarCloud
  already enforces, including the residual rules above.
- **Zero baseline suppressions.** No `biome-ignore` ships with this ADR. Future
  Biome rule activations that mirror Sonar findings travel with the matching
  fix, so each activation lands at zero suppressions on day one.
- **Auditable empirical record.** The evidence table is reproducible from a
  clean clone. A future maintainer evaluating a new Biome rule against a Sonar
  finding follows the same probe shape rather than reading the biomejs.dev rule
  list and trusting it.
- **Bus-factor-friendly handover.** The discoverable artefacts
  (`extensions.json` recommendation, `connectedMode.json`, `DEVELOPMENT.md`
  section) reduce onboarding friction to one extension install plus one token
  paste.
- **Structural drift detection.** The CI canary fails the build when the
  empirical-evidence table's rule-existence claims diverge from the installed
  Biome binary. A Biome upgrade that auto-merges via Renovate cannot silently
  invalidate this ADR's table — CI catches the drift on the upgrade PR before it
  reaches `main`.

### Negative

- **Per-developer Connected-Mode setup friction.** Each developer installs the
  recommended extension (one prompt on first open) and creates a personal
  SonarCloud token (one trip to `sonarcloud.io/account/security`). The setup is
  one-time per machine; the friction is real but bounded.
- **Per-rule cognitive load.** Future code-change tasks must remember to
  evaluate "does this change clear a CSV row that has a matching Biome rule?"
  and, if so, activate the rule in the same change. The empirical- evidence
  table reduces the lookup cost (the two "Defer" rows are the only two
  candidates today), but the discipline is real.
- **Biome upgrades may unlock dropped rules.** When Biome 2.4.x or later ships,
  rules currently absent (`useGlobalThis`) or rules currently with too-strict
  autofix shapes (`useAtIndex`) may become viable. The CI canary catches
  _existence_ drift; behavioural drift (a "Drop" rule whose autofix becomes
  mechanical, or a "Defer" rule whose finding count changes) requires a probe
  lint run that the canary does not yet perform — see Risk Mitigation.
- **JRE bundle size in dev environment.** The SonarLint extension brings a Java
  21 JRE per platform, contributing roughly 100 MB to each developer's VS Code
  extension footprint. Acceptable cost for the cross-platform zero-JDK
  guarantee.

### Risk mitigation

- **Baseline drift detection via CI canary.** The script
  `scripts/check-biome-rule-baseline.mjs` runs `biome explain` for each of the
  six rules in the empirical-evidence table and asserts each rule's existence
  status against the ADR-recorded baseline. The script is invoked from
  `.github/workflows/quality.yml` after the existing `Convention Check` step.
  Coverage and non-coverage are explicit:
  - **What the canary verifies:** that each "exists, behaves as documented" rule
    (`noExcessiveCognitiveComplexity`, `noNestedTernary`, `useRegexpExec`,
    `useAtIndex`, `noNegationElse`) still resolves under `biome explain`, and
    that the "does not exist" rule (`useGlobalThis`) still fails to resolve. A
    drift in either direction fails the script with an actionable error pointing
    at this ADR.
  - **What the canary does NOT verify:** behavioural parity with the
    empirical-evidence table's "does not fire on CSV target" claims for
    `useRegexpExec`, `useAtIndex`, `noNegationElse`. Re-checking those requires
    running `biome lint` against fixture files representative of each CSV
    target's shape; that probe is a future structural extension of the canary,
    not part of this ADR's initial implementation.

  The canary turns the empirical-table-maintenance obligation from a
  human-discipline expectation into a fail-closed CI signal. Renovate's
  automerge of Biome patch/minor updates is no longer a silent failure vector
  for this ADR; the canary breaks the upgrade PR before merge.

- **Connected-Mode binding goes stale.** If the SonarCloud organisation key or
  project key changes, the committed `connectedMode.json` becomes incorrect. The
  owner regenerates the file via the IDE command palette; the regeneration is
  one VS Code action plus one commit. Documented in `docs/DEVELOPMENT.md`.
- **SonarCloud Automatic Analysis assumption.** This ADR assumes SonarCloud
  Automatic Analysis is configured at the SonarCloud-org level against this
  repository. The repository carries `sonar-project.properties` only for the
  data-layer CPD carve-out per [ADR-0058](0058-data-module-cpd-exclusion.md); no
  `.sonarcloud.properties` and no `.github/workflows/sonar*.yml` are present, so
  the Automatic-Analysis bulk configuration lives entirely SonarCloud-side. The
  owner confirms the configuration out-of-band before this ADR's residual-rule
  coverage claim becomes load-bearing for shipped code.
- **`linter.domains.project` shape.** When a future change evaluates a Biome
  rule with a `Domain: project` constraint (e.g. the dropped `useRegexpExec` row
  above), the correct shape is `linter.domains.project: "all"` (or
  `"recommended"`), not the boolean `true`. The boolean shape is rejected by
  Biome's schema validator and produces _Incorrect type, expected a string, but
  received a boolean_ — an error that breaks the entire `pnpm lint` chain, not
  just the rule under evaluation. Recorded here so a future maintainer
  evaluating a domain- scoped rule does not re-discover the schema rule by
  accident.
- **VS Code recommended-extension nag.** Each developer is prompted once after
  the new entry lands; subsequent dismissals are stored in the user's local VS
  Code profile and persist. No re-nag for pre-existing entries.

## Success criteria

- A fresh clone, after `pnpm install`, can show SonarLint Connected Mode
  activating in VS Code with one extension install plus one
  `SonarLint: Connect to SonarCloud` command and one token paste. The binding
  artefact at `.sonarlint/connectedMode.json` is sufficient to configure the
  connection without manual organisation/project entry.
- The empirical-evidence table reproduces from any clean clone: running the
  cited `biome explain` and `biome lint --only` commands against the same Biome
  version produces the same outcomes.
- The CI canary `scripts/check-biome-rule-baseline.mjs` runs on every Biome
  dependency-update PR (Renovate-driven or manual) and fails when a rule's
  existence state drifts from the baseline. A green canary on the upgrade PR is
  the contract that guarantees the ADR's table is still accurate against the
  upgraded binary.
- No Sonar finding listed under "Residual SonarCloud-only rules" requires
  PR-time discovery. Developers running SonarLint Connected Mode see the same
  diagnostics SonarCloud will see, before pushing.

## References

- [ADR-0004](0004-use-hybrid-formatting-biome-and-prettier.md) — Biome's
  position in the toolchain.
- [ADR-0006](_archive/0006-enforce-strict-environment-and-dependency-pinning.md)
  — strict version pinning, including Biome 2.3.10.
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) — extends this ADR's
  prevention model with a scriptable per-file findings lookup against
  SonarCloud's REST API for the automated-contributor working mode.
- [SonarLint VS Code Connected Mode](https://docs.sonarsource.com/sonarqube-for-ide/vs-code/team-features/connected-mode/)
  — the file shape, the binding semantics, and the SonarCloud connection flow.
- [SonarLint VS Code installation](https://docs.sonarsource.com/sonarqube-for-ide/vs-code/getting-started/installation/)
  — the per-platform installation note and the bundled-JRE claim cited in
  `docs/DEVELOPMENT.md`.
- [Biome configuration schema](https://biomejs.dev/reference/configuration/) —
  `linter.domains` and the rule registry shape; the empirical probes above
  cross-check the local pinned binary against the published schema.
- `docs/DEVELOPMENT.md` § SonarLint Connected Mode — per-developer setup
  instructions and the JRE-bundling source link.
- `scripts/check-biome-rule-baseline.mjs` — the CI canary that fails when the
  empirical-evidence table's rule-existence claims drift from the installed
  Biome binary.
- `sonar-issues.csv` — the SonarCloud snapshot the empirical evidence table was
  built against (untracked, repository root, snapshot date 2026-05-01).
