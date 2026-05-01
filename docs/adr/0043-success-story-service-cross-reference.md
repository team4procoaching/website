# Cross-Reference Success Stories at the Service Level

Date: 2026-05-01

## Status

Accepted

## Context

Success stories on `src/data/successStories.ts` carry a `program: ProgramId`
field where `ProgramId` is the union
`'competition-prep' | 'lifestyle' | 'muscle-building'`. This three-value
taxonomy was a bespoke story-side classification that pre-dates the current
services catalog. It has two properties that matter for this decision:

1. `ProgramId` is **not** a `ServiceId`. Of the three values, only
   `'competition-prep'` overlaps a real service ID
   (`servicesById['competition-prep']`). The other two (`'lifestyle'`,
   `'muscle-building'`) are coarse program-category labels with no
   service-catalog equivalent.
2. The story-side taxonomy is consumed at exactly three sites: the
   `programLabels` map (display names), the homepage slider card
   (`SuccessStoryCard.astro`), and the overview-grid card
   (`SuccessStoryGridCard.astro`). The detail page (`/success-stories/[slug]`)
   reads `programLabels[story.program]` via the page frontmatter and forwards it
   into `SuccessStoryHero.astro`.

The home-success-stories restructure (this stream) introduces a coach-requested
visual: each success-story card carries a **clickable service link** that
resolves to the corresponding service. The coach feedback verbatim:

> the service name (comp prep or wellness and this should be a clickable link to
> that service)

A clickable service link cannot be derived from `ProgramId`. Two of the three
values do not name a service. Even for the value that overlaps, the link target
is not a function of the program category — it is a function of the service the
story was actually coached against. Sarah M. is `program: 'lifestyle'`; the
service she actually used (Gina, sustainable fat-loss) is `get-lean`, not the
absent `'lifestyle'` service.

A typed cross-reference from a `SuccessStory` to a `Service` is needed. The
service-name link can then resolve via `serviceDetailHref(id)` when the service
has complete detail content, else `contactHref` — the same routing shape
ADR-0010-style consumers already use.

### Forces

- Compile-time guarantee that every story names a real service. No silent drift
  when the services catalog evolves (Stream B is renaming two athletic services
  in parallel; the cross-reference must catch a stale link target as a
  TypeScript error, not a runtime miss).
- One field per concern. Two parallel taxonomies (`program` and `serviceId`)
  with overlapping semantics is a debt source — the reader who sees
  `program: 'lifestyle'` and `serviceId: 'get-lean'` on the same story has no
  way to tell which is authoritative.
- The detail page's program-badge rendering (`SuccessStoryHero` shows
  `programLabels[story.program]`) needs a path that does not depend on the
  retired field.

### Evaluated approaches

1. **Add `serviceId: ServiceId` alongside `program: ProgramId`.** Rejected. Two
   fields with overlapping semantics. Both consumers and authors must reason
   about which one is authoritative for a given surface; the answer is
   surface-specific and brittle. The display label question still has two
   sources: `programLabels[story.program]` vs.
   `getServiceById(story.serviceId).name`.
2. **Map `program → ServiceId[]` and pick a representative at render time.**
   Rejected. The mapping is one-to-many for two of three values (`'lifestyle'`
   covers `get-lean`, `beginner`, `busy`; `'muscle-building'` covers
   `get-jacked`, `off-season`). A render-time pick is non-deterministic without
   a tiebreaker rule; encoding the rule somewhere defeats the simplification.
   Worse, the link target depends on the actual service the story was coached
   against, which is information `program` does not carry.
3. **Replace `program: ProgramId` with `serviceId: ServiceId` outright.**
   **Chosen.** One field, one source of truth. Display names come from
   `getServiceById(serviceId).name`. The display question is answered by the
   services catalog, not by a parallel label map. Story authors pick the service
   they actually coached against — the same axis the coach link already needs.

## Decision

