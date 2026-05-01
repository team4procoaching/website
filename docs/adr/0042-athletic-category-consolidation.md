# Athletic Category Consolidation: `performance-ready`

Date: 2026-05-01

## Status

Accepted

## Context

The athletic service category in `src/data/services.ts` shipped two services
since the catalog's inception:

- `competition-ready` — "For combat sports and powerlifting athletes who need to
  peak for competition day."
- `level-up` — "Sport-specific training for endurance athletes, martial artists,
  and team sport players."

Coach feedback on 2026-05-01 indicates the split is unnecessary: the two
services share the same coach, the same coaching modality, the same
deliverables, and the same pricing tier. The split was originally created to
mirror the bodybuilding category's prep/off-season/posing structure, on the
assumption that athletic visitors would self-segment by sport type at the
catalog level. Real coaching conversations with athletic-segment clients have
not surfaced that segmentation — visitors arrive with their sport in mind, the
coach handles the segmentation in the first call, and the catalog page's
two-card listing forces a UX decision (which one is "for me?") that the data
does not actually answer.

The decision is to merge both services into a single `performance-ready` service
with a broader scope statement covering the union of what both predecessor
services offered. The new service's end state carries verbatim PDF-supplied copy
from the same coach feedback round, so once the overhaul completes,
`performance-ready` passes the launch-gate predicate `hasCompleteDetailContent`
and ships a detail page alongside the other seven services. The per-commit
landing sequence — in particular, whether the new service ships its detail-page
fields in the same commit that introduces the ID or in a subsequent commit
alongside the gate flip for the rest of the catalog — is a sequencing concern of
the originating concept doc, not an ADR claim.

The breaking ID rename is the structural concern. The catalog uses the ADR-0017
const-array + Record + `as const satisfies` pattern, which makes ID renames
mechanical at the type-system level — every literal-site reference to
`competition-ready` or `level-up` either fails compilation or sits in a test
fixture the test runner exercises. A new contributor six months from now reading
any of those sites needs to know why the IDs changed and that the reasoning was
a coach-side simplification, not a technical regression.

### Coach feedback (verbatim)

> _Athletic should be one service, not two. Combat-sports prep and
> sport-specific training are the same coaching surface from my side — same
> calls, same plan structure, same check-in cadence. Splitting them into two
> cards on the catalog asks the visitor to make a self-categorisation decision
> that I'd rather make with them on a call. Call the merged service "Performance
> Ready" — it covers the competition peak case and the off-stage performance
> case in one._

### Decision drivers

- **The two services were one in everything but the cards.** Pricing,
  deliverables, coach assignment, and call structure were identical — the
  catalog UI was the only place the split appeared.
- **The consolidation is reversible by writing a future ADR if the split case
  re-emerges.** The risk of moving from two→one is lower than the risk of
  inventing additional categories that turn out to share a coaching surface.
- **No external traffic exists yet.** The site is not yet public, so there are
  no inbound links, indexed pages, or social-media references to either old
  slug. The rename can be a clean code-base move without redirects (server-side
  or client-side).
- **The ADR-0017 record-completeness guarantee is the safety net.** Adding
  `'performance-ready'` to `serviceIds` and removing the two old IDs forces a
  TypeScript error at every site that references the old literals — both in
  `services.ts` itself and in the derived `Step2OptionId` union in `quiz.ts`.

### Evaluated alternatives

1. **Keep both services, sharpen the descriptions.** Rejected — the coach
   feedback is that the two cards aren't the right level of abstraction for
   athletic visitors at all, not that the descriptions are unclear. Sharpening
   the copy preserves the false dichotomy.
2. **Merge into one service, keep one of the old IDs (`competition-ready`).**
   Rejected — the new service's scope is broader than either predecessor, and
   the ID `competition-ready` carries the prep-focused connotation that the
   merged service explicitly steps back from. A neutral ID (`performance-ready`)
   signals the broader scope.
3. **Add a third athletic service (`team-sports`) to triangulate the category.**
   Rejected — there is no coach-side or visitor-side demand for the third
   service today; introducing one to "balance" the category would reverse the
   simplification this ADR documents.
4. **Merge into one service and rename to `performance-ready`.** **Chosen.**

## Decision

The athletic service category consolidates from two services
(`competition-ready` + `level-up`) to one service (`performance-ready`).

The rename is a breaking ID change. All literal-site references across the repo
are repointed in the same commit that introduces the new service. There are no
redirects (server-side or client-side) for the two deleted slug paths because no
public traffic exists.

