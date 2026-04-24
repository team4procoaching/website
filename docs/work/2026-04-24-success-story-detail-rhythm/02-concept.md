# Concept: Success-Story Detail Page — Narrative Rhythm Background Cycle

**Task ID:** 2026-04-24-success-story-detail-rhythm **Requirements:**
`docs/work/2026-04-24-success-story-detail-rhythm/01-requirements.md` **Date:**
2026-04-24 **Status:** Draft (second amendment after round-2 concept-review)

---

## Summary

Apply the six-variant `SectionBackground` system (ADR-0014) to
`src/pages/success-stories/[slug].astro`, producing the twelve-row "narrative
crescendo" rhythm decided in Stage-A and re-shaped as Variant W after
concept-review. The rhythm opens neutral, alternates breath/problem through the
narrative middle, parks the result grid on `default` in deference to
`StatsGrid`'s documented dark-background constraint, moves the reader-pickup to
`muted` to relocate the unavoidable CoachCard dead-transition, holds the final
pull-quote on `default` for calm, and delivers a single light-mode beat on
`charcoal` at the CTA before a neutral exit.

One sub-component — `SuccessStoryHero` — gains an optional
`background?: SectionBackground` prop (default `'default'`) so the hero's outer
`<section>` reaches the token map instead of holding a second hardcoded
`bg-background dark:bg-background-dark` class pair. `SuccessStoryResultsGrid` is
unchanged in behaviour: row 7 on `default` is delivered by the component's inner
`<Content>` invocation whose own default is `'default'`. The invocation
additionally receives a JSDoc comment pinning that implicit default-propagation
contract, so any future refactor that would silently move row 7 off `default`
now has an explicit tripwire at the call site.

The page-level CTA at row 11 additionally receives `variant="glass"` on its
inner `<Cta>` invocation — not an API change, a one-liner at the call site —
because `Cta`'s default `variant="dark"` is documented for light sections and
collapses into a `charcoal` surface. The glass branch also swaps the inner
`CtaButton` variant from `secondary` (white outlined) to `primary` (filled
accent) at `CTA.astro:123`; this is pre-existing `Cta`-component behaviour and
is recorded here so the AC 9 browser check expects the visible button-colour
change.

The dark-mode rhythm is explicitly accepted as light-mode-only: in dark mode the
`charcoal` beat falls back to `bg-background-dark` (per the existing variant map
at `sectionStyles.ts:32`), and the rhythm reads identically to today. The owner
accepted this on 2026-04-24 per the homepage precedent
(`src/pages/index.astro:99–122` threads `muted`/`silver`/`sage`/`charcoal`
through five sections, all of which collapse to `bg-background-dark(-muted)`
adjacencies in dark mode).

The change is pure markup and token-map application plus one JSDoc comment. No
new abstractions, no new tokens, no new ADR, no scripts touched, no
slot-forwarding semantics touched, no data-module changes.

---

## Solution Classes Considered

The two remaining sub-problems (hero prop addition; page-level rhythm
application) each admit a narrow range of structural choices. The third
sub-problem from the prior concept — results-grid prop forwarding — was closed
by the amended requirements: row 7 on `default` is inherited from `Content`'s
own default, so no plumbing is required. The grid component receives one JSDoc
comment at the inner `<Content>` invocation but no prop or behavioural change.

### Sub-problem 1: `SuccessStoryHero` — reaching the token system

**Approach 1A — Add `background?: SectionBackground` prop, default `'default'`,
swap hardcoded class for `sectionBackground[background]`.**

- **Core idea:** Replicate the exact shape every other section component on the
  site uses (`Content`, `Stats`, `Coaches`, `Usps`, `Services`,
  `SuccessStories`, `Testimonial`, `TestimonialGrid` — all eight carry this prop
  shape verbatim; verified by grep in "Consumers" below).
- **Concrete meaning:** Two lines in the frontmatter (prop type + destructure
  with default), one class-list swap on line 52. `isolate`, `overflow-hidden`,
  `pt-14`, and the `aria-labelledby` attribute are unchanged.
- **When right:** When the component's outer wrapper owns a single background
  attribute and the caller may legitimately want to vary it. This is the case
  here — the hero sits at row 1 today (`default`) and the rhythm keeps it there,
  but the ADR-0014 debt at line 52 must be resolved through the token map
  regardless, and any future caller that wants a different hero tone pays zero
  structural cost.
- **When not:** When the component already has a composite or conditional
  background derived from internal state. Not the case — the hero `<section>`
  has exactly one background class pair today.

**Approach 1B — Keep the hero free of a `background` prop; resolve the ADR-0014
debt by inlining `sectionBackground.default` on line 52 instead of the hardcoded
class pair.**

- **Core idea:** YAGNI: no second caller, no rhythm variation planned, no prop
  symmetry gain worth the API surface.
- **Concrete meaning:** `bg-background dark:bg-background-dark` becomes
  `class:list={['relative isolate overflow-hidden pt-14', sectionBackground.default]}`.
- **When right:** When the component is a single-use leaf and introducing an
  optional prop merely adds cognitive load without a concrete caller planned.
  The owner weighed this explicitly under Open Question 3 and chose 1A.
- **When not:** When the component sits in a family where every sibling already
  carries the same prop and the outlier cost exceeds the API-surface cost. That
  is the situation here — the eight peer section components listed above all
  carry `background?: SectionBackground`.

**Approach 1C — Extract an inner `SuccessStoryHeroShell` or move the `<section>`
wrapper up to `[slug].astro`.**

- **Core idea:** Flip composition: the page owns the section wrapper and the
  hero renders only the inner content.
- **Concrete meaning:** Hero loses its outer `<section>` tag, `isolate` stacking
  context responsibility moves to the page, callers always provide the wrapper.
- **When right:** When multiple pages compose the hero inside different section
  wrappers. Zero live callers today (one page).
- **When not:** When the hero's stacking-context and clipping invariants
  (`isolate overflow-hidden`) are part of the hero's contract. Moving them to
  the caller externalises a detail that today lives inside the component and
  breaks the `aria-labelledby` locality (the page would have to thread `heroId`
  through both the wrapper and the hero). Pure structural regression against
  ADR-0034 (extract-first).

### Sub-problem 2: Page-level rhythm application

**Approach 2A — Token-map swaps at the four hardcoded sites on the page, plus
prop additions on the three Content invocations whose rhythm row is `muted`,
plus the CTA-band token flip, plus `variant="glass"` on the inner `<Cta>`
invocation, plus a JSDoc tripwire in `SuccessStoryResultsGrid` pinning the
implicit row-7 default.**

