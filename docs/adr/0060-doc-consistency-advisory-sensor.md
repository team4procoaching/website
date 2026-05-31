# Doc-Consistency Advisory Sensor for Canonical-Pointer-Notes and Roster Drift

Date: 2026-05-29

## ADR Warrant Check

Mark at least one trigger; otherwise this is not an ADR but a commit message,
JSDoc note, or [`docs/CONVENTIONS.md`](../CONVENTIONS.md#when-to-write-an-adr)
entry.

- [x] **A — Contract**: the decision creates four project-wide contracts future
      code and AI edits must honour: (1) the structural definition of a
      well-formed canonical-pointer-note across three note shapes, spanning six
      annotation sites in four documents; (2) an advisory-while-chained
      exit-code asymmetry that deliberately inverts the
      [ADR-0050](0050-script-entry-point-naming-convention.md) `check-*`
      blocking default; (3) the project's first non-blocking CI step — a
      `quality.yml` step run with `continue-on-error: true` whose findings
      render into the GitHub Job Summary instead of feeding the required status
      check; and (4) a fixed stdout sentinel line
      (`Doc-consistency findings: <N>`) that the CI step keys its
      render-when-non-empty branch on, decoupled from the human-readable
      advisory prose so that rewording a finding message cannot silently blind
      the CI discriminator. All four govern more than one surface today, and a
      known recurring future event makes them load-bearing (the pointer-note
      shape has already spread to a third-plus site), so the trigger fires on
      the strict reading, not a borderline.
- [ ] **B — Asymmetry**: not invoked independently — the exit-0-on-findings
      asymmetry is the mechanism of contract (A.2), recorded under A rather than
      double-counted.
- [ ] **C — External revisit**: not invoked as a warrant. The
      promotion-to-blocking condition is a named-event-without-a-date
      (C-borderline); it is recorded under Notes as the revisit trigger because
      A already carries the ADR, not to manufacture a second trigger.
- [ ] **D — Promise/Code Asymmetry**: not invoked — this decision is net-new.

Not triggers: large diff, type-system involvement, placeholder-content removal,
a paragraph of justification, "the architect found this decision interesting".

## Status

Accepted

This ADR refines [ADR-0050](0050-script-entry-point-naming-convention.md)'s
`check-*` exit-code rubric by adding an explicit advisory variant; it does not
supersede ADR-0050. It shares the advisory-signal lineage of
[ADR-0056](0056-duplication-gate-as-advisory-signal.md), though the mechanism
differs (hook-layer swallow there vs. in-script exit-0 plus a CI
`continue-on-error` step here).

## Context

The project runs an AI-first workflow in which every Orchestrator session loads
`CLAUDE.md` and `docs/AGENTS.md` and bakes their canonical-source claims into
its behaviour. A **canonical-pointer-note** — the standardised "this
table/section is a summary; document X is canonical; on disagreement X wins"
annotation — is the load-bearing device that resolves which of two overlapping
documents wins on conflict. Two further shapes carry the same function: the
link-less precedence line at the head of `CLAUDE.md` § Critical Rules, and an
inline see-cross-reference. The agent-roster table carries an analogous risk: it
is hand-maintained in three places (`CLAUDE.md`, `docs/AGENTS.md`, ADR-0035)
that can silently diverge.

If a restructure silently drops or malforms one of these notes, the precedence
relationship it encodes disappears and every future session inherits the
ambiguity — a low-frequency, high-leverage drift that propagates silently. None
of `pnpm check`, Biome, `astro check`, the Lychee link-validation CI job (which
checks link _resolution_, not note _presence/shape_), or the existing CI quality
steps catch it. During PR #241's pre-push gate (2026-05-29), three minor
canonical-pointer-note findings surfaced that only a human grep caught — the
empirical trigger that the owner's stated investment threshold ("invest when the
pointer-note shape lands on a third site") had been exceeded.

The decision this ADR closes: **what mechanically catches a missing, malformed,
or divergent cross-document consistency annotation, prospectively, without a
hand-maintained location registry that is itself an unguarded drift surface —
and where does it run so a finding is actually seen?**

### Decision drivers

- **Structural enforcement over per-contributor discipline.** The project's
  AI-first philosophy optimises for mechanical guards, not reviewer vigilance.
- **The expectation mechanism must not relocate the drift it eliminates.** A
  registry in prose is no better than the prose it lists.
- **Heterogeneous note shapes are the dominant false-positive risk.** A
  too-broad "well-formed note" definition fires on ordinary cross-references.
- **The sensor must run where a finding is seen, without breaking any build.**
  CI does **not** run `pnpm check` — `.github/workflows/quality.yml` runs the
  sub-checks as split, blocking steps (`typecheck`, `lint`, `format:check`,
  `check:conventions`, `check:biome-rules`) and never invokes `pnpm check`.
  Chaining the sensor into the local `pnpm check` `&&` chain therefore buys
  local and Pre-Push-Gate coverage only. CI presence requires a dedicated step,
  and that step must surface findings visibly without gating merge.
- **A consumer that decides whether to render must key on a stable marker, not
  on incidental prose.** The CI step branches on "did the sensor find anything";
  if that branch keys on a word that appears only inside a finding message, a
  reword of the message silently turns the render off and the sensor goes blind
  without firing. The discriminator must be a fixed, count-bearing line emitted
  on every non-error run.

### Evaluated approaches

1. **In-document self-describing markers** — an HTML-comment marker at each site
   declaring the expected shape. **Rejected:** the marker is itself an unguarded
   surface (a restructure deletes note and marker together, and nothing fires),
   and it requires mutating four canonical documents purely to serve the tool.
2. **Pure structural derivation** — infer "a note must be here" from the
   presence of the guarded structure (a roster table; an update matrix).
   **Chosen for roster equality (gap c)** because the roster has a distinctive
   machine signature and this is genuinely registry-free. **Insufficient for the
   six annotation surfaces** — surfaces guarding a prose section, a bulleted
   rule list, or an inline bullet have no locally-detectable signature, so
   derivation degenerates into "detect arbitrary prose," producing the
   false-positive explosion this ADR's drivers reject.
3. **Anchored, content-addressed expectation list inside the test-covered
   script** — accept a small expectation table, but locate it where its own
   drift is guarded by the layers the project already trusts (unit tests,
   typecheck, Phase-4 review), keyed on section anchors and required tokens
   rather than line numbers. **Chosen for the annotation presence checks (gaps
   a/b).** This is the same shape as the `BASELINE` table in
   `check-biome-rule-baseline.mjs`, which the project already accepts.

## Decision

A new advisory sensor, `scripts/check-doc-consistency.mjs`, is added. It follows
the three-file `check-*` layout (runner + `doc-consistency/` pure-logic subdir +
co-located `.test.mjs`). It runs in **three** places, all advisory:

1. **Local `pnpm check`** — chained into the `&&` chain via a
   `check:doc-consistency` pnpm-script.
2. **The Pre-Push Gate** — transitively, by being in the local `pnpm check`
   chain that the gate's step 2 runs.
3. **A dedicated non-blocking CI step** in `.github/workflows/quality.yml` (see
   "The non-blocking CI advisory step" below).

Chaining into `pnpm check` gives the sensor local and Pre-Push coverage; the
dedicated CI step is what gives it any CI presence at all — CI does not run
`pnpm check`.

### The three note-shape well-formedness contracts

The sensor recognises three shapes, each with its own recognition rule and its
own well-formedness definition — there is no single "well-formed note"
predicate, by design.

- **Shape S1 — standalone italic block** (the four uniform surfaces: CLAUDE.md
  roster note, AGENTS.md Quick-Fix note, ARCHITECTURE.md and MAINTENANCE.md
  renovate notes). Well-formed iff, within the named section, an italic
  paragraph (joined across its physical lines before the italic wrapper is
  tested, since the live blocks span multiple lines) contains the lead token
  `Canonical source`, a Markdown link whose target matches the descriptor's
  expected canonical target, and a precedence clause (`side wins`).
- **Shape S2 — link-less precedence line** (CLAUDE.md § Critical Rules head).
  Well-formed iff an italic paragraph in the section head contains
  `is a summary`, `canonical prose lives in`, and the precedence clause
  `canonical wins`. **No Markdown link is required** — surface 5 names its
  canonical target in prose, not as a link; requiring a link would guarantee a
  false positive.
- **Shape S3 — inline see-cross-reference** (CLAUDE.md ADR-numbering bullet).
  Well-formed iff the bullet carrying the unique lead phrase `Numbers new ADRs`
  contains an inline `see [...](...)` whose target matches
  `ARCHITECTURE.md#adr-lifecycle`. Keying on the unique lead phrase is what
  prevents S3 from firing on the many ordinary inline see-links elsewhere. A
  missing lead phrase becomes an _absence_ finding (noisy, not blind). **The
  sensor does not detect inline cross-references generally** — only this one
  enrolled bullet.

### The roster-equality contract (gap c)

The roster routine reads the three roster tables and compares them under a
normalisation contract, because the three copies are deliberately **not
byte-identical**: ADR-0035's copy has no `Model` column, and `CLAUDE.md` writes
the phase as a bare number (`1`) where the others write `Phase 1`.

- **Authoritative columns `Agent` and `Role` are compared across all three
  copies**, keyed by header name (not positional index), after stripping
  backtick fences and collapsing whitespace.
- **`Phase` is normalised before comparison** (`1` ≡ `Phase 1`); `—` and
  `post-hoc` compare literally.
- **`Model` is compared only across the copies that carry it** — a present
  column versus an absent one is not a divergence.
- **Row-set equality on the `Agent` key, in order** — a missing, extra, or
  reordered agent is a divergence finding naming the offending copy and agent.

The report names the diverging field, the agent row, and the per-copy values. It
does not pick a winner; the human resolves.

### The stdout output contract (the stable discriminator)

The sensor's stdout is a contract, not free text, because a downstream consumer
(the CI step) branches on it. The contract pins **one stable, machine-readable
sentinel line** that is the sole thing any consumer keys on:

- The sensor's stdout **always ends with the line
  `Doc-consistency findings: <N>`** on every non-error run, where `<N>` is the
  non-negative integer finding count (`0` on a clean run). The literal prefix
  `Doc-consistency findings: ` (capital `D`, the rest lower-case, exactly one
  space after the colon) is **fixed**; the integer after it is the branch value.
  The line is emitted **last**, so a consumer reads the final stdout line to get
  the count without parsing the body.
- The **human-readable lines above the sentinel** — the
  `doc-consistency (advisory):` header and the per-finding detail lines (file,
  anchor, shape, and malformation/absence/divergence class), or on a clean run
  the `all enrolled surfaces well-formed` confirmation — **may be reworded
  freely** without breaking any consumer, **because no consumer greps them**.
  This is the whole point of the sentinel: the discriminator is decoupled from
  the prose, so improving a finding message can never silently turn a consumer's
  render off.
- On an **internal error** (a guarded document is unreadable or absent — a
  tooling fault, not a policy finding) the sensor exits non-zero **and does not
  emit the sentinel** (no policy pass completed, so there is no count). A
  consumer distinguishes "ran, found `<N>`" (sentinel present) from "could not
  run" (sentinel absent, non-zero exit).

### Advisory-while-chained exit-code contract (local / Pre-Push)

Because the sensor is spliced into the `pnpm check` `&&` chain — where, unlike
the [ADR-0056](0056-duplication-gate-as-advisory-signal.md) hook layer, there is
no wrapping hook to swallow a non-zero exit — the advisory posture lives
**inside the script**:

- On a clean run **and** on a run with policy findings, the script
  **`process.exit(0)`** and prints the structured stdout defined in "The stdout
  output contract" above (the human-readable advisory block followed by the
  final `Doc-consistency findings: <N>` sentinel; on a clean run the
  confirmation line plus `Doc-consistency findings: 0`).
