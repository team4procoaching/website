# Duplication Pre-Push Gate Demoted to an Advisory Signal

Date: 2026-05-21

## ADR Warrant Check

- [x] **A — Contract**: [ADR-0045](0045-local-jscpd-duplication-gate.md) created
      a project-wide contract that the local pre-push duplication gate
      **hard-fails** on any threshold-meeting cluster. This ADR changes that
      contract for every contributor and every push: the gate becomes
      non-blocking (advisory). A change to the gate's blocking _mode_ is exactly
      the case ADR-0045's threshold-stability contract names as requiring "an
      ADR-0045 Status update **or** a successor ADR" — this ADR is that
      successor.
- [ ] **B — Asymmetry**: not invoked.
- [ ] **C — External revisit**: not invoked.
- [ ] **D — Promise/Code Asymmetry**: not invoked.

## Status

Accepted

This ADR partially supersedes [ADR-0045](0045-local-jscpd-duplication-gate.md) —
specifically ADR-0045's blocking-behaviour clause ("The gate hard-fails on any
cluster meeting the threshold"). ADR-0045's Status line is updated to record the
partial supersession. Everything else in ADR-0045 — the `.jscpd.json`
calibration (`minTokens: 100`, `mode: strict`, `formatsExts`), the `src/` +
`scripts/` scope, and the threshold-stability contract over those values —
remains in force.

## Context

ADR-0045 added a `.husky/pre-push` hook running `pnpm check:duplication` (jscpd
over `src/` and `scripts/`) as the fourth local-prevention layer. The gate was
designed to hard-fail on any duplication cluster meeting `minTokens: 100` at
`threshold: 0`. ADR-0045 anticipated, under "Negative consequences", that the
first push after the hook landed would hard-fail because of a documented day-one
inventory of 13 pre-existing clusters, and named `git push --no-verify` as the
one-time activation bypass — with the expectation that follow-up streams would
clear the inventory and the gate would then fail only on genuinely new
duplication.

That end state was never reached. `docs/debt/REGISTER.md` records
**DEBT-260521-01**: a `pnpm check:duplication` run on 2026-05-21 still reports
13 clones (0.49% duplicated lines against a 0% threshold) — the gate fails on
every push. The day-one inventory was never cleared; the cluster set drifted as
code changed but the running total never reached zero.

A gate that fails on every push carries no signal. A contributor cannot
distinguish a newly-introduced cluster from the standing baseline — the failure
output looks the same either way — so `git push --no-verify` becomes the routine
path rather than an emergency escape hatch. With it, the gate stops gating. PR
#225 made the cost concrete: a deliberately byte-mirrored ~32-line validation
module introduced a new duplication cluster that the local gate could not
surface (a red-to-red transition is unreadable); it was caught only by
SonarCloud's PR-side CPD after the push, costing a full extra rework cycle.

The decision this ADR closes: **what restores a readable signal from the local
duplication gate without re-introducing the friction ADR-0045's pre-commit
analysis already rejected?**

### Decision drivers

- **A readable signal over a dead block.** DEBT-260521-01's named harm is _lost
  signal_, not duplication reaching production (SonarCloud's PR-side CPD remains
  the post-push authority). The fix must make the gate's output readable again.
- **Scope discipline.** The agent-discipline stream that produced this ADR
  explicitly scoped out per-cluster cleanup and new executable tooling. The
  mechanism chosen must not pull either back in.
- **AI-first working mode.** The project optimises for structural enforcement
  over per-contributor discipline. A gate routinely bypassed with `--no-verify`
  is neither — it is a structural mechanism that has degraded into discipline.
- **The fix is agent discipline, not tooling.** The companion decision
  [ADR-0057](0057-tool-checks-as-triage-not-validation-stamp.md) establishes
  that AI agents treat a tool result as triage input. An advisory gate is the
  hook-layer expression of that same relationship.

### Evaluated approaches

