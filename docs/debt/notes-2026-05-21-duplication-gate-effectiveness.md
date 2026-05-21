# Duplication Gate Effectiveness (2026-05-21)

[ADR-0045](../adr/0045-local-jscpd-duplication-gate.md) introduced the local
`pnpm check:duplication` pre-push gate as the fourth local-prevention layer. The
gate hard-fails on any duplication cluster meeting its threshold. It activated
with a documented day-one inventory of 13 pre-existing clusters; ADR-0045 placed
the cleanup of that inventory explicitly out of scope, with each cluster to be
cleared by a separate follow-up. Once the inventory was cleared, the gate would
fail only on genuinely new duplication.

That end state has not been reached. A `pnpm check:duplication` run on
2026-05-21 reports 13 clones across `src/` and `scripts/` (0.49% duplicated
lines against a 0% threshold) — the gate fails. The cluster set has drifted as
code changed (the `SuccessStoryCardBody` partial, for one, cleared the day-one
astro-template cluster), but the running total has never reached zero, so the
gate has never produced a clean pass.

This document is a `notes-` bundle, not an `audit-` report — it captures a
gate-effectiveness observation recorded after PR #225.

## DEBT-260521-01 — Permanently-failing `check:duplication` gate produces no actionable signal

### Why this is debt

A pre-push gate that fails on every push carries no signal. A contributor cannot
distinguish a newly-introduced duplication cluster from the standing day-one
baseline — the failure output looks the same either way. The
`git push --no-verify` bypass, which ADR-0045 intends as an emergency escape
hatch, becomes the routine path, and with it the gate stops gating.

PR #225 is the concrete cost. A deliberately byte-mirrored validation module
introduced a new ~32-line duplication cluster. The local pre-push gate could not
surface it: a red-to-red transition is not a change a contributor can read off
the output. The new cluster was caught only by SonarCloud's PR-side CPD analysis
after the push, which cost a full extra rework cycle and left the PR red in the
interim.

The local gate is not the last line of defence — SonarCloud's PR-side
duplication metric still catches what the local gate misses, as it did for PR
#225. The harm is therefore bounded to lost rework cycles and a
habitually-bypassed gate, not duplication reaching production. That bound is why
this is debt rather than a blocker — and it is registered as `major` rather than
`minor` because a prevention layer the project deliberately built (ADR-0045) has
stopped functioning, a different class of problem than the cosmetic and
convention items the register otherwise holds.

### Resolution direction

The goal is a gate that produces a meaningful signal again. The disposition is
left to the follow-up that picks this up; two broad directions exist:

1. **Clear the baseline to green.** Disposition every remaining day-one cluster
   — real-duplication refactor, shared test-builder extraction, domain-data
   acceptance documentation, astro-template partials — so the gate fails only on
   new duplication. This is the cluster-side view of the same backlog ADR-0045
   deferred as per-cluster follow-ups.
2. **Restructure the gate so the baseline is excluded from the signal.** A
   baseline or ignore mechanism, or a delta-aware check that compares against
   the merge base, would let the gate fail only on newly-introduced clusters
   without first clearing the standing inventory.

The choice is a design decision and warrants a concept before implementation. A
change to the gate's threshold, mode, or scope additionally engages ADR-0045's
threshold-stability contract and requires an ADR-0045 Status update or a
successor ADR.

### Exit condition

The item closes when `pnpm check:duplication` either passes on an unchanged
working tree, or fails only on duplication introduced by the branch under test —
in both cases producing a signal a contributor can act on without consulting the
day-one baseline.

### Estimated effort

Medium to large, depending on the chosen direction. Clearing the baseline spans
several clusters across distinct disposition categories; restructuring the gate
is smaller but engages the ADR-0045 contract. Either path is a concept-first
stream, not a quick fix.

### Suggested trigger to pick up

Any of the following warrants picking this up:

- A second incident where SonarCloud's PR-side CPD catches a duplication cluster
  the local gate could have surfaced but did not.
- A contributor reports routinely passing `git push --no-verify` to get past the
  gate.
- Any stream that revisits the local-prevention tooling or the pre-push hook
  configuration.
