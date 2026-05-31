# Tool and Check Results Are Triage Input, Not a Validation Stamp

Date: 2026-05-31

## ADR Warrant Check

Mark at least one trigger; otherwise this is not an ADR but a commit message,
JSDoc note, or [`docs/CONVENTIONS.md`](../CONVENTIONS.md#when-to-write-an-adr)
entry.

- [x] **A — Contract**: the decision records a project-wide contract that
      already governs more than one surface today: that an AI agent treats a
      tool or check result — a hook output, a sensor exit code, a SonarCloud
      findings query, a typecheck pass — as **triage input that still requires a
      recorded human-or-agent judgement**, never as a green-means-done
      validation stamp. The contract is load-bearing for two already-accepted
      advisory mechanisms
      ([ADR-0056](0056-duplication-gate-as-advisory-signal.md) hook-layer
      swallow and [ADR-0060](0060-doc-consistency-advisory-sensor.md) in-script
      exit-0 plus non-blocking CI step), for the standing sonar-no-new-findings
      maintenance principle
      ([ADR-0041](0041-sonarlint-connected-mode-local-prevention.md),
      [ADR-0042](0042-agent-side-sonarcloud-findings-query.md)), and for the
      `architect`, `implementer`, `reviewer`, and `concept-reviewer` roles whose
      prompts already operationalise it. Because it spans multiple mechanisms
      and multiple roles today, the trigger fires on the strict reading — it is
      not the borderline "universally-stated-but-currently-narrow" A case where
      only one surface uses the rule.
- [ ] **B — Asymmetry**: not invoked. The advisory-tool asymmetry (an advisory
      sensor exits 0 where the
      [ADR-0050](0050-script-entry-point-naming-convention.md) `check-*` default
      exits non-zero on a violation) is the mechanism of ADR-0056 and ADR-0060
      and is recorded there; it is not double-counted here.
- [ ] **C — External revisit**: not invoked. There is no dated vendor schedule
      or external commitment that revisits this principle.
- [ ] **D — Promise/Code Asymmetry**: not invoked as the warrant. ADR-0056
      promised a companion "ADR-0057" that was never written — a promise/code
      gap — and writing this ADR is the "fulfil the promise" resolution (the
      first of the four legitimate resolutions, not the fourth). But per the
      Promise/Code rubric, that gap is the precipitating event, not the warrant:
      the warrant is A, which fires on this principle's own project-wide merits.

Not triggers: large diff, type-system involvement, placeholder-content removal,
a paragraph of justification, "the architect found this decision interesting".

## Status

Accepted

This ADR is the companion principle that
[ADR-0056](0056-duplication-gate-as-advisory-signal.md) and
[ADR-0060](0060-doc-consistency-advisory-sensor.md) reference as the
agent-discipline reason their advisory mechanisms are safe. It does not
supersede or refine either; it records the shared relationship both express at
the hook and CI layers. It also names — it does not change — the standing
sonar-no-new-findings principle from
[ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) and
[ADR-0042](0042-agent-side-sonarcloud-findings-query.md) as another expression
of the same relationship.

## Context

The project runs an AI-first workflow that deliberately optimises for structural
enforcement over per-contributor discipline (see
[ADR-0042](0042-agent-side-sonarcloud-findings-query.md) decision drivers). A
recurring tension in that workflow is what an agent does with the **output of a
tool or check**. Two failure modes sit at the extremes:

- **The rubber-stamp.** An agent runs a check, sees it exit 0 (or sees "no new
  findings"), and reports the work complete — without confirming that the check
  actually measures the property the task cares about. A green typecheck does
  not prove a price is correct; a green duplication run does not prove no new
  clone was introduced when the gate is advisory; a passing test that asserts
  the wrong formula stays green while the formula is wrong.
- **The dead block.** A check that fails on every run carries no signal, so its
  output is ignored wholesale and the bypass becomes routine — the failure mode
  [ADR-0056](0056-duplication-gate-as-advisory-signal.md) documents for the
  duplication gate, where `git push --no-verify` became the standing path and
  the gate stopped gating.

ADR-0056 named the resolving principle but deferred recording it: its decision
drivers and risk-mitigation sections lean load-bearingly on a "companion
decision" — labelled there as "ADR-0057" — establishing that "AI agents treat a
tool result as triage input" and that the result "still requires a recorded
structural reuse check". That companion ADR was never written, and the number it
was labelled with is now claimed by an unrelated, in-flight stream, so
ADR-0056's references both dangle and collide. This ADR writes the missing
principle under a free number, and ADR-0056's references are repointed to it
(see Documentation Updates), closing the dead-reference gap.

The principle is not new behaviour invented here. It is the common thread
already running through several accepted mechanisms and agent prompts:

- The `implementer`'s Verify-Pass step runs the SonarCloud findings query "as
  the final test" and "surface[s] any existing SonarCloud findings ... so the
  orchestrator can decide whether to address them in scope, defer to a
  follow-up, or accept as the pre-existing baseline" — the tool output feeds a
  recorded judgement, it does not auto-pass the handoff (and per
  [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) the query itself does
  not block).
- The `architect`'s consumer enumeration requires grep evidence in the concept
  document because "lists from memory are the primary source of missed call
  sites" — the grep is triage input the architect must record and read, not a
  box ticked.
- The `concept-reviewer` re-checks the architect's claims adversarially rather
  than trusting the architect's "done" — it is itself a recorded second
  judgement over an upstream agent's output.
- The `verification-before-completion` skill's Iron Law — "NO COMPLETION CLAIMS
  WITHOUT FRESH VERIFICATION EVIDENCE" — forbids treating a prior or
  extrapolated result as proof. The agent must run the command, read the output,
  and only then claim — the triage relationship stated as a completion gate.
- The `local-tooling-probes` skill requires probing with the **pinned** tool
  version so a probe's finding reflects what the gate actually enforces — a
  guard against trusting a result produced by a different version surface than
  the one that gates.

The decision this ADR closes: **what is the recorded, project-wide relationship
between an AI agent and a tool or check result, so that two advisory mechanisms
and several agent prompts have a single companion principle to cite rather than
re-deriving it or pointing at a dead reference?**

### Decision drivers

- **Structural enforcement over per-contributor discipline.** The AI-first
  philosophy means the relationship between agent and tool is itself part of the
  structure, not tribal knowledge — it deserves a citable home.
- **Advisory mechanisms need a stated reason they are safe.** An advisory gate
  that never blocks (ADR-0056, ADR-0060) is only safe if the reader treats its
  output as triage. Without a recorded principle, "advisory" reads as
  "ignorable".
- **A green result is evidence about a property, not proof of the goal.** The
  distinction between "the check passed" and "the thing the task cares about is
  correct" is the rubber-stamp failure mode, and it recurs — a green test
  asserting the wrong formula, a green build over an undefined function.
- **One companion principle, many expressions.** Re-deriving the relationship in
  each ADR or agent prompt is drift surface; a single ADR the others reference
  is the lower-drift home.

### Evaluated approaches

1. **Demote the principle to prose in `docs/CONVENTIONS.md` or a paragraph in
   each referencing ADR.** Keep it as a convention entry or inline it where it
   is used. **Rejected:** the principle is cross-cutting — it is referenced by
   two ADRs as a load-bearing companion, names a maintenance principle from two
   more, and is operationalised by four agent prompts. A convention paragraph
   cannot be cited as a companion _decision_ the way ADR-0056 and ADR-0060
   already cite it, and inlining it in each consumer re-introduces the
   cross-document drift surface the project's pointer-note discipline exists to
   prevent. The Warrant Check's A trigger fires precisely because the rule is
   project-wide and multi-surface.
2. **Repoint ADR-0056's references at an existing ADR** (e.g. ADR-0042 or
   ADR-0055) that touches the same territory. **Rejected:** no existing ADR
   records _this_ relationship. ADR-0042 records the _mechanism_ for querying
   SonarCloud findings; ADR-0055 records the _skill-layer_ carrier for
   cross-cutting disciplines. Neither states the agent-to-tool-result contract
   ADR-0056 needs to cite, so pointing at them would substitute a related
   decision for the missing one and leave the actual principle unrecorded.
3. **Write the missing principle as a standalone ADR under the next free number,
   and repoint the dangling references to it. Chosen.** This records the
   cross-cutting principle once, gives ADR-0056 and ADR-0060 a real companion to
   cite, and resolves the dead reference and the number collision in one move —
   the "fulfil the promise" resolution of the promise/code gap ADR-0056 left
   open.

## Decision

Record, as a project-wide contract, the relationship between an AI agent and a
tool or check result:

**A tool or check result is triage input requiring a recorded judgement, not a
green-means-done validation stamp.**

Concretely, across the four agent roles:

- **A passing or "no new findings" result is evidence about a measured property,
  not proof that the task's goal is met.** Before claiming completion, the agent
  confirms the check measures the property the task actually cares about. A
  green typecheck, a green test, a green build, or a clean findings query is
  necessary evidence, never sufficient proof of correctness on its own.
- **An advisory output (a non-blocking hook or sensor) is read and acted on, not
  ignored because it does not block.** ADR-0056's advisory duplication output
  and ADR-0060's advisory doc-consistency findings are surfaced precisely so an
  agent triages them — reading the delta and recording a disposition (address,
  defer, or accept as baseline) — rather than treating "it didn't fail the push"
  as "there is nothing to do".
- **The triage judgement is recorded where the next reader can find it**, not
  held in an agent's head: in the concept document (the architect's
  consumer-grep evidence and structural-reuse check), in the handoff report (the
  implementer's surfaced findings for the orchestrator to dispose), in the
  review document (the reviewer's and concept-reviewer's recorded findings), and
  in the completion claim's fresh evidence (the `verification-before-completion`
  Iron Law).