The `SuccessStory` type's `program: ProgramId` field is replaced with
`serviceId: ServiceId`. Display labels resolve via
`getServiceById(story.serviceId).name`. The `programIds` array, `ProgramId`
type, and `programLabels` map are removed.

The single-step replacement is supported by the
`as const satisfies Record<ServiceId, Service>` completeness guarantee in
`src/data/services.ts` ([ADR-0017](0017-domain-data-integrity-pattern.md)):
every story's new `serviceId` value must name a real entry in `servicesById`,
and TypeScript catches a typo or a renamed service ID at compile time. No
runtime mapping table is needed. No `as const satisfies Record<>` lift on
`successStories` itself is part of this decision — stories remain a
`readonly SuccessStory[]` because they are a flat display array without ID-keyed
cross-references on the story side
([ADR-0017](0017-domain-data-integrity-pattern.md) explicitly exempts simple
display arrays).

### Migration mapping

The six existing stories migrate as follows. The pick is "what service did this
client actually receive", not "what coarse category does this story belong to":

| Story      | Old `program`      | New `serviceId`    | Reasoning                                                                                                            |
| :--------- | :----------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------- |
| Amanda R.  | `muscle-building`  | `get-jacked`       | 12 lbs lean muscle gained at 40+ with Irene; wellness muscle-building, not a competitor.                             |
| Dana T.    | `muscle-building`  | `get-jacked`       | "+8 lbs muscle, dropped 15 lbs fat" at 52 with Irene; wellness muscle-building, not contest-prep.                    |
| Jessica K. | `competition-prep` | `competition-prep` | "First Bikini Competition Win" with Helle; direct match — same id, same surface.                                     |
| Maria L.   | `competition-prep` | `competition-prep` | "Figure Competition Top 3" with Helle; direct match.                                                                 |
| Rachel W.  | `lifestyle`        | `get-lean`         | "Complete lifestyle overhaul" with Gina; the closest wellness service for "lost weight + new lifestyle" is Get Lean. |
| Sarah M.   | `lifestyle`        | `get-lean`         | "Lost 30 lbs", "relationship with food and fitness" with Gina; matches Get Lean's "strategic fat loss, sustainable". |

### Consequence on `relatedStoriesFor`

`relatedStoriesFor` (in `src/data/successStories.ts`) builds the related-stories
cascade from three buckets ranked by closeness: same program, then same coach +
different program, then any other detail story. With the field rename, the
bucket comparisons become `s.serviceId === current.serviceId` and
`s.serviceId !== current.serviceId`. Bucket semantics are unchanged — "same
domain on the story-side cross-reference axis" — only the field name shifts. The
function's docstring updates accordingly.

### Consequence on `[slug]` page

`src/pages/success-stories/[slug].astro` reads `programLabels[story.program]`
and forwards into `SuccessStoryHero.astro` as `programLabel`. After this
decision the page reads `getServiceById(story.serviceId).name` instead. The hero
component contract (`programLabel: string`) is preserved as-is — it accepts a
resolved label, not a lookup key. The component's prop name is left as
`programLabel` because it remains semantically correct ("the program-or-service
label displayed in the hero badge"); renaming to `serviceLabel` is a separate
concern (debt-register if surfaced).

### Consequence on tests

`src/data/successStories.test.ts` constructs synthetic stories with
`program: 'lifestyle' | 'muscle-building' | 'competition-prep'` literals. Test
fixtures migrate to `serviceId: ServiceId` literals. `relatedStoriesFor`
behaviour assertions (bucket order: same-program first, then same-coach, then
other-detail) are renamed to "same-service first" but otherwise unchanged in
semantics — the cascade produces the same ordering on the new field name.

### What does NOT change

- The `SuccessStory` type's other fields (`name`, `beforeImage`, `afterImage`,
  `transformation`, `coach`, `quote`, `duration`, `slug`, `age`, `detail`) are
  unchanged.