### 1. Service-catalog changes

In `src/data/services.ts`:

- `serviceIds` drops `'competition-ready'` and `'level-up'`, gains
  `'performance-ready'`. Final list: nine entries → eight entries.
- `servicesById` drops the `'competition-ready'` and `'level-up'` records, gains
  a `'performance-ready'` record carrying the new service's name
  (`'Performance Ready'`), tagline, description, the athletic category, the
  standard three-tier pricing structure, the coach-supplied PDF copy (`lead`,
  `fitFor`, `detailedFeatures`), and three placeholder FAQ entries (sufficient
  to pass `hasCompleteDetailContent`).
- `servicesSection.highlightedServiceIds` substitutes `'performance-ready'` for
  `'competition-ready'`. The trio remains three entries:
  `['competition-prep', 'performance-ready', 'get-jacked']`.

### 2. Quiz consolidation

In `src/data/quiz.ts`:

- `step2.athletic.options` collapses from two options (`competition-ready` /
  `level-up`) to one option (`performance-ready`). The data still drives the
  option label and description even though step 2 presents only one option for
  athletic visitors (see §3) — keeping the option in the data preserves the
  type-derivation chain (`Step2OptionId` is sourced from the option IDs, and the
  `results` Record is keyed by `Step2OptionId`).
- `results['competition-ready']` and `results['level-up']` collapse into a
  single `results['performance-ready']` entry carrying the new service name
  (`Performance Ready`), tagline, and `?service=performance-ready` href.

### 3. Quiz controller auto-select-and-forward branch

In `src/scripts/quizModalController.ts`, the step-1→next handler branches on
`state.category === 'athletic'`: when the visitor selects the athletic category
at step 1, the controller calls
`populateStep2(dom, state, quizData, 'athletic')` and then programmatically
pre-selects the single `performance-ready` radio and dispatches a `change` event
on it. The dispatched event flows through the existing step-2 change listener,
which writes `state.service = 'performance-ready'` and enables the Next button.
The controller then advances to step 2 via `showStep(dom, state, 2)`. The
visitor sees step 2 rendered with the one option pre-selected and Next already
enabled, clicks Next once, and proceeds to step 3.

The branch is a single-direction edit inside the step-1→next handler. The
step-3→back handler is untouched: default back from step 3 returns to step 2,
which is the same single-option screen the visitor saw on the way in. Progress
indicators light up step-by-step (step 1 → index 0, step 2 → indices 0 and 1,
step 3 → indices 0/1/2), matching the steps the visitor actually visited. The
branch is scoped to the athletic case via a single local predicate
(`isAthleticAutoSelect`) so a reader sees one cohesive condition rather than two
coincident `=== 'athletic'` checks. The branch does not generalise to other
categories today; if a second category ever needs the same auto-select, the
predicate generalises cleanly to a one-option-step check.

### 4. Migration

**No redirects, no client-side fallback.** The site is not yet public, so no
external traffic, no indexed slug paths, and no shared private-preview URLs
depend on `/services/competition-ready` or `/services/level-up`. The
repo-internal rename is the entire migration.

If a private-preview URL with `?service=competition-ready` is in circulation,
`servicesFilterController.ts` resolves the unknown `?service=` value to the
"All" view (existing fallback in `parseServiceMap` defensive paths). No new
fallback logic is added.

### 5. Consequence sites (verified by grep at decision time)

The `competition-ready` / `level-up` literal-site sweep returned 18 sites across
four files (full output preserved in the `02-concept.md` Sweep 1 section of the
originating concept doc). All sites are repointed in the same commit:

- `src/data/services.ts` — six occurrences in `serviceIds`, `servicesById`
  (record keys, inner `id` fields, two `contactHref` sites), and
  `highlightedServiceIds`.
- `src/data/quiz.ts` — six occurrences in `step2.athletic.options` (two option
  IDs at lines 137 / 142) and `results` (two record keys at lines 280 / 285 plus
  their inner `href` strings).
- `src/utils/quizContext.test.ts` — one assertion site at line 145.
- `src/scripts/servicesFilterController.test.ts` — two literal sites at lines 15
  and 35 (fixture map key + DOM id literal).

The ADR-0017 record-completeness guarantee makes any missed site in
`services.ts` or `quiz.ts` a compile error. The two test files do not benefit
from that guarantee (no `satisfies` in the fixture data); a post-rename
`rg -n "competition-ready|level-up"` is part of the implementation handover
check.