- **A result is trusted only from the surface that actually gates.** Probing
  with the pinned tool version (`local-tooling-probes`) and reading the
  authoritative state from the source rather than a narrative snapshot (the
  project's git-state and stale-snapshot disciplines — `CLAUDE.md` § Git State
  Discipline) are corollaries: a result is triage input only if it reflects what
  the gate enforces.

### What does NOT change

- **No tool, hook, sensor, gate, CI step, or agent prompt changes behaviour.**
  This ADR records an existing relationship; it introduces no script, no config,
  and no new check. The advisory mechanisms of ADR-0056 and ADR-0060 keep their
  exact exit-code and CI behaviour; the implementer's findings query keeps its
  non-blocking, decide-in-handoff posture per ADR-0042.
- **The `check-*` blocking default
  ([ADR-0050](0050-script-entry-point-naming-convention.md)) is unchanged.** A
  blocking sensor still blocks; the triage principle governs how its _result_ is
  read, not whether it gates.
- **SonarCloud's PR-side analysis and the CI required status checks remain the
  mechanical authorities.** Triage discipline is the agent-side reading of tool
  output; it does not replace any mechanical gate.

### Scope and non-goals

**In scope:** the recorded, project-wide relationship between an AI agent and a
tool or check result, across the architect, implementer, reviewer, and
concept-reviewer roles; the companion-decision role this ADR plays for ADR-0056
and ADR-0060.