- Only an **internal error** (a guarded document is unreadable or absent — a
  tooling fault, not a policy finding) exits non-zero, matching the `query-*`
  failure-path convention.

This is a deliberate inversion of ADR-0050's `check-*` default (exit ≠ 0 =
policy violated). The asymmetry exists because breaking the local `&&` chain on
a documentation-prose finding is a worse failure than the finding itself; the
advisory output preserves visibility without the breakage. The finding _count_
lives in the stdout sentinel, never in the exit code, so the exit-0 advisory
posture and the count-bearing discriminator are independent contracts.

### The non-blocking CI advisory step (place 3 — the novel pattern)

This is the project's **first non-blocking CI step**. Every existing step in
`quality.yml` is blocking via the `quality-status` job and branch protection.
The advisory step is _added alongside_ them in the `quality` job, after
`Biome Rule Baseline`, and stays green-but-visible through two independent
guarantees:

- **The sensor always exits 0** on clean and on findings (the in-script contract
  above), so a step running it never fails the job; `needs.quality.result` stays
  `success` and the required `quality-status` check stays green.
- **`continue-on-error: true`** on the step covers the internal-error path: a
  step with `continue-on-error: true` that fails does **not** contribute its
  failure to the job result (documented GitHub Actions behaviour), so even a
  tooling fault in the sensor cannot turn the required status red.

