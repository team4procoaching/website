# StatsGrid stagger cap follow-ups — ADR Quick Reference cleanup

Recorded: 2026-05-01

## Origin

PR #172 added ADR-0040 (Length-constrained domain tuple types) to the ADR Quick
Reference table in `docs/ARCHITECTURE.md`. The row was appended directly after
`0036` because rows for `0037` (Astro Container API for Component Tests,
Accepted 2026-04-24) and `0038` (Dynamic Detail Route Pattern, Accepted
2026-04-25) had never been backfilled when their respective PRs landed.

The visible jump from `0036` to `0040` in the table is now a structural artefact
in `main`. Backfilling 0037 and 0038 sits outside the StatsGrid stagger-cap
scope of PR #172, so it is recorded here as a separate follow-up to keep that PR
atomic.

## DEBT-260501-03 — ADR Quick Reference table skips 0037 and 0038

**Finding.** `docs/ARCHITECTURE.md` § ADR Quick Reference jumps from row `0036`
(Content-aware slot detection) directly to `0040` (Length-constrained domain
tuple types). ADR-0037
(`docs/adr/0037-adopt-astro-container-api-for-component-tests.md`, Accepted) and
ADR-0038 (`docs/adr/0038-dynamic-detail-route-pattern.md`, Accepted) exist as
files in the repo but have no row in the index of record.

**Why it matters.** The Quick Reference is described in the surrounding prose as
"the index of record for _all_ ADRs". A reader scanning the table for the
container-API decision or the dynamic-detail-route pattern will not find either,
and the visible gap in numbering invites the false reading that 0037 and 0038
were skipped or withdrawn.

**Suggested resolution.** Add two rows in numeric order between the existing
`0036` and `0040` rows: one for ADR-0037, one for ADR-0038, each with Decision,
Status, and a one-line Key Insight matching the column conventions of the
surrounding rows.

**Effort.** XS — two table rows, no prose changes elsewhere.