## Consequences

### Positive

- **One service replaces two.** The catalog page surfaces a single athletic
  card, removing the self-categorisation decision the visitor was being asked to
  make. The merge tracks the coaching-surface reality.
- **Quiz step 2 collapses for athletic.** Visitors who pick athletic at step 1
  see a step 2 with one option already pre-selected; one click on Next advances
  them to step 3 (experience).
- **The breaking ID rename is mechanical at the type-system level.** ADR-0017's
  record-completeness guarantee makes any missed rename in `services.ts` or
  `quiz.ts` a compile error; the test-file sites are swept and verified by a
  final grep.
- **No redirect debt.** The site is pre-launch, so the rename ships without a
  `_redirects` rule or a client-side fallback to maintain forever.

### Negative

- **The new service's scope is broader than either predecessor.** A visitor
  whose mental model was "competition-ready = combat-sports prep" or "level-up =
  endurance training" sees a single `performance-ready` card and may not
  immediately recognise their case. The PDF copy explicitly enumerates both
  axes, so the recognition cost is bounded to a few seconds of read time.
- **Athletic visitors click Next once on a single-option step 2.** The
  controller pre-selects the only `performance-ready` option and enables Next,
  so the visitor's interaction is reduced to one click on an already-decided
  screen. This is functional friction, not a decision prompt — the option is
  visibly pre-selected and the next action is obvious. The trade-off accepted
  here is one redundant click in exchange for an accurate progress indicator
  (each lit segment maps to a step the visitor actually visited) and a simpler
  controller (single-direction edit in step-1→next, no mirror in the back
  handler). An alternate UX (skip step 2 entirely and jump straight to step 3)
  would remove the click but light indicator 2 before the visitor visits step 2;
  this ADR commits to the auto-select-and-forward path, and the alternative
  remains reversible if visitor feedback ever surfaces the redundant click as
  friction worth removing.
- **The two old slug paths (`/services/competition-ready` and
  `/services/level-up`) are gone with no fallback.** If a private-preview URL is
  in circulation, it lands on `/services/[slug]`'s 404 (or, for the catalog
  deep-link form `?service=competition-ready`, silently degrades to the "All"
  view). Accepted because the site is not yet public.

### Risk mitigation

- **A future visitor segment surfaces a real prep / sport-specific split.** A
  new ADR can re-introduce a second athletic service without superseding this
  one — the catalog already supports multi-service categories (bodybuilding has
  three). The `performance-ready` scope statement does not foreclose the option.
- **A returning private-preview visitor lands on the deleted slug.** The
  `/services/[slug]` route's `getStaticPaths` filters via
  `hasCompleteDetailContent`, so the deleted slug returns a 404 (404 page
  exists; it does not crash). For the deep-link form
  `?service=competition-ready`, the `servicesFilterController` resolver falls
  through to "All" silently — already the documented contract for unknown
  service IDs.

## References

- [ADR-0017](0017-domain-data-integrity-pattern.md) — the const-array + Record +
  `as const satisfies` pattern that makes the breaking ID rename mechanical at
  the type-system level. Removing `'competition-ready'` and `'level-up'` from
  `serviceIds` and adding `'performance-ready'` forces every literal-site
  reference in `services.ts` to fail compilation; the derived `Step2OptionId` in
  `quiz.ts` propagates the same constraint to the `results` Record.
- [ADR-0038](0038-dynamic-detail-route-pattern.md) — the launch-gate predicate
  (`hasCompleteDetailContent`) lives in `services.ts`; `performance-ready`'s
  end-state record carries verbatim PDF copy meeting every threshold so it
  passes the gate once the overhaul completes. ADR-0038 §2's
  threshold-tunability paragraph
  (`The predicate's threshold is tuned per domain by the owner`) also covers a
  parallel edit happening in the same overhaul: `notFitFor.length >= 2` is
  removed from the threshold list.
- `src/data/services.ts` — the consolidated catalog post-overhaul.
- `src/data/quiz.ts` — `step2.athletic.options` collapses to one entry;
  `results['performance-ready']` replaces the two old keys.
- `src/scripts/quizModalController.ts` — athletic auto-select-and-forward branch
  in the step-1→next handler.
- `.claude/work/2026-05-01-services-data-overhaul/02-concept.md` — full consumer
  sweep (Sweeps 1–4) and per-commit blast-radius audit. Worktree-local; not
  preserved on main after merge.