Visibility is achieved by the step rendering the sensor's stdout into
`$GITHUB_STEP_SUMMARY` — the same append mechanism the existing
`Create Job Summary` steps in `quality.yml` and `lighthouse.yml` use. The sensor
itself stays CI-agnostic (it does not know about `$GITHUB_STEP_SUMMARY`); the CI
step owns the summary rendering. **The step's render-when-non-empty branch keys
on the stable sentinel, not on incidental prose:** it extracts the integer `<N>`
from the final `Doc-consistency findings: <N>` line of the captured stdout and
renders the fenced advisory block only when `N > 0`, otherwise the one-line "no
findings" summary. A missing sentinel (the internal-error path) renders the "no
findings" branch rather than erroring; the internal-error visibility is owned by
`continue-on-error` and the step's recorded `outcome: failure`, not by the
summary body. The step does **not** feed the `quality-status` merge-gating
outcome. The net effect: a finding is surfaced on the run's Job Summary — where
a reviewer looks — without turning the required check red.

### What does NOT change

- **The six guarded documents' content** is unchanged — the sensor reads them;
  it does not rewrite them (no auto-fixing).
- **ADR-0050's `check-*` blocking default** for every other sensor is unchanged;
  this ADR adds an advisory variant, it does not make all `check-*` scripts
  advisory.