- **Core idea:** Only class-list attributes change on four elements, plus three
  prop additions, plus one prop change, plus one CTA-variant addition, plus one
  JSDoc comment on the grid's inner `<Content>`. No structural reshaping.
- **Concrete meaning:**
  - The mid pull-quote aside (row 3): hardcoded
    `bg-background dark:bg-background-dark` → `sectionBackground.default`.
  - The reader-pickup section (row 8): hardcoded
    `bg-background dark:bg-background-dark` → `sectionBackground.muted`.
  - The final pull-quote aside (row 10): hardcoded
    `bg-background dark:bg-background-dark` → `sectionBackground.default`.
  - The related-stories section (row 12): hardcoded
    `bg-background dark:bg-background-dark` → `sectionBackground.default`.
  - Content rows 2 (`startingPoint`), 4 (`whatIWasLookingFor`), 6
    (`turningPoint`): add `background="muted"`.
  - Row 5 (`howWeWorked`) receives **no** `background` prop — it relies on
    `Content`'s own default (`'default'`). This matches the homepage convention
    ("omit when default, specify when not" —
    `src/pages/index.astro:47, 63, 90, 99, 104, 111`).
  - CTA band `<div>` (row 11): `sectionBackground.muted` →
    `sectionBackground.charcoal`.
  - Inner `<Cta>` at the CTA band (row 11): add `variant="glass"` per the
    component's JSDoc contract (`glass` for dark/coloured section backgrounds;
    `CTA.astro:7–9`).
  - `SuccessStoryResultsGrid.astro`: add a JSDoc comment immediately above the
    inner `<Content>` invocation pinning the row-7 default-propagation contract.
    No prop, no behaviour change.
  - Hero call site (row 1): no change — the hero's new default keeps it on
    `'default'` and explicit passing would be noise.
  - Results-grid call site on the page (row 7): no change — Content's own
    default renders row 7 on `'default'`.
- **When right:** When the rhythm is a surgical application of an existing token
  map and the surrounding markup (landmarks, `aria-labelledby` targets,
  paddings, motion attributes) does not need restructuring. That is the case
  here per AC 6 and AC 7.
- **When not:** When the rhythm requires new landmark structure or shifts the
  semantic outline. Not needed.

**Approach 2B — Extract the three remaining inline page blocks (pull-quotes and
reader-pickup and related-stories) into their own typed components that
internally take `background?: SectionBackground`.**

- **Core idea:** Apply ADR-0034 extract-first to the page, removing the inline
  `<aside>` and `<section>` blocks that today live directly in `[slug].astro`.
- **Concrete meaning:** Four new components (`SuccessStoryPullQuoteBlock`,
  `SuccessStoryReaderPickup`, `SuccessStoryCtaBand`,
  `SuccessStoryRelatedStories`), each with its own `Props` type and its own
  `background` prop.
- **When right:** When the inline blocks carry enough structure that they are
  re-usable or hard to read inline.
- **When not:** When the extraction is speculative and the scope of the current
  task is strictly the rhythm. Per ADR-0034's own carve-out, "trivial
  single-element blocks with no logic or typed data" need not be extracted —
  each of the four blocks is exactly one element wrapping one existing extracted
  component (`PullQuote`, `Cta`) or a two-element text block (reader-pickup).
  The requirements' Readiness Checklist explicitly records ADR-0034 as satisfied
  by the current structure. Out of scope.

---

## Chosen Approach

- **Sub-problem 1:** **Approach 1A.** The specific property deciding it is
  **convention symmetry**: every other section component (`Services`, `Stats`,
  `Usps`, `Coaches`, `SuccessStories`, `Testimonial`, `TestimonialGrid`, and the
  underlying `Content`) already accepts `background?: SectionBackground` with
  default `'default'`, imported from `~/styles/sectionStyles`. The hero is the
  single outlier. The ADR-0014 debt at line 52 has to be resolved through the
  token map regardless of whether the prop is added (any hardcoded token
  replacement is itself a duplication of `sectionBackground.default`). Routing
  through the prop costs two lines more than routing around it and aligns the
  component with its eight siblings. The owner confirmed "ship now" on
  2026-04-24.

- **Sub-problem 2:** **Approach 2A.** The specific property is **scope fidelity
  with structural safeguarding**: the amended requirements list the twelve rows,
  the four hardcoded sites on the page, and exclude any other behavioural change
  including any ResultsGrid prop addition. 2A does exactly that and nothing
  more. The one-line JSDoc comment on `SuccessStoryResultsGrid.astro`'s inner
  `<Content>` invocation is not a behavioural change — it pins the implicit
  default-propagation contract in place at the point where a future refactor
  would most plausibly break it, trading one comment line for an explicit
  tripwire against a silent row-7 regression. 2B is explicitly out of scope per
  the requirements' Readiness Checklist.

---

## Affected Files

