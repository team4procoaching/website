# Drop notFitFor field from service schema

Date: 2026-05-03

## Status

Accepted

## Context

The service detail page (`/services/[slug]`) carried a two-column "Who this is
for" section: a positive list rendered from `service.fitFor` and a negative list
rendered from `service.notFitFor`. The negative list was a copy-led idea that
did not survive the conversion review. Three IFBB Pro coaches directed the
negative-list surface to be dropped.

The empirical state at the time of this decision:

- Of the eight services in `~/data/services.ts`, only `competition-prep` has
  `notFitFor` populated, and every entry there is explicitly marked
  `Placeholder — …`. The other seven services do not pass the launch-gate
  predicate `hasCompleteDetailContent` and do not render a detail page today, so
  the negative list is invisible in production for all but one service.
- The launch-gate predicate `hasCompleteDetailContent` enforces
  `notFitFor.length >= 2`. Any future content backfill that lands a service
  without `notFitFor` would silently fail the gate. With the negative list
  removed at the rendering layer, the arity threshold has nothing to gate.
- The conversion review (`01.5-conversion-analysis.md`) recorded that the filter
  functions the negative list nominally provided (self-filter,
  expectation-setting, trust signal, objection pre-empt) are absorbed by
  surfaces that survive the drop: Hero lead specificity, `fitFor` specificity,
  pricing-as-implicit-filter, the Free-Consultation step, and the FAQ accordion
  as the proactive objection-handling surface.

The schema therefore carries a field that has no rendering site, no live content
beyond placeholders, and a launch-gate threshold that would block content
backfill instead of unblocking it. Removing the field at the type level is the
structural answer.

### Decision drivers

- **Dead schema is worse than missing schema.** Carrying an optional field with
  no rendering site invites future contributors to fill it back in without
  re-opening the coach decision.
- **Type-system signals are stronger than JSDoc.** With `notFitFor` gone from
  the `Service` type, future content backfill cannot accidentally populate the
  field; with it kept-but-unrendered, JSDoc-only deprecation signals would be
  ignorable.
- **Launch-gate semantics must match render reality.** A predicate that enforces
  `notFitFor.length >= 2` while no consumer renders `notFitFor` is a structural
  lie.
- **Reversibility cost is contained.** If coaches reverse the decision in six
  months, re-adding an optional field to `Service` is one type-edit plus a
  re-render of the column. The placeholder content is already in git history;
  recovery is mechanical.

### Evaluated approaches

1. **Keep `notFitFor` optional at the schema layer; render nothing.** Rejected.
   Reversibility advantage (the field stays available for a future
   re-introduction) is outweighed by the dead-schema cost. Future content
   authors would have to be told "do not populate this field even though the
   type accepts it" — a documentation-only constraint that JSDoc cannot enforce.
2. **Drop only the rendering markup; keep the schema.** Rejected for the same
   reason as (1), with the added structural lie that `hasCompleteDetailContent`
   would still demand `notFitFor.length >= 2` before showing a detail page.
3. **Drop the rendering, drop the schema, drop the predicate threshold. Add a
   forward-pointer to ADR-0038 (`Dynamic detail route pattern`), whose §2
   currently lists the `notFitFor.length >= 2` threshold. Chosen.**

## Decision

The `notFitFor` field is removed from the service schema in three coordinated
layers.

### What changes

- **`Service` type** in `~/data/services.ts` loses the optional
  `notFitFor?: readonly string[]` property and its JSDoc.
- **`ServiceWithCompleteDetailContent`** in the same module loses the
  corresponding `notFitFor: NonNullable<Service['notFitFor']>` slot. The
  narrowed type now requires `lead`, `detailedFeatures`, `fitFor`, and `faq`
  (four fields, not five).
- **`competition-prep`** entry in `servicesById` loses its placeholder
  `notFitFor` array.
- **`hasCompleteDetailContent` predicate** drops the
  `(service.notFitFor?.length ?? 0) >= 2` clause and the corresponding JSDoc
  bullet from its threshold list. The predicate now checks five field-arity
  thresholds rather than six (lead non-empty, `detailedFeatures.length >= 3`,
  `fitFor.length >= 3`, `faq.length >= 3`, `pricing.length >= 1`).
- **`ServiceWhoIsFor.astro`** rendering site loses the negative column and the
  surrounding `lg:grid-cols-2` wrapper. Layout reshape is documented in the same
  task's concept doc; the surviving positive list adopts a single-column
  `max-w-3xl` shape per UX-Mockup A2.
