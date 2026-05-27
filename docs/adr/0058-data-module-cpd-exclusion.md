# Data-Module CPD Exclusion: ADR-0017's Mandated Record Shape Is Out of Scope for SonarCloud Copy-Paste Detection

Date: 2026-05-26

## ADR Warrant Check

- [x] **A — Contract**: this ADR creates a project-wide contract that
      SonarCloud's Copy-Paste-Detector does not analyse files under
      `src/data/**/*.ts`. The contract is set in `sonar-project.properties` at
      the repo root and applies to every SonarCloud analysis run on every
      branch. Any change to the exclusion scope — narrowing it to a per-file
      list, widening it beyond `src/data/`, or removing it — is a change to this
      contract and requires an ADR-0058 Status update.
- [ ] **B — Asymmetry**: not invoked.
- [ ] **C — External revisit**: not invoked.
- [ ] **D — Promise/Code Asymmetry**: not invoked.

## Status

Accepted

## Context

[ADR-0017](0017-domain-data-integrity-pattern.md) mandates the **const-array +
Record + `satisfies`** shape for every domain dataset with ID-based
cross-references. The mandated shape produces a byte-symmetric entry block —
each entry is a `{ id, name, … }` literal with the same key ordering, the same
indentation, and the same closing pattern. The structural sameness is the
contract's point: it is what makes `as const satisfies Record<Id, Entry>`
provable to TypeScript at compile time, and it is what lets a reviewer scan a
record literal at a glance.

SonarCloud's Copy-Paste-Detector (CPD) is, by design, a sensor for
byte-symmetric blocks. It tokenises the file and flags every run of identical or
near-identical tokens above a threshold as a duplication cluster. When a file's
entry count grows past a low threshold, ADR-0017's mandated shape becomes
indistinguishable, from CPD's perspective, from a copy-paste defect.

The conflict surfaced on PR #237, the testimonials → ADR-0017 migration (closing
the last ID-keyed module's pre-ADR-0017 outlier shape). The migration lifted
`src/data/testimonials.ts` onto the canonical pattern, adding `testimonialIds`,
`TestimonialId`, and `testimonialsById`. The `testimonialsById` record holds
nine entries, each a `{ id, name, quote, avatar, title, featured? }` literal.
SonarCloud's branch analysis flagged a 57-line duplication block starting at
line 80, repeated at line 88 with overlap, spanning the entries `'laura-b'`
through `'patricia-h'`. The quality gate's `new_duplicated_lines_density` metric
reported 12.5 % against a ≤ 3 % threshold; the gate failed.

The local pre-push duplication detector (jscpd at `minTokens: 100, mode: strict`
per [ADR-0045](0045-local-jscpd-duplication-gate.md) and demoted to advisory per
[ADR-0056](0056-duplication-gate-as-advisory-signal.md)) reported zero clusters
on the same file. Different tokeniser, different normalisation rules; the local
advisory cannot predict the SonarCloud finding.

The same conflict already exists on the two other large ID-keyed modules:
`successStories.ts` reports 13.8 % duplication density (70 / 249 ncloc) and
`services.ts` reports 17.3 % (197 / 677 ncloc). Both pass the gate today because
the duplication is in already-merged code; SonarCloud's gate measures _new_
duplication density, and density on old code does not count. Any future rebase
that lifts those densities into the new-code window — or any new ID-keyed module
that lands with enough entries — re-triggers the same failure.

The decision this ADR closes: **how does the project resolve the structural
conflict between ADR-0017's mandated Record shape and SonarCloud's
Copy-Paste-Detector?**

### Decision drivers

- **Structural correctness over tooling accommodation.** ADR-0017's shape is
  load-bearing — the byte-symmetric Record literal is the contract that gives
  TypeScript its completeness guarantee. Deforming the data layer to break CPD
  clusters is the inverse of the structural-correctness motivation that drove
  ADR-0017.