1. **Baseline-exclusion — enumerate the standing clusters into `.jscpd.json`
   `ignore`.** Add the day-one cluster file pairs to the `ignore` array so jscpd
   passes on the baseline and the hook stays hard-blocking. **Rejected:** an
   `ignore` entry is a per-cluster disposition, and per-cluster cleanup was held
   out of scope; baselining also masks regression — a genuinely new clone
   _inside_ a baselined file pair becomes permanently invisible, relocating the
   dead-signal failure mode rather than fixing it.
2. **Delta-aware — a wrapper script that fails only on clusters new since the
   merge base.** Replace `jscpd src scripts` with a script that runs jscpd's
   JSON reporter, diffs the cluster set against the merge base, and exits
   non-zero only on net-new clusters. **Rejected:** this is a new executable
   sensor script, explicitly out of scope for the producing stream; it also
   engages the jscpd invocation contract far more deeply and needs its own test
   surface against the jscpd JSON schema. It remains the documented escalation
   path if the advisory gate proves too weak (see Consequences).
3. **Tool switch — replace jscpd with SonarScanner CLI or SonarLint as the
   pre-push duplication detector.** **Rejected:** a tool switch only relocates
   the rubber-stamp effect to a new tool; it does not change the agent-tool
   relationship. The premise of the producing stream is that the fix is agent
   discipline, not tooling.
4. **Warning-only — the hook runs jscpd, prints its output, and exits 0
   regardless. Chosen.** The gate is demoted from a blocking gate to an advisory
   signal: jscpd still computes and prints the same cluster list at the same
   calibration, but a non-zero jscpd exit no longer aborts the push. The
   contributor sees the cluster list and the delta against the previous state
   and decides — exactly the triage relationship ADR-0057 establishes.

## Decision

The `.husky/pre-push` hook is changed so the duplication check **never fails the
push**. The hook runs `pnpm check:duplication`, prints jscpd's full cluster
output, and exits 0 regardless of jscpd's exit code; it echoes one line stating
the result is advisory and pointing at `docs/MAINTENANCE.md` § Local Duplication
Gate.

### What does NOT change

- **`.jscpd.json` is untouched.** `minTokens: 100`, `mode: strict`,
  `threshold: 0`, `formatsExts`, and the `src/` + `scripts/` scope are
  unchanged. jscpd still computes and prints the same clusters at the same
  calibration. ADR-0045's threshold-stability contract over those values remains
  fully in force — this ADR changes the _hook's reaction to jscpd's exit code_,
  not jscpd's calibration.
- **`package.json`'s `check:duplication` script is untouched.**
  `jscpd src scripts` still exits non-zero on a manual `pnpm check:duplication`
  run, so a contributor or agent who wants a hard signal still gets jscpd's real
  exit code. Only the pre-push _hook_ is non-blocking.
- **SonarCloud's PR-side CPD is unchanged** and remains the post-push
  duplication authority — the genuine mechanical backstop.
- **The pre-commit hook** (`gitleaks`, `lint-staged`) and the CI quality and
  tests workflows are unchanged.
- **ADR-0045's framing of the gate as an independent local layer** (not a
  SonarCloud predictor) is unchanged.

## Consequences

### Positive

- **The signal is readable again.** A contributor sees "13 clusters" today and
  "14 clusters" after introducing one — the delta is visible even though neither
  state blocks. DEBT-260521-01's named harm (an unreadable red) is resolved.
- **`git push --no-verify` is no longer the routine path** for the duplication
  check — there is nothing to bypass, so the bypass habit, and the erosion of
  attention to every other hook it caused, is removed.
- **No per-cluster cleanup, no new tooling.** The change is a one-line hook edit
  plus documentation; the standing day-one inventory needs no disposition.
- **DEBT-260521-01 closes.** The gate now produces a signal a contributor can
  act on without consulting the day-one baseline.

### Negative