- **Test fixtures** (`buildServiceFixture` in `~/test-utils/fixtures`, inline
  `validNotFitFor`/`completeService` constants in `services.test.ts`, the
  count-based assertion in `serviceWhoIsFor.test.ts`) lose every reference to
  `notFitFor`.

### Residual JSDoc-level conventions

The filter-load that the negative list nominally carried migrates onto surfaces
that already exist on the page. Two conventions are recorded as JSDoc on the
surviving fields:

- **`Service.lead`** — the per-service Hero lead carries one specific filter
  half-sentence (e.g., "Built for X with Y; not the right fit if you are still
  at Z" or equivalent inline filter clause). This is a copy convention upheld by
  the owner when authoring leads, not a type-level constraint.
- **`Service.faq`** — the first entry (`faq[0]`) is treated as the
  eligibility/fit-anchor entry. The page surfaces `faq[0]` in an inline
  highlight component above the accordion (introduced by the same task), with
  the accordion below still listing every entry including the highlighted one.
  The convention guarantees the right slot for the highlight; the page does not
  detect "is this an eligibility question" at runtime.

These conventions are intentionally JSDoc-level rather than type-level.
TypeScript cannot express "lead contains a filter clause" or "first FAQ entry is
an eligibility anchor" without a complexity that does not pay back at the
project's scale. The trade-off (typed guarantee vs. flexibility for the owner's
natural copy authoring) is accepted explicitly here.

### What does NOT change

- **`Service.fitFor`** — the positive list is unchanged. Its JSDoc already
  records the timing/situation-framed convention; this ADR does not extend it.
- **`hasCompleteDetailContent`** is still the launch-gate predicate. Its
  location, naming, and type-guard semantics are unchanged.
- **The `as const satisfies Record<ServiceId, Service>` data-integrity pattern
  (ADR-0017)** survives intact. Removing one optional property does not weaken
  the compile-time completeness guarantee on `servicesById`.
- **The dynamic detail route pattern (ADR-0038)** is unchanged in shape. Only
  its launch-gate threshold list is corrected.
- **`competition-prep`'s remaining placeholder copy** in `lead`,
  `detailedFeatures`, `fitFor`, `faq` stays in place. Cleanup of those
  placeholders is the broader content backfill, scoped to a separate task.

### Why no second ADR for the FAQ inline highlight

The FAQ inline-highlight component (`ServiceFaqHighlight.astro`) introduced by
the same task is a routine extraction under ADR-0034
(`Extract-First for AI-Assisted Development`). It carries typed data (`FaqItem`
from `~/data/howItWorks`), it sits in `src/components/sections/services/` next
to four sibling section components that follow the same shape, and it has one
consumer. No recurring decision is being lifted, no novel pattern is established
— it is one more typed component in a folder of typed components. The "first FAQ
entry is the eligibility anchor" rule is a copy convention recorded as JSDoc on
`Service.faq` (above) and does not require its own ADR. If a future surface
adopts the same "highlight item 0" pattern at its second consumer site, that
task's architect lifts the convention into a dedicated ADR; today's one-consumer
surface does not pre-empt that.

## Consequences

### Positive

- **Dead schema is gone.** No future contributor can populate `notFitFor`
  accidentally, because the field no longer exists on the type.
- **Launch-gate predicate matches render reality.** No service can be blocked
  from a detail page by an arity threshold whose underlying field has no
  rendering site.
- **Page rhythm tightens.** The single-column `max-w-3xl` "Who this is for"
  section reads as one focused block instead of a half-empty two-column grid.
- **Stream-B alignment.** The companion stream `feat/services-data-overhaul`
  carried a parallel commit
  (`5c8b316 refactor(services): drop notFitFor field from service catalog`) that
  performed the same schema removal at a smaller scope. After this ADR's task
  lands first (per the planned merge order), B's commit becomes a no-op on
  rebase against `main` and drops cleanly.

### Negative

- **Filter-load redistribution leans on copy conventions.** The filter functions
  the negative list nominally provided now have to be carried by the Hero lead,
  `fitFor` specificity, pricing, the Free-Consultation step, and the FAQ inline
  highlight. Conventions on `lead` and `faq[0]` are JSDoc-level, not
  TypeScript-level — future contributors not yet onboarded to those conventions
  can still write a generic Hero lead or a non-eligibility `faq[0]` without
  TypeScript pushing back. The ADR plus inline JSDoc carry the documentation;
  the trade-off is accepted as the cost of keeping copy authoring flexible.