| Path                                                                   | Change | Short description                                                                                                                                                                                                                                                                                                                                                                                   |
| :--------------------------------------------------------------------- | :----- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/sections/successStories/SuccessStoryHero.astro`        | edit   | Add `background?: SectionBackground` prop (default `'default'`); import `sectionBackground` and type `SectionBackground` from `~/styles/sectionStyles`; replace line 52's hardcoded `bg-background dark:bg-background-dark` with `class:list={['relative isolate overflow-hidden pt-14', sectionBackground[background]]}`.                                                                          |
| `src/pages/success-stories/[slug].astro`                               | edit   | Convert four hardcoded `bg-background dark:bg-background-dark` wrappers on the page to `sectionBackground.default` (value-preserving; commit 2). Then apply the rhythm (commit 3): flip reader-pickup to `sectionBackground.muted`; add `background="muted"` on Content rows 2, 4, 6; flip CTA-band wrapper to `sectionBackground.charcoal`; add `variant="glass"` to the inner `<Cta>` invocation. |
| `src/components/sections/successStories/SuccessStoryResultsGrid.astro` | edit   | Commit 3 only: add a JSDoc comment immediately above the inner `<Content>` invocation (roughly three lines, under 3 lines of prose) pinning the implicit default-propagation contract that keeps row 7 on `'default'`. No prop addition, no attribute change, no behaviour change.                                                                                                                  |

### Explicitly unchanged

- `src/components/sections/successStories/SuccessStoryResultsGrid.astro` — **no
  behavioural change.** The only edit is a JSDoc comment at the inner
  `<Content>` invocation; the component's API, props, slots, and rendered markup
  are identical to today. Row 7 continues to render on `default` via `Content`'s
  own default (`'default'`).
- `src/components/sections/successStories/SuccessStoryCoachCard.astro` —
  unchanged. Row 9 remains on the component's existing `sectionBackground.muted`
  wrapper, honouring the inner aside's `bg-foreground-950/5 dark:bg-white/5`
  constraint.
- Hero call site at `[slug].astro:82` — **no** `background` prop added. Hero
  default is `'default'`; row 1 is neutral. Omit-when- default convention
  preserved.
- Row 5 `Content` invocation (`howWeWorked`) — **no** `background` prop added.
  Content's default `'default'` is correct for row 5. Omit-when-default
  convention preserved.
- Results-grid call site at `[slug].astro:138` — **no** `background` prop added.

---

## Reused Patterns

The plan is entirely an application of already-established patterns. No new
pattern is introduced.

**Prop shape** — the `background?: SectionBackground` pattern with default
`'default'` and import from `~/styles/sectionStyles` is identical across eight
peers:

- `src/components/sections/Content.astro` — the canonical consumer (prop at the
  Props type, default via destructure, token lookup on the outer `<section>`,
  plus `sectionHeadline` / `sectionText` for interior text).
- `src/components/sections/Stats.astro` — the shortest adapter pattern; the hero
  adoption is a direct copy.
- `src/components/sections/Coaches.astro`,
  `src/components/sections/Services.astro`,
  `src/components/sections/SuccessStories.astro`,
  `src/components/sections/Usps.astro`,
  `src/components/sections/Testimonial.astro`,
  `src/components/sections/successStories/TestimonialGrid.astro` — same
  signature, same default, same forward.

**Page-level composition** — `src/pages/index.astro` lines 63–122 is the
canonical multi-row consumer: it threads `background="muted"`,
`background="teal"`, `background="silver"`, `background="sage"`,
`background="charcoal"` through five section components and finishes with a
hardcoded `<div class="bg-background dark:bg-background-dark-muted ...">` CTA
wrapper. The detail-page rhythm applies the same grammar to twelve rows, with
one difference: the detail-page CTA wrapper moves to
`sectionBackground.charcoal` rather than staying on a neutral background, and
its inner `<Cta>` gains `variant="glass"` accordingly.

**`variant="glass"` on `<Cta>` over a dark surface** — an established JSDoc
contract in `src/components/ui/CTA.astro:7–9`: `dark` (default) for light
sections, `glass` for dark/coloured sections. No live caller in the current
codebase uses `variant="glass"` (verified by grep under "Consumers"); the
detail-page CTA will be the first. Zero API change.

**Token map** — `sectionBackground` from `~/styles/sectionStyles`, imported on
`[slug].astro:50` today and used on line 181 (the CTA band wrapper). Commit 2
reuses the same import; commit 3 adds no new import.

**Type import** — `type { SectionBackground }` is new in
`SuccessStoryHero.astro` but is an established re-export from
`~/styles/sectionStyles` (line 65 of that module).

**Dark-mode fallback pattern** — `sectionStyles.ts:6–7` documents that the dark
section variants (teal, silver, sage, charcoal) are light-mode only and fall
back to `background-dark(-muted)` in dark mode. The homepage exemplifies this at
`index.astro:99–122`.

**JSDoc tripwire on implicit cross-file contracts** — JSDoc comments that pin an
implicit cross-file invariant at the point where a future editor would most
plausibly break it are an established light-touch safeguard in this codebase
(for example, `SuccessStoryCoachCard.astro`'s header comment records the
`bg-foreground-950/5` light-surface constraint that keeps the component locked
to `muted`). The row-7 tripwire on the grid's inner `<Content>` applies the same
pattern.

---

## New Abstractions

**None.** Explicitly confirmed.

- No new types. `SectionBackground` already exists in
  `src/styles/sectionStyles.ts:23`.
- No new components. The three files in scope are edits of existing files.
- No new utilities. No new data modules. No new CSS tokens — the existing
  six-variant map covers every row.
- No new ADR. This is an application of ADR-0014, not a new decision. The
  hero-prop-symmetry rationale is an application of an already-universal
  pattern, not a generalisable new rule.

---

## Consumers of Changed Values

One component gains an optional, default-preserving prop; existing callers
therefore do not change behaviour. The sole-caller claim must still be verified.

### `SuccessStoryHero` — sole-caller verification

```
rg -n 'SuccessStoryHero' src/
```

```
src/pages/success-stories/[slug].astro:13: *      process-strip footer (SuccessStoryHero)
src/pages/success-stories/[slug].astro:35:import SuccessStoryHero from '~/components/sections/successStories/SuccessStoryHero.astro';
src/pages/success-stories/[slug].astro:82:    <SuccessStoryHero story={story} coach={coach} programLabel={programLabel} headingId={heroId} />
src/components/sections/successStories/SuccessStoryHero.astro:23: * <SuccessStoryHero
```

Only `[slug].astro` invokes `<SuccessStoryHero>`. Line 23 inside the hero file
is a JSDoc example; line 13 inside `[slug].astro` is a JSDoc comment. The sole
executable call site is `[slug].astro:82`. Adding an optional `background` prop
defaulted to `'default'` leaves the sole call site pixel-identical (see
"Structural Health Check → SuccessStoryHero" for the render-identity statement).

### `SuccessStoryResultsGrid` — sole-caller verification (no behaviour change, JSDoc-only edit)

```
rg -n 'SuccessStoryResultsGrid' src/
```

```
src/pages/success-stories/[slug].astro:36:import SuccessStoryResultsGrid from '~/components/sections/successStories/SuccessStoryResultsGrid.astro';
src/pages/success-stories/[slug].astro:138:    <SuccessStoryResultsGrid headline={sectionLabels.results} results={story.detail.results} />
src/components/sections/successStories/SuccessStoryResultsGrid.astro:17: * <SuccessStoryResultsGrid
```

Sole call site at `[slug].astro:138`. The grid component's commit-3 edit is a
JSDoc comment immediately above the inner `<Content>` invocation at
`SuccessStoryResultsGrid.astro:37`. The comment pins the implicit
default-propagation contract; it adds no prop, no attribute, and changes no
runtime behaviour. The call site at `[slug].astro:138` does not change.

### `<Cta variant="glass">` — existing usage

```
rg -n 'variant="glass"' src/
```

```
src/components/ui/CTA.astro:32: *   variant="glass"
src/components/ui/CTA.astro:56:  variant?: 'dark' | 'glass';
src/components/ui/CTA.astro:75:  const isGlass = variant === 'glass';
```

No production call site currently uses `variant="glass"`; the detail-page CTA
becomes the first. Only references are the component definition itself and its
JSDoc example. Adding `variant="glass"` to one `<Cta>` invocation has no ripple
consequences elsewhere.

### Hardcoded `bg-background dark:bg-background-dark` — scope-boundary verification

```
rg -n 'bg-background dark:bg-background-dark' src/
```

```
src/styles/sectionStyles.ts:27:  default: 'bg-background dark:bg-background-dark',
src/components/sections/Contact.astro:52:<section id={id} class="bg-background dark:bg-background-dark-muted relative isolate">
src/pages/coaches/index.astro:106:  <section class="bg-background dark:bg-background-dark py-24">
src/components/sections/HeroSplit.astro:73:  class="bg-background dark:bg-background-dark relative isolate overflow-hidden pt-14"
src/components/ui/Modal.astro:56:          'bg-background dark:bg-background-dark relative w-full transform overflow-hidden rounded-2xl px-4 pb-4 text-left shadow-xl transition-all',
src/pages/index.astro:122:  <div class="bg-background dark:bg-background-dark-muted px-6 py-24 sm:py-32 lg:px-8">
src/components/sections/howItWorks/ProcessSteps.astro:39:    <section id={id} class="bg-background dark:bg-background-dark px-6 py-24 sm:py-32 lg:px-8">
src/components/sections/services/ServicesCatalog.astro:96:  class="bg-background dark:bg-background-dark px-6 py-16"
src/pages/success-stories/[slug].astro:98:    <aside class="bg-background dark:bg-background-dark px-6 py-12 lg:px-8" aria-label="Pull quote">
src/pages/success-stories/[slug].astro:142:      class="bg-background dark:bg-background-dark px-6 py-12 lg:px-8"
src/pages/success-stories/[slug].astro:166:      class="bg-background dark:bg-background-dark px-6 py-16 lg:px-8"
src/pages/success-stories/[slug].astro:196:        class="bg-background dark:bg-background-dark px-6 py-24 sm:py-32 lg:px-8"
src/pages/how-it-works/index.astro:53:  <section class="bg-background dark:bg-background-dark px-6 py-24 sm:py-32 lg:px-8">
src/pages/contact/thanks.astro:15:  <section class="bg-background dark:bg-background-dark px-6 py-24 sm:py-32 lg:px-8">
src/components/sections/successStories/SuccessStoryHero.astro:52:  class="bg-background dark:bg-background-dark relative isolate overflow-hidden pt-14"
```

**In scope** (five sites, matching the amended requirements' AC 2 exactly):

- `src/pages/success-stories/[slug].astro` — four occurrences (the mid
  pull-quote aside, the reader-pickup section, the final pull-quote aside, the
  related-stories section).
- `src/components/sections/successStories/SuccessStoryHero.astro` — one
  occurrence (the hero outer `<section>`).

**Out of scope** (nine further sites, not touched by this task — noted for the
orchestrator in the Notes section below, not silently fixed):

- `src/styles/sectionStyles.ts:27` — this **is** the token definition; it must
  stay.
- `src/components/sections/HeroSplit.astro:73`
- `src/components/sections/Contact.astro:52` (distinct: uses the `-dark-muted`
  dark variant)
- `src/pages/coaches/index.astro:106`
- `src/pages/how-it-works/index.astro:53`
- `src/pages/contact/thanks.astro:15`
- `src/components/sections/howItWorks/ProcessSteps.astro:39`
- `src/components/sections/services/ServicesCatalog.astro:96`
- `src/components/ui/Modal.astro:56`
- `src/pages/index.astro:122` (distinct: uses the `-dark-muted` dark variant)

After commit 3, the AC 2 grep
(`rg -n 'bg-background' src/pages/success-stories/[slug].astro src/components/sections/successStories/SuccessStoryHero.astro src/components/sections/successStories/SuccessStoryResultsGrid.astro`)
returns zero matches. The JSDoc tripwire added in commit 3 mentions `default` as
a token name; it does not introduce the literal string `bg-background`.

### Silent-inheritance check

None of the nine out-of-scope occurrences is a child or ancestor of a
detail-page section wrapper — they are all sibling pages, layout components
(`Modal`, `HeroSplit`), or adapters on other routes. No silent inheritance
exists.

---

## Structural Health Check

Per file, assessed against `docs/CONVENTIONS.md` and the ADRs the plan engages.

### `src/components/sections/successStories/SuccessStoryHero.astro`

- **ADR-0014:** Currently violates by hardcoding
  `bg-background dark:bg-background-dark` on line 52. The prop addition resolves
  the violation via the canonical token route.
- **ADR-0020:** No `<script>` tags in this file; no script behaviour changes; no
  migration triggered. Verified by reading the file.
- **ADR-0034:** Compliant; the hero is an extracted named section under
  `sections/successStories/`. No change.
- **ADR-0036:** Not engaged. The file has no `<slot />` forwarders and does not
  read slot presence to gate visible markup.
- **Critical Rule 1 (routes):** Not engaged; no `href` in this file.
- **Critical Rule 6 (`readonly` on array Props):** The added `background` field
  is a scalar union; rule not engaged. Existing array props on the file retain
  their `readonly` modifiers.
- **Convention — Props typing:** `type Props = { ... }` pattern already used;
  the new field extends it.
- **Convention — default via destructure:** Matches the pattern used by every
  peer section component
  (`const { ..., background = 'default' } = Astro.props;`).
- **Render-identity statement (Open Question 3 verification):** Today's line 52
  class attribute is
  `bg-background dark:bg-background-dark relative isolate overflow-hidden pt-14`.
  Post-change,
  `class:list={['relative isolate overflow-hidden pt-14', sectionBackground[background]]}`
  flattens to a string containing the same five utility tokens
  (`sectionBackground.default` resolves to
  `'bg-background dark:bg-background-dark'` per `sectionStyles.ts:27`). All
  utilities are atomic and non-conflicting — `relative` governs `position`,
  `isolate` governs `isolation`, `overflow-hidden` governs `overflow`, `pt-14`
  governs `padding-top`, and the two background utilities govern
  `background-color` in light and dark modes respectively; no pair collides.
  Class ordering inside the `class` attribute does not affect the cascade for
  non-conflicting utilities; therefore the `class:list` rewrite is a render
  no-op for `background='default'`.

### `src/pages/success-stories/[slug].astro`

- **ADR-0014:** Four hardcoded violations on the mid pull-quote aside, the
  reader-pickup section, the final pull-quote aside, and the related-stories
  section. All four resolved by commit 2 (value-preserving, every target lands
  on `sectionBackground.default`). Post-commit-2 count: zero hardcoded
  occurrences on this file.
- **ADR-0020:** No `<script>` tags on the page — verified by grep. No
  `is:inline` migration triggered.
- **Critical Rule 1 (routes):** The page already imports `routes.contact` and
  uses it on the reader-pickup link and on the CTA's `primaryCta.href`. No
  hardcoded path introduced. Not engaged.
- **Critical Rule 6 (`readonly` on array Props):** No new array props introduced
  at the call sites.
- **ADR-0036:** Not engaged at the page level. The page is the outermost caller
  and does not forward any slot whose presence is gated inside the forwarded
  component. The `Content` → `SectionHeader` default-slot path is already
  hardened at `SectionHeader.astro` (commit `aeacd2f`) and the page simply
  continues to rely on that behaviour.
- **`aria-labelledby` / landmarks:** AC 7 preserved — the class-list swaps and
  the prop additions change no attribute other than `class:list` and new
  `background` props on three `<Content>` invocations, plus the single
  `variant="glass"` attribute on the row-11 `<Cta>`. The CTA band remains a
  `<div>`; `Cta` still renders its own `role="region"` with `aria-labelledby`.
  The hero outer `<section aria-labelledby={heroId}>` thread is unchanged.
- **Motion attributes:** Every `data-animate` attribute is preserved verbatim
  (AC 6). No `prefers-reduced-motion` path touched.
- **Inline hardcoded text tokens on rows 3, 8, 10 — intentional no-touch,
  explicitly recorded.** The mid pull-quote (row 3), the reader-pickup `<p>`
  (row 8), and the final pull-quote (row 10) each carry hardcoded body-text
  classes that **do not** route through `sectionText[background]`. The row-8
  case is the strongest: when the reader-pickup wrapper flips from `default` →
  `muted`, the inner `<p>` keeps `text-foreground-700 dark:text-gray-300` rather
  than picking up `sectionText[muted]`. Verified at `sectionStyles.ts:53–61`:
  both `sectionText[default]` and `sectionText[muted]` map to
  `text-foreground-700 dark:text-gray-400` — the light-mode colour matches the
  inline `<p>` verbatim, and the dark-mode colour differs by one step
  (`gray-300` vs `gray-400`). The difference is pre-existing and invisible
  across the `default` / `muted` boundary that this rhythm targets. It is
  **not** newly introduced here and does not require fixing in this task.
  Classified as an intentional no-touch on text colours — recorded rather than
  silently routed — and flagged for the next rhythm iteration in "Notes for the
  Orchestrator → Inline text tokens". The concept does **not** claim "only
  `class:list` and `background` props change"; the attribute-level change-set
  per row 8 is: one `class:list` value update on the outer `<section>` wrapper,
  zero other attribute changes. The inline `<p>` is untouched. Acceptance
  criterion 7 continues to hold on the attribute-change axis.

### `src/components/sections/successStories/SuccessStoryResultsGrid.astro`

- **Behavioural change:** None. The component's API, props, slots, rendered
  markup, and class lists are identical to today.
- **Edit in commit 3:** A JSDoc comment roughly three lines long and under three
  lines of prose, placed immediately above the `<Content headline={headline}>`
  invocation at line 37. The comment pins the implicit default-propagation
  contract that keeps row 7 on `'default'` — passing a `background` here would
  silently move row 7 off `default` without any diff on the detail page.
- **Row 7 on `default`:** Delivered as before by `Content`'s own default.
  Verified by reading the file: `<Content headline={headline}>` at line 37, no
  `background` attribute passed, so `Content`'s own
  `const { headline, background = 'default' } = Astro.props;` resolves to
  `'default'` and the `<section>` wrapper paints `sectionBackground.default`.
- **ADR-0036, ADR-0020, Critical Rule 1:** Not engaged. No slot forwarding
  semantics change, no script change, no route change.

### `src/components/sections/successStories/SuccessStoryCoachCard.astro` — unchanged

Row 9 stays on the component's existing `sectionBackground.muted` wrapper (line
57 of that file), honouring the inner aside's semi-transparent neutrals
constraint recorded in the component's header comment. The constraint is not
violated; no change.

### Cross-cutting: `Content.astro` (not touched)

Direct caller of `sectionBackground`, `sectionText`, and `sectionHeadline` — it
already handles all six `SectionBackground` variants. Passing
`background="muted"` on rows 2, 4, 6 flows through without any adjustment.
Confirmed by reading the file.

### Cross-cutting: CTA surface contract

`src/components/ui/CTA.astro:7–9` records the contract: `variant="dark"` is for
light sections, `variant="glass"` is for dark/coloured sections. Row 11's
wrapper moves from `muted` (light cream/sand) to `charcoal` (dark slate in light
mode; `bg-background-dark` in dark mode). Without adding `variant="glass"`, the
default-dark CTA panel would sit on a dark-by-default surface and visually
collapse. Adding `variant="glass"` to the one invocation honours the component's
JSDoc contract and is the minimal change. No API surface change; the component
already supports both variants.

**CtaButton variant flip in the glass branch.** `CTA.astro:123` renders
`<CtaButton action={primaryCta} variant={isGlass ? 'primary' : 'secondary'} />`.
In the default (`dark`) branch the primary button is `secondary` (white-filled,
ring-outlined, `text-foreground-950`); in the glass branch it becomes `primary`
(filled `bg-accent-600 text-white`, per `Button.astro:62–66`). This is
pre-existing `Cta`-component behaviour, not introduced by this task, but adding
`variant="glass"` on row 11 surfaces the flip as a visible change on the
detail-page CTA: the row-11 button colour shifts from white-outlined to
accent-filled. Recorded here so the AC 9 browser-check reviewer expects the
difference rather than treating it as a regression.

### Cross-cutting: dark-mode fallback — explicit acceptance

The rhythm is a **light-mode-only feature**. In dark mode:

- Rows 2, 4, 6, 8 (`muted`) render as `bg-background-dark-muted`.
- Row 11 (`charcoal`) renders as `bg-background-dark` per `sectionStyles.ts:32`.
- All other rows render as `bg-background-dark`.

Row-11's `charcoal`-beat therefore disappears in dark mode; rows 8→9→10→11→12
all paint adjacent dark-mode surfaces with no beat visible between them. This is
accepted per the homepage precedent: `src/pages/index.astro:99–122` threads
`silver` → `sage` → `charcoal` through three consecutive sections plus the
hardcoded `bg-background-dark-muted` CTA wrapper — all four collapse to
`bg-background-dark(-muted)` adjacencies in dark mode, and the homepage ships
that behaviour. The owner's decision on 2026-04-24 explicitly extends the same
acceptance to the detail page. AC 5 is framed in the amended requirements to
match this reality: dark mode "reads identically to today" rather than claiming
parity.

### Cross-cutting: `isDarkBackground` helper — not engaged

None of the in-scope files invokes `isDarkBackground`. The hero stays on
`'default'` at its sole call site; the CTA band's `variant="glass"` is specified
explicitly rather than derived from the wrapper's token. Confirmed by reading
the files.

---

## Commit Plan

Three commits, as per the owner-approved baseline. The split is argued
explicitly below; deviations to two or four commits were considered and
rejected.

### Commit 1: `feat(success-story-hero): accept background prop for token-driven surface`

- **Scope:** `src/components/sections/successStories/SuccessStoryHero.astro`
  only.
  - Add
    `import { sectionBackground, type SectionBackground } from '~/styles/sectionStyles';`
    to the frontmatter.
  - Extend the `Props` type with `background?: SectionBackground`.
  - Extend the destructure with `background = 'default'`.
  - Replace line 52's hardcoded class list with
    `class:list={['relative isolate overflow-hidden pt-14', sectionBackground[background]]}`.
- **Rationale for isolation:** The hero's prop addition is a standalone
  surface-level extension: it (a) resolves ADR-0014 debt in that single file,
  (b) is reviewable in fewer than 20 diff lines, (c) provably does not change
  any rendered page (the default preserves line 52's current classes exactly —
  see the render-identity statement under "Structural Health Check"). Keeping it
  separate means a future `git blame` on line 52 points at a commit whose
  subject explains why the class-list changed, not at a multi-concern commit.
- **Post-commit state:** Page renders identically; no call site passes the new
  prop.
- **Verification:** `pnpm build` or the Astro check passes; the AC 2 grep on the
  hero file returns zero matches.

### Commit 2: `style(success-story-detail): convert hardcoded backgrounds to token map`

- **Scope:** `src/pages/success-stories/[slug].astro` only. Value-preserving
  ADR-0014 debt conversion of the four hardcoded
  `bg-background dark:bg-background-dark` wrappers to
  `sectionBackground.default`:
  - The mid pull-quote aside — swap the literal `class` string for
    `class:list={['px-6 py-12 lg:px-8', sectionBackground.default]}`.
  - The reader-pickup section — same shape; target `sectionBackground.default`
    here (commit 3 will flip it to `sectionBackground.muted` as part of the
    rhythm).
  - The final pull-quote aside — swap to
    `class:list={['px-6 py-16 lg:px-8', sectionBackground.default]}`.
  - The related-stories section — swap to
    `class:list={['px-6 py-24 sm:py-32 lg:px-8', sectionBackground.default]}`.
- **Rationale for isolation:** Pure debt conversion. Every target lands on
  `'default'`, and `sectionBackground.default` resolves to
  `'bg-background dark:bg-background-dark'` per `sectionStyles.ts:27` — so the
  commit is value-preserving and cannot change any rendered output. A reviewer
  can verify with compile + grep alone, no browser check. Keeping the debt
  conversion isolated means commit 3's visible-change diff is free of mechanical
  swaps, and any bisect pointing at commit 3 is unambiguously about the rhythm
  rather than about the conversion.
- **Post-commit state:** Page renders identically; every wrapper on the page
  that previously hardcoded the class pair now routes through
  `sectionBackground.default`. The CTA-band wrapper at row 11 is untouched (it
  already routed through `sectionBackground.muted`).
- **Verification:**
  `rg -n 'bg-background' src/pages/success-stories/[slug].astro src/components/sections/successStories/SuccessStoryHero.astro src/components/sections/successStories/SuccessStoryResultsGrid.astro`
  returns zero matches after this commit lands (commit 1 already cleaned the
  hero). AC 2 becomes satisfiable at this point — the rhythm application in
  commit 3 does not reintroduce any hardcoded class pair.

### Commit 3: `style(success-story-detail): apply narrative-rhythm background cycle`

- **Scope:** `src/pages/success-stories/[slug].astro` and
  `src/components/sections/successStories/SuccessStoryResultsGrid.astro`. Every
  page-level change here is part of the visible rhythm; the grid-component
  change is a JSDoc tripwire pinning the implicit contract that makes row 7 work
  under the rhythm. Scope references are content-anchored rather than
  line-numbered — the implementer identifies each target by its content, which
  survives any prior edit.
  - Add `background="muted"` to the `Content` invocation for `startingPoint`
    (row 2).
  - Add `background="muted"` to the `Content` invocation for
    `whatIWasLookingFor` (row 4).
  - Add `background="muted"` to the `Content` invocation for `turningPoint` (row
    6). `howWeWorked` (row 5) receives no prop — omit-when-default.
  - Flip the reader-pickup section wrapper (row 8) from
    `sectionBackground.default` (set in commit 2) to `sectionBackground.muted`.
  - Flip the CTA-band outer `<div>` wrapper (row 11) from
    `sectionBackground.muted` to `sectionBackground.charcoal`.
  - Add `variant="glass"` to the inner `<Cta>` invocation at the CTA band (row
    11).
  - **JSDoc tripwire at `SuccessStoryResultsGrid.astro`.** Add a JSDoc-style
    comment immediately above the inner `<Content>` invocation (today at line
    37: `<Content headline={headline}>`). Exact wording to use verbatim:
    ```astro
    {
      /* Row 7 on /success-stories/[slug] relies on Content's
        'default' background default. Passing a background here
        would silently move row 7 off default — see AC 1 in
        docs/work/2026-04-24-success-story-detail-rhythm. */
    }
    ```
    The comment is three content lines. It documents one invariant (Content's
    default keeps row 7 on `'default'`), one failure mode (passing a background
    here silently moves row 7), and one pointer (the requirements doc for
    context). It adds no prop, no attribute, and no runtime behaviour.
- **Rationale for isolation:** This is the commit that changes what a user sees.
  The full rhythm delta lives in one diff — reviewer and browser-check focus in
  a single place. Bisect on a rhythm regression is unambiguous. The JSDoc
  tripwire belongs here because the contract it pins (`Content`'s default
  keeping row 7 on `default`) is the exact mechanism that makes the rhythm work;
  a separate commit for a three-line comment would be structurally noisier than
  keeping it next to the row-7-dependent change. Commit subject prefix
  `style(...)` fits Conventional Commits because the effective change is purely
  visual and documentary — no logic, no data, no new markup elements. (Commit 1
  uses `feat(...)` because the hero extends a public API.)
- **Post-commit state:** The twelve-row rhythm is live per AC 1. AC 2 holds (no
  hardcoded `bg-background` pair on any in-scope file). AC 3 holds (hero accepts
  `background` with default `'default'`). AC 4 holds (results grid renders on
  `default` via Content's existing default; the JSDoc comment is now present as
  a structural tripwire). AC 5–10 are verified by the browser check per AC 9.
- **AC 9 browser-check guidance for the row-11 primary button.** The row-11
  primary button renders with the glass-branch `CtaButton variant` (`primary`,
  per `CTA.astro:123` in the `isGlass` branch), which maps to `Button` variant
  `primary` — visually `bg-accent-600 text-white` (filled accent) rather than
  the default-branch `secondary` (white-filled, ring-outlined) that every other
  CTA on the page currently ships. This is pre-existing `Cta`-component
  behaviour surfaced for the first time by the row-11 `variant="glass"`
  addition. Expected visual: accent-filled button on the charcoal surface; not a
  regression.

### Why three commits and not two

- **Option: merge commits 2 and 3 into one page-level commit.** Drawback: mixes
  a value-preserving debt conversion (four string swaps to the same token) with
  a value-changing rhythm application (three prop additions, two token flips,
  one variant addition, one JSDoc tripwire on a sibling component). The
  equivalence of `bg-background dark:bg-background-dark` and
  `sectionBackground.default` is a property of the current token map, not an
  invariant — if a future ADR retargets the default token, the conversion would
  become value-changing retroactively on this commit. Keeping the two separate
  means any future bisect on a rhythm regression points at commit 3's visible
  diff alone, and any future rereading of the ADR-0014 debt cleanup is visible
  in commit 2's subject.

### Why three commits and not four

- **Option: split commit 3 further into "Content-row prop additions (rows
  2/4/6)" and "row-8 / row-11 / CTA variant + JSDoc tripwire".** Drawback: the
  rhythm is a unified composition. Splitting the Content-row prop additions from
  the row-8 flip would ship a state between commits where rows 2, 4, 6 are
  `muted` but row 8 still reads `default`, landing on the same token as rows 3,
  5 around it — a halfway rhythm that is neither the current layout nor the
  target one. That interim state is uninteresting to review and noisy to bisect.
  The JSDoc tripwire on the grid component is paired with the row-7 dependency
  it documents; isolating it into a fourth commit would be a three-line
  docs-only commit that reads as overhead rather than clarity. The rhythm
  application is a single coherent concern.

---

## Test Approach

**No new unit tests.** Confirmed after explicit consideration per requirements'
Non-Scope (tests). The rationale:

- **No domain logic added.** The hero's `background` prop is a passthrough into
  a class-list lookup; no branching, no derivation.
- **The token map is already covered by its type.** `sectionBackground` is typed
  `Record<SectionBackground, string>`; missing or mistyped entries are a
  compile-time error. A snapshot test would duplicate what TypeScript already
  enforces.
- **No behavioural properties to assert.** The rhythm is a visual composition;
  the only failure modes are (a) a typo producing an invalid variant — caught by
  TypeScript — or (b) a mis-assigned row — caught by the AC 9 browser check. (c)
  A missing `variant="glass"` on the CTA — caught by the same browser check as a
  visible regression on row 11.
- **Existing tests remain correct.** The code changes touch only class-list
  strings, one prop signature, and one JSDoc comment. A targeted
  `rg -n 'SuccessStoryHero|SuccessStoryResultsGrid|success-stories/\[slug\]'`
  under `src/` returned only the production files — no test files reference
  these surfaces, which matches the pattern for visual-only components in this
  project.

### Manual verification (part of the Phase-3 handoff)

- **AC 2 grep (automated):**
  `rg -n 'bg-background' src/pages/success-stories/[slug].astro src/components/sections/successStories/SuccessStoryHero.astro src/components/sections/successStories/SuccessStoryResultsGrid.astro`
  must return zero matches after commit 2. Commit 3's JSDoc tripwire mentions
  `default` as a token name, not the literal `bg-background` string — the grep
  stays at zero after commit 3 as well.
- **AC 9 browser check:** Load `/success-stories/sarah-m`, light and dark mode,
  desktop and single-column mobile. Verify the five critical transitions read
  correctly in light mode: 2→3 (`muted`→`default`), 6→7 (`muted`→`default`), 7→8
  (`default`→`muted`), 10→11 (`default`→`charcoal` — Beat), 11→12
  (`charcoal`→`default`). Verify the CTA panel on row 11 reads as
  `variant="glass"` (semi-transparent white, inset ring, backdrop-blur) rather
  than as the default dark panel. Verify the row-11 primary button renders with
  the glass-branch `CtaButton` variant — `primary` (accent-filled), not
  `secondary` (white-outlined) as on every other CTA on the page. Verify dark
  mode reads identically to today per AC 5 — no new regression; the 8→9 seam
  remains the unavoidable `muted`→`muted` flat transition.

---

## Self-Critique

Three counter-arguments against the revised plan, ordered by strength.

**(1) The CTA `variant="glass"` introduces the first live caller of that variant
and pulls with it a visible button-colour flip.** The JSDoc contract is clear
and the implementation branch already exists (`isGlass` at `CTA.astro:75`), but
until this PR ships, every `variant="glass"` render path has been exercised only
by the JSDoc example. There are two coupled consequences:

- The glass panel's own text colours (`text-white` for headline, `text-white/80`
  for description) are hardcoded and do not consume `sectionText[background]` or
  `sectionHeadline[background]` — they assume the underlying surface is dark
  enough for white text to read. On `charcoal` this holds (surface-charcoal is a
  dark slate; `text-white` reads fine). On a future light-tinted custom surface
  it might not.
- The glass branch at `CTA.astro:123` flips the inner `CtaButton` variant from
  `secondary` (white-filled, ring-outlined) to `primary` (accent-filled). On
  every other CTA on the detail page and across the site, the primary button
  renders as `secondary`; row 11 is now the lone outlier by component contract,
  not by caller choice. A reviewer unfamiliar with the `Cta` branch could read
  this as a regression.

  **Response:** Both consequences are confined to the glass variant's own
  contract and are fully inside the `Cta` component, not this task's surface.
  The `charcoal` row reads correctly under `text-white` per the existing
  token-map contrast commitments (`sectionHeadline.charcoal = 'text-white'` at
  `sectionStyles.ts:50`). The button-colour flip is pre-existing behaviour
  surfaced as the intended visual difference between a glass panel on a dark
  surface (which benefits from a filled accent button for contrast) and a dark
  panel on a light surface (which benefits from a white-outlined button against
  the dark panel). The AC 9 browser-check guidance explicitly calls out the
  expected visual so no reviewer is surprised. If the glass variant ever ships
  over a non-dark surface, the fix is in `CTA.astro` and can be addressed as a
  follow-up debt item. Not in scope here.

**(2) The dark-mode collapse at rows 8–12 is a visible adjacency problem that
"accepted per precedent" does not actually solve.** A dark-mode user sees five
consecutive rows paint identical `bg-background-dark` (rows 8 `muted` →
`muted-dark`, then rows 9, 10, 11, 12 all on `dark`). The rhythm exists only in
light mode. A reviewer or end user comparing light and dark would see a visibly
less-structured experience in dark mode. **Response:** This is exactly the
precedent the homepage sets — the homepage's rhythm is also a light-mode
feature, and the token map documents it (`sectionStyles.ts:6–7`: "The dark
variants … are light-mode only. In dark mode they fall back to
background-dark(-muted)."). The owner accepted the same on 2026-04-24. Elevating
this to a two-mode rhythm would require either new dark-mode tokens or an opt-in
per-component dark-surface override — both are outside the amended requirements
and would mean reopening a decision the owner has closed. The concept surfaces
the limitation honestly under "Structural Health Check → Cross-cutting:
dark-mode fallback" and AC 5 is framed to match.

**(3) The JSDoc tripwire on `SuccessStoryResultsGrid.astro` is a text-only
safeguard, not a compile-time one.** A future refactor that adds
`background="muted"` to the inner `<Content>` invocation would still compile,
still pass tests, and still pass CI — the tripwire is only a comment, and a
comment-blind editor can walk past it. A stronger safeguard would be a runtime
assertion or a structural pattern (for example, inlining the `<Content>` with an
explicit `background="default"` so the default is not implicit). The latter
would widen scope; the former is not a pattern used anywhere else in this
codebase for prop-defaulting invariants.

**Response:** Comment-grade safeguards are the established light-touch pattern
for cross-file invariants in this codebase (for example,
`SuccessStoryCoachCard.astro`'s header comment records the `bg-foreground-950/5`
light-surface constraint that keeps the component locked to `muted`, and is
honoured every time). The amendment closes R2-M3 structurally: where the
implicit contract previously had to be re-derived by any future editor from
`Content.astro`'s default alone, it is now explicit at the point of use. A
future editor who wants to add `background="muted"` to the grid's `<Content>`
now has a one-line tripwire pointing them at AC 1 and the requirements doc,
rather than discovering the row-7 regression only via a visual diff after merge.
An inline `background="default"` on the invocation would be a behaviourally
identical change that stops being the "omit-when-default" pattern and starts
being an outlier; the comment preserves the established pattern and adds the
safeguard at the point where it matters most. Stronger than the Round-2 concept,
weaker than a compile-time assertion that this codebase has no precedent for. A
deliberate middle.

---

## Notes for the Orchestrator

These items surfaced during Phase 2 and are deliberately **not** fixed by this
task's surface. They are documented here rather than silently expanded into the
diff.

- **Debt-register candidate — ADR-0014 token-map adoption across all non-test
  files with hardcoded `bg-background` class strings.** The grep in "Consumers"
  identified nine further sites:
  - `src/components/sections/HeroSplit.astro:73`
  - `src/components/sections/Contact.astro:52` (uses the `-dark-muted` dark
    variant; distinct debt)
  - `src/pages/coaches/index.astro:106`
  - `src/pages/how-it-works/index.astro:53`
  - `src/pages/contact/thanks.astro:15`
  - `src/components/sections/howItWorks/ProcessSteps.astro:39`
  - `src/components/sections/services/ServicesCatalog.astro:96`
  - `src/components/ui/Modal.astro:56`
  - `src/pages/index.astro:122` (uses the `-dark-muted` dark variant; distinct
    debt — also the homepage's own CTA wrapper, parallel to this task's change
    on the detail page)

  Candidate `debt-auditor` pass scope: _"ADR-0014 token-map adoption across all
  non-test files with hardcoded `bg-background` class strings."_ Not in this
  task's surface.

- **Candidate hero-prop-parity debt — `HeroSplit.astro:73`.** The marketing hero
  at `src/components/sections/HeroSplit.astro:73` has the exact same outer class
  shape as `SuccessStoryHero` pre-change
  (`bg-background dark:bg-background-dark relative isolate overflow-hidden pt-14`).
  If the owner accepts the hero-prop pattern here, extending the same prop to
  `HeroSplit` would close the same debt on the marketing side. One-file task, no
  ADR. Out of scope for this PR but worth recording so the pattern spreads
  consistently.

- **Inline pull-quote and reader-pickup blocks do not participate in the
  `sectionText[background]` token contract.** Rows 3, 8, 10 render hardcoded
  text classes — row 3's pull quote uses `text-foreground-950 dark:text-white`
  (matches `sectionHeadline[default|muted]`), row 8's reader-pickup `<p>` uses
  `text-foreground-700 dark:text-gray-300` (matches
  `sectionText[default|muted]`'s light colour verbatim and differs by one step
  in dark — `gray-300` vs `gray-400`), row 10's final pull-quote follows the
  same pattern as row 3. The current rhythm only assigns `default` to rows 3 and
  10 and `muted` to row 8 — all three sit inside the `default`/`muted` boundary
  where the hardcoded tokens overlap with the corresponding `sectionText`
  entries, so the render is safe. If a future rhythm iteration ever moves any of
  these inline blocks to a dark token (`teal`, `silver`, `sage`, `charcoal`),
  the hardcoded text would clash with the white-on-dark assumption in
  `sectionText[<dark variant>]`. The fix at that point is either to extract the
  block into a typed component that consumes `sectionText[background]` (ADR-0034
  extract-first), or to per-element `class:list` the text utility. Not
  actionable here; flagged for the next rhythm iteration.

- **`variant="glass"` is the first live caller, and it flips the inner
  `CtaButton` variant from `secondary` to `primary` at `CTA.astro:123`.** After
  this PR ships, any regression in the `Cta` component's glass path — today
  covered only by type-checking and JSDoc — becomes a production regression. Low
  risk (the branch is five class-list lines) but worth a one-line mention in the
  PR description so a reviewer knows this is the first production exercise of
  that variant. The button-colour flip is expected and recorded under AC 9
  browser-check guidance.