**Out of scope:** changing any tool, hook, sensor, gate, CI step, or agent
prompt behaviour; adding any new check; the specifics of any one mechanism's
exit-code or CI contract (those live in the mechanism's own ADR); the
page-level-accessibility stream that independently claimed a nearby ADR number
for an unrelated topic.

## Consequences

### Positive

- **Two advisory mechanisms gain a real companion to cite.** ADR-0056 and
  ADR-0060 reference a recorded principle instead of a dead or to-be-written
  one; the cross-references resolve and read coherently.
- **The dead reference and the number collision are resolved.** ADR-0056's five
  references to the missing companion are repointed to this ADR, and the
  previously-labelled number stays cleanly available for its unrelated claimant.
- **The agent-to-tool relationship has a single citable home.** Future ADRs,
  agent prompts, and conventions reference this ADR rather than re-deriving the
  principle, lowering cross-document drift.
- **The rubber-stamp failure mode has a named contract to point at.** A review
  finding can cite "ADR-0061: a green result is triage input, not proof" rather
  than arguing the point from first principles each time.

### Negative

- **The principle is a discipline, not a mechanism.** Recording it as an ADR
  does not mechanically enforce it; an agent can still rubber-stamp against the
  contract. This is the accepted residual: enforcement lives in the agent
  prompts and the `verification-before-completion` Iron Law that already
  operationalise it, not in this ADR. This ADR is the citable statement of the
  shared relationship those surfaces express.
- **One more cross-reference surface to keep coherent.** ADR-0056 and ADR-0060
  now point at this ADR, and this ADR points back; a future renumber or
  consolidation must update both directions. Mitigated by the bidirectional
  References sections and the doc-consistency advisory sensor that already
  guards the canonical-pointer surfaces.

## Documentation Updates

This ADR requires the following updates in the same set of commits as the ADR
itself:

- `docs/ARCHITECTURE.md#adr-quick-reference` — append the ADR-0061 row after the
  ADR-0060 row, in numeric order, mirroring the format of the ADR-0060 row.
- `docs/adr/0056-duplication-gate-as-advisory-signal.md` — repoint all five
  references to the missing companion ADR from `0057` to `0061`: the three full
  Markdown links
  `[ADR-0057](0057-tool-checks-as-triage-not-validation-stamp.md)` become
  `[ADR-0061](0061-tool-checks-as-triage-not-validation-stamp.md)`, and the two
  prose `ADR-0057` mentions become `ADR-0061`. The surrounding wording is
  preserved — this is a target fix, not a rewrite.

No `docs/CONVENTIONS.md` § Topic Hub Index entry is added: the Hub Index is a
task-first map for code-writing surfaces (a new component pattern, a new data
domain, a new service module), and this ADR records an agent-discipline
principle, not a code-writing surface a contributor discovers task-first. No
`CLAUDE.md` Critical Rule or Conventions Quick Reference line is added: the
principle is already operationalised in the agent prompts and the
`verification-before-completion` skill that `CLAUDE.md` points at, and this ADR
is the citable statement of that existing relationship, not a new rule
contributors must learn.

## References

- [ADR-0056](0056-duplication-gate-as-advisory-signal.md) — the advisory
  duplication gate; its decision drivers and risk-mitigation reference this ADR
  as the companion principle that makes an advisory hook safe (the contributor
  or agent reads the cluster delta as triage). Its references are repointed to
  this ADR.
- [ADR-0060](0060-doc-consistency-advisory-sensor.md) — the advisory
  doc-consistency sensor; it shares the advisory-signal lineage and expresses
  the same triage relationship at the in-script exit-0 plus non-blocking-CI
  layer.
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) — the agent-side
  SonarCloud findings query; the implementer surfaces its findings for a
  recorded orchestrator decision rather than auto-passing — an expression of
  this principle, and the home of the standing sonar-no-new-findings maintenance
  principle.
- [ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) — names the same
  sonar-no-new-findings maintenance principle this ADR generalises across all
  tool results.
- [ADR-0055](0055-skill-layer-for-cross-cutting-disciplines.md) — the
  skill-layer carrier for cross-cutting AI-working disciplines, including
  `verification-before-completion` and `local-tooling-probes`, which
  operationalise this principle as a completion gate and a pinned-version probe
  rule.