- **Reversibility cost is small but non-zero.** If coaches reverse the decision
  in six months and ask for the negative list to come back, re-introducing the
  field is one type-edit plus a re-render of the column plus a re-introduction
  of the predicate threshold. The placeholder content is in git history;
  recovery is mechanical but not free.
- **No empirical baseline.** The decision to drop is a coach-judgement call, not
  a data-backed call — the site has no analytics, no tracking, no engagement
  data on the negative list (recorded in `01.5-conversion-analysis.md` §6).
  Future evaluation of the decision will be qualitative or operational
  (mismatch-call rate reported by the coach team), not quantitative.

### Risk mitigation

- **Cascade-via-builder for test fixtures.** The four sibling section tests in
  `sections/services/` (`serviceDetailHero.test.ts`,
  `serviceWhatsIncluded.test.ts`, `serviceSocialProof.test.ts`,
  `servicePricingBlock.test.ts`) consume `buildServiceFixture` from
  `~/test-utils/fixtures` rather than inline `notFitFor` literals. Removing the
  field from the builder cascades into all four sites automatically — no
  per-file edit needed, and no risk of one site drifting back into a
  `notFitFor`-shaped fixture.
- **Catalog-level eligibility assertion stays as the regression guard.**
  `services.test.ts` retains the assertion
  `services.filter(hasCompleteDetailContent).map(s => s.id)` equals
  `['competition-prep']`. This is the single source of truth for "which detail
  pages exist"; a regression that flips a service in or out of the gate trips
  this test before any other.

## Documentation Updates

This ADR's introduction is paired with the following document edits in the same
task:

- `docs/adr/0038-dynamic-detail-route-pattern.md#2-launch-gate-predicate-co-located-with-the-data`
  — drop `notFitFor.length >= 2,` from the threshold-list bullet at line 141;
  append "See ADR-0045 for the rationale." to the same paragraph as a
  forward-pointer.
- `docs/ARCHITECTURE.md#adr-quick-reference` — add a row for ADR-0045 with the
  same column shape as the surrounding rows (`#`, `Decision`, `Status`,
  `Key Insight`). The same commit also backfills the missing rows for ADRs 0041,
  0042, and 0043 (already merged on main, table not yet updated) so the Quick
  Reference does not jump 0040 → 0044 → 0045 across an
  existing-merged-but-untabled stretch.

No edit to `CLAUDE.md`, `docs/CONVENTIONS.md`, or `docs/AGENTS.md` is required.
The schema removal does not change a Critical Rule, does not introduce or alter
a coding convention at the document level, and does not affect the agent-flow.

## References

- `.claude/work/2026-05-02-services-detail-revision/01-requirements.md` — Phase
  1 requirements doc with the coach directive, F1–F12 acceptance tests, and the
  merge-order analysis.
- `.claude/work/2026-05-02-services-detail-revision/01.5-conversion-analysis.md`
  — Conversion-specialist analysis of the drop, including the filter-load
  redistribution map and the empirical-evidence gap.
- `.claude/work/2026-05-02-services-detail-revision/01.5-ux-mockup.md` —
  UX-mockup A2 binding; FAQ-visibility analysis; component inventory.
- `.claude/work/2026-05-02-services-detail-revision/01.6-conversion-tailwindplus-block-eval.md`
  — Tailwind-Plus block evaluation; "do not introduce" verdict.
- [ADR-0017](0017-domain-data-integrity-pattern.md) —
  `as const satisfies Record<>` data-integrity pattern; preserved by this
  change.
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) — Extract-First
  policy; covers the FAQ inline-highlight component introduced by the same task.
- [ADR-0036](0036-content-aware-slot-detection-in-forwarded-slots.md) — Slot
  render-and-trim rule; not triggered by this change (no slots introduced or
  modified).
- [ADR-0038](0038-dynamic-detail-route-pattern.md) — Dynamic detail route
  pattern; launch-gate predicate threshold list updated by this ADR's paired
  task edit.
- `src/data/services.ts` — `Service` type, `ServiceWithCompleteDetailContent`,
  `hasCompleteDetailContent`, `competition-prep` entry.
- `src/components/sections/services/ServiceWhoIsFor.astro` — rendering site of
  the dropped column.
- Owner decision recorded 2026-05-03 — the UX-approval-gate decisions Q1–Q7 in
  the Phase-1 requirements doc are the source for the drop direction and the
  residual conventions.