- The `StoryDetail` long-form schema (`startingPoint`, `turningPoint`,
  `processStats`, `results`, …) is unchanged.
- The `hasDetailPage` type guard, the `successStoryDetailHref` URL helper, and
  the `successStoriesSection` homepage configuration are unchanged at the type
  level. The section configuration gains a separate `highlightedSuccessStoryIds`
  field as part of the home-restructure stream; that addition is concept-scope,
  not ADR-scope.
- Stories without a service-mapped coaching context cannot be authored under
  this decision. All six existing stories map cleanly; the constraint matches
  the editorial reality (every story is the result of a service the team
  actually offers).

## Consequences

### Positive

- One axis for the story-to-service relationship. The clickable service link in
  the new card surface, the program-badge label on the detail page hero, and the
  related-stories bucket comparison all read from the same field.
- Compile-time guarantee that every story names a real service. The
  `as const satisfies Record<ServiceId, Service>` completeness guarantee in
  `services.ts` makes a typo or a renamed service ID a build break, not a
  runtime miss.
- The retired `programLabels` map removes a parallel display-label source.
  Service display names live in one place (`servicesById[id].name`).
- Stream B's athletic-services consolidation is safe in either merge order. None
  of the six existing stories map to `competition-ready` or `level-up`, so a
  Stream B → Stream A2 merge does not require story re-mapping; an A2 → B merge
  sees Stream B rename only the two athletic IDs (which no story uses).

### Negative

- Single-step replacement migrates every existing story atomically. The commit
  that lands the type rename also lands the data updates and the consumer
  updates; rollback is one commit, but a partial rollback is not possible.
  Mitigation: the pre-existing `as const satisfies` guarantee catches any missed
  call-site at build time, so the commit fails loudly if the migration is
  incomplete.
- Two stories collapse onto the same service ID (Amanda R. + Dana T. →
  `get-jacked`; Rachel W. + Sarah M. → `get-lean`). The related-stories cascade
  therefore links Sarah M.'s page to Rachel W. via the same-service bucket,
  where today the same-program bucket already produces this pair.
  Behaviour-equivalent.
- The display-label change is editorial. `'Lifestyle Transformation'` (old
  `programLabels.lifestyle`) becomes `'Get Lean'` (the service name) on the
  detail-page hero badge for Sarah M. The badge wording shifts from a category
  label to a service name. This is a deliberate consequence of unifying the
  cross-reference: the badge is now telling the reader what service the client
  actually used, which is a more concrete signal than the coarse category.
  Owner-aware editorial change.

### Risk mitigation

- **Stream B merge collision.** Stream B renames `competition-ready` and
  `level-up` to `performance-ready`. None of the six existing stories use those
  IDs; the merge is safe in either direction. New stories authored after Stream
  B lands name `performance-ready` directly.
- **Future story authoring.** A new story authored against a service category
  that does not yet have a service entry must wait for the service to land. This
  is the desired discipline — stories advertise services that exist.

## References

- [ADR-0017: Domain data integrity pattern](0017-domain-data-integrity-pattern.md)
  — the `as const satisfies Record<>` guarantee that makes the rename loud at
  compile time.
- [ADR-0034: Extract-first for AI-assisted development](0034-extract-first-for-ai-assisted-development.md)
  — the policy that justifies the new `SuccessStoryOverviewCard` and
  `SuccessStoryReadMoreModal` components introduced in the same concept.
- [ADR-0027: Invokers API as modal trigger standard](0027-invokers-api-modal-trigger-standard.md)
  — the modal-trigger contract the new read-more popup builds on; the
  service-link inside the popup uses the resolved
  `getServiceById(story.serviceId).contactHref`.
- [ADR-0038: Dynamic detail route pattern](0038-dynamic-detail-route-pattern.md)
  — the `serviceDetailHref(id)` helper used by the service link when
  `hasCompleteDetailContent(service)` returns true.