- **Criterion-led policy over enumerated lists.** The
  [ADR-0017 v2 Out-of-Scope rewrite](0017-domain-data-integrity-pattern.md#scope-and-non-goals)
  (landed on PR #237 alongside the testimonials migration) replaced a
  drift-prone exemplar enumeration ("testimonials, stats, USPs, FAQ items,
  navigation") with a criterion phrasing ("datasets that do not participate in
  ID cross-references"). The CPD exclusion follows the same shape: a criterion
  (every ADR-0017-shaped data module under `src/data/`), not a file list that
  decays as new modules land.
- **Defense-in-depth at the analysis layer is partial, not absent.** SonarLint
  VS Code in Connected Mode
  ([ADR-0041](0041-sonarlint-connected-mode-local-prevention.md)) surfaces code
  smells at edit time but does not surface CPD findings — duplication is not a
  SonarLint rule category. The local jscpd advisory
  ([ADR-0056](0056-duplication-gate-as-advisory-signal.md)) prints clusters at
  its own calibration and is unaffected by this ADR's SonarCloud exclusion. The
  exclusion narrows one tool's scope; the other tools' coverage is unchanged.
- **AI-first working mode.** The repo optimises for typed boundaries, low blast
  radius, and structural enforcement over per-contributor discipline. A
  criterion-led exclusion that lives in a checked-in property file is
  structural; a SonarCloud-UI exclusion that lives only in the project settings
  is discipline ("remember to update the SonarCloud setting when a new data
  module lands").
- **No paid SaaS, no new CI service.** The exclusion ships as a single line in a
  repo-root properties file. No tooling change, no workflow change.

### Evaluated approaches

1. **Per-file enumeration — `sonar.cpd.exclusions=src/data/testimonials.ts`.**
   The minimal fix for PR #237. **Rejected:** decays as new ID-keyed modules
   land; restates a per-file consequence of a project-wide contract; re-runs
   this Phase-2 callback every time a new data module's density crosses the
   gate's new-code threshold.
2. **Enumerated list —
   `sonar.cpd.exclusions=src/data/testimonials.ts,src/data/successStories.ts,src/data/services.ts`.**
   Covers the three files known to be at risk today. **Rejected:** the same
   enumeration-decay shape ADR-0017's v2 Out-of-Scope rewrite just removed. The
   criterion that defines "this file's CPD findings are ADR-0017 consequences,
   not defects" is structural; the file list restates the consequences, not the
   criterion.
3. **SonarCloud UI exclusion (project Administration → Analysis Scope).** Set
   the exclusion in the SonarCloud project settings, not in the repo.
   **Rejected:** moves the policy out of source control; loses the bus-factor
   discoverability (a future maintainer reading the repo cannot see why the data
   layer is silent on CPD); creates a two-source-of-truth situation if the
   project ever migrates to a CI-driven scanner that reads the properties file.
4. **Reshape the data layer to break CPD clusters.** Flatten the Record
   literals, lift repeated fields (e.g., avatar URLs) to a separate object,
   restructure entries to maximise per-entry token variance. **Rejected:** the
   inverse of ADR-0017's structural-correctness motivation; deforms the
   load-bearing shape to accommodate a tool the project does not want
   accommodating it; would have to be re-run on every future data-module growth.
5. **Broad by-directory exclusion —
   `sonar.cpd.exclusions=src/data/**/\*.ts`. Chosen.** A single glob that mirrors ADR-0017's contract scope. Every file under `src/data/`
   either follows ADR-0017's mandated shape (and CPD's flagging is a structural
   consequence, not a defect) or is a simple display array (Out-of-Scope per
   ADR-0017 itself, structurally low enough to never trip CPD). The exclusion is
   criterion-led; new data modules inherit the policy automatically.

## Decision

A new `sonar-project.properties` file at the repo root carries the single
property:

```
sonar.cpd.exclusions=src/data/**/*.ts
```

with a header comment naming the policy and pointing at this ADR. The exclusion
applies to every SonarCloud analysis on every branch.

The criterion the exclusion encodes: **TypeScript files under `src/data/` are
out of scope for Copy-Paste-Detection because ADR-0017 mandates a byte-symmetric
Record literal shape over the ID-keyed modules and CPD is designed to flag
exactly that shape.** The exclusion is policy, not a workaround. The structural
conflict between ADR-0017 and CPD is resolved by narrowing CPD's scope, not by
deforming ADR-0017's mandated shape.

### What does NOT change

- **ADR-0017's mandated shape.** The const-array + Record + `satisfies` pattern
  remains the contract for every ID-keyed data module. No change to existing
  data modules (`coaches.ts`, `services.ts`, `successStories.ts`,
  `testimonials.ts`, `stats.ts`, `quiz.ts`) and no change to the CONVENTIONS
  Topic Hub entry or the ADR-0017 Current Applications table.
- **SonarLint VS Code edit-time analysis
  ([ADR-0041](0041-sonarlint-connected-mode-local-prevention.md)).** Unaffected
  — SonarLint does not surface CPD findings, only rule-based findings (code
  smells, bugs, vulnerabilities). Edit-time prevention of every Sonar rule
  category except duplication remains in force.
- **Local jscpd pre-push advisory
  ([ADR-0056](0056-duplication-gate-as-advisory-signal.md)).** Unaffected —
  jscpd does not read the SonarCloud properties file. The advisory continues to
  print the cluster delta on every push, including over `src/data/`. The
  `.jscpd.json` calibration (`minTokens: 100`, `mode: strict`) and scope
  (`src/` + `scripts/`) are unchanged.
- **SonarCloud's rule-based findings on
  `src/data/**/\*.ts`.** CPD is one finding category among many; the exclusion narrows only the CPD category. Code smells, bugs, and vulnerabilities on data-module files continue to surface in `pnpm
  query:sonar-findings`
  ([ADR-0042](0042-agent-side-sonarcloud-findings-query.md),
  [ADR-0046](0046-sonarcloud-branch-aware-findings-and-duplications-extension.md))
  and on the SonarCloud PR-side gate.
- **SonarCloud's CPD on all other files.** Files outside `src/data/` continue to
  be analysed by CPD at SonarCloud's default calibration. The exclusion is
  scoped strictly to the data layer.
- **The local pre-push gate workflow
  ([CLAUDE.md § Pre-Push Gate](../../CLAUDE.md#pre-push-gate)).** Unchanged.
  `pnpm format`, `pnpm check`, reviewer pass, push — same order, same steps.

### Scope and non-goals

**In scope:**

- The single property `sonar.cpd.exclusions=src/data/**/*.ts` in
  `sonar-project.properties` at the repo root.
- A criterion-based policy statement that ADR-0017-shaped data modules under
  `src/data/` are out of scope for CPD detection by structural necessity.

**Out of scope:**

- CPD exclusion for any other directory (`src/components/`, `scripts/`, `docs/`,
  `public/`, etc.). The conflict ADR-0017 creates with CPD is specific to the
  data layer; the rest of the project is analysed normally.
- Other SonarCloud analysis parameters (`sonar.exclusions`,
  `sonar.coverage.exclusions`, `sonar.test.exclusions`, etc.). The current
  `sonar-project.properties` file holds one property and one property only;
  additions land via their own streams.
- Restructuring existing data modules to break CPD clusters. ADR-0017's shape is
  the load-bearing motivation; the carve-out resolves the conflict at the
  analysis layer.

## Consequences

### Positive

- **The PR #237 quality gate passes.** `new_duplicated_lines_density` on
  `src/data/testimonials.ts` drops from 12.5 % to ≤ 3 % on the next analysis run
  (the testimonials file contributes zero duplication once excluded).
- **Future ID-keyed modules inherit the policy automatically.** When a new data
  module lands on the ADR-0017 pattern, no Sonar property edit is required — the
  broad glob already covers it.
- **The two pre-existing high-density modules (`successStories.ts`,
  `services.ts`) are protected against future rebases.** A rebase or large entry
  addition that lifts their densities into the new-code window does not
  re-trigger the gate; the exclusion applies to all analysed files, not just
  new-code-window files.
- **The criterion is documented at the right level.** A future contributor who
  lands on `sonar-project.properties` or on this ADR sees the structural
  conflict spelled out; a future contributor adding a new data module under
  `src/data/` does not need to know about the carve-out because the policy is
  automatic.
- **Bus-factor friendly.** The policy lives in source control with a header
  comment pointing at this ADR. A maintainer joining the project six months from
  now reads the same record the architect wrote.

### Negative

- **CPD has a partial blind spot at the data layer.** Genuinely algorithmic code
  added to `src/data/` would not be surfaced by CPD. The mitigation is the
  existing convention that `src/data/` carries data + types + minimal lookup
  helpers, not algorithms — but the convention is documentation, not a
  structural guard.
- **The exclusion is set in a checked-in file, not in the SonarCloud UI.** A
  future maintainer reading the SonarCloud project's Administration → Analysis
  Scope page sees an empty exclusion list and might conclude no exclusions are
  configured. The reconciliation happens when SonarCloud Automatic Analysis
  reads `sonar-project.properties` at analysis time; the UI does not pre-resolve
  the property file.
- **The properties file is a new configuration surface.** It is small and
  single-purpose today, but the next contributor with a Sonar property need must
  decide whether to add to this file or surface a separate stream. The ADR's
  Out-of-scope clause names "additions land via their own streams" to discourage
  drift.

### Risk mitigation

- **Convention reinforcement.** A future debt-audit pass over `src/data/` can
  flag any module that grows algorithmic code (a parser, a generator, a
  non-trivial helper). The ADR's "Out of scope" sentence makes the convention
  explicit; the debt-auditor pattern (`docs/AGENTS.md` § The Seven Subagents) is
  the mechanical path if drift is suspected.
- **Cross-link from `docs/adr/0017-domain-data-integrity-pattern.md`.**
  ADR-0017's References section gains a paragraph pointing at this ADR so the
  bidirectional discoverability holds.
- **No silent inheritance of the policy elsewhere.** The exclusion glob is
  strictly `src/data/**/*.ts`. No `**/data/*.ts` or `**/*.ts`. A future
  contributor reading the property file sees the scope and cannot mistake it for
  project-wide.

## Success criteria

- After this ADR's PR merges and SonarCloud's Automatic Analysis re-runs, the PR
  #237 branch quality gate moves from FAILED to PASSED. The
  `new_duplicated_lines_density` metric on `src/data/testimonials.ts` drops to 0
  % (the file is excluded entirely from CPD).
- `pnpm query:sonar-findings --files src/data/testimonials.ts` continues to
  surface rule-based findings (code smells, bugs, vulnerabilities) if any exist.
  The exclusion narrows only the CPD category, not the rule-based surface.
- `pnpm check:duplication` (local jscpd advisory) continues to print clusters at
  its own calibration. The exclusion is SonarCloud-side only; jscpd is
  unaffected.
- A future ID-keyed data module landing under `src/data/` does not re-trigger a
  CPD gate failure. The exclusion is criterion-led and automatic.

## Documentation Updates

This ADR requires the following updates in the same set of commits as the ADR
itself:

- `docs/adr/0017-domain-data-integrity-pattern.md#references` — append a
  paragraph at the bottom of the References section pointing at this ADR,
  framing the carve-out as policy over the data layer.
- `docs/ARCHITECTURE.md#adr-quick-reference` — append the ADR-0058 row to the
  table, after the ADR-0056 row.

No CLAUDE.md change (no new Critical Rule, no new Quick Reference entry — this
is an analysis-configuration policy, not a contributor-discipline rule). No
CONVENTIONS.md change (the Topic Hub Index is for code-writing surfaces;
`sonar-project.properties` is configuration, not a code-writing surface). No
AGENTS.md change (no agent role, phase flow, or "What Lives Where" inventory
affected).

## References

- [ADR-0017](0017-domain-data-integrity-pattern.md) — the const-array + Record
  - `satisfies` pattern that mandates the byte-symmetric Record literal shape
    CPD is designed to flag. The structural conflict this ADR resolves.
- [ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) — SonarLint VS
  Code in Connected Mode as the local prevention layer; unaffected by this ADR
  because SonarLint does not surface CPD findings.
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) — agent-side
  SonarCloud findings query; the `pnpm query:sonar-findings` lookup continues to
  surface rule-based findings on data modules, only the CPD category is
  excluded.
- [ADR-0045](0045-local-jscpd-duplication-gate.md) — local jscpd duplication
  gate; unaffected because jscpd does not read the SonarCloud properties file.
  The ADR's threshold-stability contract over `.jscpd.json` remains in force.
- [ADR-0046](0046-sonarcloud-branch-aware-findings-and-duplications-extension.md)
  — SonarCloud branch-aware findings and the duplications endpoint extension.
  The `pnpm query:sonar-findings --rule sonarcloud:duplicated-block` surface
  continues to work; the exclusion narrows the analysis that produces
  duplication findings, not the surface that reads them.
- [ADR-0056](0056-duplication-gate-as-advisory-signal.md) — duplication pre-push
  gate demoted to advisory signal. SonarCloud's PR-side CPD remains the
  post-push authority for files outside `src/data/`. The authority for
  `src/data/` is now ADR-0017's compile-time completeness guarantee plus the
  contributor and reviewer reads — defense-in-depth at the structural level, not
  at the tool level.