- **The existing blocking CI steps and the `quality-status` gating job** are
  untouched; the advisory step is added alongside them and never feeds the
  merge-gating outcome.
- **Lychee link validation** remains the authority for link _resolution_; this
  sensor checks note _presence and shape_, never whether a link resolves.
- **No local or CI gate changes its pass/fail behaviour** — the local
  `pnpm check` chain stays green on a finding, and the required CI status stays
  green.

### Scope and non-goals

**In scope:** presence + malformation detection for the six enrolled annotation
surfaces; divergence detection across the three enrolled roster copies; the
advisory exit-code contract; the stdout sentinel contract; the non-blocking CI
advisory step.

**Out of scope:** content-correctness of a canonical claim; link resolution;
general precedence-line or see-link detection across arbitrary sections;
auto-fixing; backfilling notes onto surfaces that lack them; detection of
_un-enrolled_ surfaces (see the limitation under Consequences); converting the
existing blocking CI steps to non-blocking or restructuring `quality-status`.

## Consequences

### Positive

- **Silent prose drift becomes a visible advisory finding** — printed in the
  local / Pre-Push-Gate `pnpm check` output and rendered into the CI run's Job
  Summary. The PR #241 finding class is caught prospectively.
- **The roster's three copies are guarded against divergence** under a
  normalisation contract that tolerates their deliberate structural differences.
- **No build is ever broken** by a documentation finding — the local `&&` chain
  stays green (always-exit-0) and the required CI status stays green
  (always-exit-0 plus `continue-on-error`).
- **The expectation table's own drift is guarded** by unit tests, typecheck, and
  Phase-4 review — the same tier that guards `check-biome-rule-baseline.mjs`'s
  `BASELINE`, not an unguarded prose list.
- **The CI render decision is reword-proof** — keyed on the fixed
  `Doc-consistency findings: <N>` sentinel, not on a word inside a finding
  message, so improving a finding's wording cannot silently turn the advisory
  render off.

### Negative

- **The sensor guards the enrolled set, not the universe of possible notes.** A
  new canonical-pointer-note added on a new surface without enrolling its
  descriptor in `expectations.mjs` is unguarded — the sensor does not know to
  look for it. This is the accepted residual: the sensor converts _silent_ prose
  drift into _enrolled-set-guarded_ drift plus a _reviewed-convention_
  obligation (§ Canonical-Pointer-Note Contract tells a future author to enrol a
  new note), a strict improvement over today's zero guard, not total coverage.
- **The expectation table is hand-maintained.** It is the registry the
  requirements warned about — mitigated, not eliminated, by living in the
  most-guarded surface in the repository rather than in prose.
- **A finding is visible but not forced.** Under the advisory posture, a
  contributor who merges on the green required check without opening the Job
  Summary can ship a malformed note. Accepted: the day-one posture is advisory
  at every placement; the Pre-Push-Gate reviewer agent reads the console
  advisory before the PR is pushed, and the promotion-to-blocking path exists
  for the day this residual proves too weak.
- **The sentinel is a two-site literal coupling.** The exact prefix
  `Doc-consistency findings: ` must read byte-identically in the emitting runner
  and the CI step's grep; a one-byte divergence blinds the CI branch. Mitigated,
  not eliminated, by pinning the string here and in § Canonical-Pointer-Note
  Contract and by the pre-handoff grep that asserts byte-identical spelling — a
  far smaller surface than the prior discriminator, which keyed on a word living
  inside editable finding prose.

### Risk mitigation

- **Enrolment obligation in the convention.** `docs/CONVENTIONS.md` §
  Canonical-Pointer-Note Contract makes enrolling a new note's descriptor a
  documented obligation that Phase-4 review reads — closing the
  un-enrolled-surface gap by convention where the sensor cannot close it
  mechanically.