- **The local gate no longer mechanically prevents a new clone from being
  pushed.** It relies on the contributor — or, in the AI-assisted workflow, the
  agent's triage discipline (ADR-0057) — reading the advisory output.
  SonarCloud's PR-side CPD remains the mechanical post-push catch; the local
  gate's role is now early visibility, not prevention.
- **A contributor who ignores the advisory output ships a new cluster to the
  PR.** This is the accepted trade-off: the blocking gate it replaces was
  already bypassed on every push, so the _effective_ prevention did not change —
  only the honesty of the mechanism did.

### Risk mitigation

- **Escalation path.** If the advisory gate proves too weak — measured by
  repeated incidents where SonarCloud's PR-side CPD catches a cluster the local
  advisory output showed but no one acted on — Approach 2 (a delta-aware script
  that hard-fails only on net-new clusters) is the documented next step. It is a
  separate tooling stream; this ADR's warning-only hook does not block it.
- **Agent-side reinforcement.**
  [ADR-0057](0057-tool-checks-as-triage-not-validation-stamp.md) makes the
  architect, implementer, reviewer, and concept-reviewer treat the jscpd result
  as triage input that still requires a recorded structural reuse check — so the
  advisory signal is read by a chain of agents, not left to a single glance.

## Success criteria

- After this ADR's PR merges, `git push` from any feature branch runs
  `pnpm check:duplication`, prints the cluster output, and **proceeds** — no
  branch is blocked by the duplication check.
- `pnpm check:duplication` run directly still reports a non-zero exit on
  standing clusters, so the hard signal remains available on demand.
- DEBT-260521-01 is recorded as Done in `docs/debt/REGISTER.md`.

## Documentation Updates

This ADR requires the following updates in the same set of commits as the ADR
itself:

- `docs/adr/0045-local-jscpd-duplication-gate.md` — Status line updated to
  `Accepted (partially superseded by [ADR-0056](0056-duplication-gate-as-advisory-signal.md) for the blocking-behaviour clause)`.
  The reference uses the full Markdown link form (resolved target, not a bare
  `[ADR-0056]`), matching the ADR template's documented partially-superseded
  Status variant.
- `docs/MAINTENANCE.md#local-duplication-gate` — rewrite the behavior table's
  blocking cell to advisory; replace the Bypass subsection with one sentence
  stating the output is advisory and the push always proceeds; remove the
  Activation-push subsection; keep the threshold-stability-contract and
  Editing-`.jscpd.json` subsections.
- `docs/ARCHITECTURE.md#adr-quick-reference` — append the ADR-0056 row; update
  the ADR-0045 row summary to note the advisory demotion.
- `docs/ARCHITECTURE.md#code-quality` — append the ADR-0056 cross-reference to
  the jscpd row's Scope cell. The row carries no blocking claim ("Local
  Duplication Detection" plus a config-file/hook scope) — the change is an
  additive cross-reference, not a correction.
- `docs/reference/claude-permissions.md` — § The Four Layers, item 1: correct
  the pre-push-hook description so it states the duplication check is advisory,
  and fix the pre-existing `lint`/`typecheck`/`tests` mislisting (the hook runs
  only `pnpm check:duplication`).

## References

- [ADR-0045](0045-local-jscpd-duplication-gate.md) — the local jscpd duplication
  gate this ADR partially supersedes; its threshold-stability contract over
  `.jscpd.json` remains in force.
- [ADR-0057](0057-tool-checks-as-triage-not-validation-stamp.md) — the companion
  decision: AI agents treat a tool result as triage input, not a validation
  stamp. An advisory gate is the hook-layer expression of that relationship.
- [ADR-0046](0046-sonarcloud-branch-aware-findings-and-duplications-extension.md)
  — SonarCloud's PR-side CPD and the `query:sonar-findings` duplications
  extension; the post-push duplication coverage that remains authoritative.
- `docs/debt/REGISTER.md` — DEBT-260521-01, the debt entry this ADR's PR closes;
  its source report is
  `docs/debt/notes-2026-05-21-duplication-gate-effectiveness.md`.