- **Negative-fixture tests** prove the narrowness of S2 (no link required) and
  S3 (ordinary see-links do not fire), and the roster normalisation (Model
  present-vs-absent and `1`-vs-`Phase 1` do not diverge) — the every-run
  false-positive risks are regression-guarded.
- **Sentinel-string consistency check.** A pre-handoff grep for
  `Doc-consistency findings:` across the runner, `quality.yml`, and this ADR
  plus the CONVENTIONS section asserts the prefix reads byte-identically
  everywhere — the coupling that keeps the CI discriminator from going blind is
  verified, not assumed.

## Success criteria

- After this ADR's PR merges, the sensor runs in three places: the local
  `pnpm check` chain prints its advisory block on any finding and **proceeds**;
  the Pre-Push Gate surfaces it in the reviewer-read output; and the
  `quality.yml` advisory CI step renders the findings into the Job Summary while
  the required `quality-status` check stays **green** — no branch is blocked.
- The sensor's stdout ends with `Doc-consistency findings: <N>` on every
  non-error run (`<N> = 0` clean, `<N> > 0` on findings), and the CI step's
  render-when-non-empty branch keys on that line — rewording a finding message
  does not change whether the advisory block renders.
- Removing the `side wins` clause from any S1 surface, or the `adr-lifecycle`
  link from surface 6, produces a malformation finding on the next local
  `pnpm check` and in the CI Job Summary.
- Diverging a Role cell between two roster copies produces a divergence finding;
  the existing `1`/`Phase 1` and present/absent-Model differences produce none.

## Documentation Updates

This ADR requires the following updates in the same set of commits as the ADR
itself:

- `docs/CONVENTIONS.md#topic-hub-index` — new entry: "When adding or
  restructuring a canonical-pointer-note, a precedence line, or the agent-roster
  table — see § Canonical-Pointer-Note Contract (ADR-0060)."
- `docs/CONVENTIONS.md` — new § "Canonical-Pointer-Note Contract": the three
  note-shape definitions, the roster normalisation contract, the advisory
  posture (local exit-0 + CI non-blocking-but-rendered), the stdout sentinel
  contract (the sensor emits `Doc-consistency findings: <N>` as its final stdout
  line on every non-error run; consumers key on that fixed prefix, never on the
  human-readable detail/header prose, which may be reworded freely), and the
  enrolment obligation for new notes.
- `docs/ARCHITECTURE.md#adr-quick-reference` — append the ADR-0060 row.
- `docs/ARCHITECTURE.md#where-to-find-coding-rules` — mirror bullet for the new
  Hub Index entry (the two indexes stay aligned per § Topic Hub Index
  Maintenance).
- `docs/ARCHITECTURE.md` § Code Quality — add the doc-consistency advisory
  sensor to the local-prevention-layer listing, noting it runs local +
  Pre-Push + a non-blocking CI step.
- `docs/AGENTS.md#what-lives-where` — add `scripts/check-doc-consistency.mjs`
  and its `doc-consistency/` subdir to the inventory.
- `CLAUDE.md` § Conventions Quick Reference — one line noting the
  doc-consistency advisory sensor and its non-blocking posture across all three
  placements.

## Notes

**Promotion-to-blocking revisit trigger (C-borderline, no date).** If the
advisory output is repeatedly ignored and a malformed/absent note or a roster
divergence reaches `main` despite the advisory signal having shown it, the
revisit action is to change the script's `process.exit(0)`-on-findings to
`process.exit(1)`, remove `continue-on-error: true` from the CI step (so its
failure feeds `needs.quality.result` and turns `quality-status` red), and adjust
the local splice so the `&&` chain honours the non-zero exit. The stdout
sentinel contract is unaffected by promotion — the
`Doc-consistency findings: <N>` line is still emitted; only the exit code on a
findings run flips. This is a named-event-without-a-date and is recorded here,
not as an independent Warrant trigger.

## References

- [ADR-0050](0050-script-entry-point-naming-convention.md) — the `check-*`
  three-prefix convention this ADR refines with an advisory exit-code variant.
- [ADR-0056](0056-duplication-gate-as-advisory-signal.md) — the advisory-signal
  precedent; note the mechanism differs (hook-layer swallow there vs. in-script
  exit-0 plus a CI `continue-on-error` step here, because this sensor is
  chain-resident locally and a dedicated step in CI).
- [ADR-0035](0035-adopt-subagent-architecture.md) — carries the third roster
  copy guarded by the gap-(c) routine.
- `.claude/work/2026-05-28-doc-consistency-sensors/01-requirements.md` — the
  requirements this ADR's decision answers.
