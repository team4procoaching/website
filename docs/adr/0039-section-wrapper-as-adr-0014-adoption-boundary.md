# `<Section>` Wrapper as the ADR-0014 Adoption Boundary

Date: 2026-04-26

## Status

Accepted

## Context

[ADR-0014](0014-light-mode-section-background-system.md) defined the six-variant
section-background system in March 2026 and named `src/styles/sectionStyles.ts`
as the source of truth. It did not specify _how_ section-shell call-sites should
consume the map. The first wave of section adapters (`Content.astro`,
`Stats.astro`, `Coaches.astro`, `Services.astro`, `SuccessStories.astro`,
`Testimonial.astro`, `Usps.astro`, `SectionHeader.astro`, plus the
`success-stories/[slug].astro` section-shells) consume `sectionBackground`
directly — each one imports the map and threads `sectionBackground[background]`
into its own `class:list`.

The 2026-04-26 sweep ahead of the ADR-0014 finish (see task
`2026-04-26-adr-0014-section-background-sweep`) found 14 hardcoded section
shells where the literal `bg-background dark:bg-background-dark[-muted]` (or
`bg-surface-*`) pair sits in page or component markup outside the map. Three of
the 14 carry an outright mismatch — light- and dark-side classes that do not
correspond to any single map variant. The mismatch bugs prove that the
hand-maintained class-pair shape cannot fail loudly: the type system has no hook
to flag a string literal that is not a valid variant pair.

The owner-decided remedy (Phase 1 of the sweep task) introduces a typed wrapper
component, `<Section>`, that accepts the variant as a prop and internally
consumes `sectionBackground`. Most of the 14 sweep sites migrate to it. The
decision question this ADR closes is the boundary: which hardcoded section-shell
sites must consume the map _through_ `<Section>`, and which may consume the map
_directly_ via a `sectionBackground[X]` import, and why.

The boundary matters because:

1. **AI-first work mode.** Future section-shell additions will be written by AI
   agents working from the existing patterns. A single grep-visible pattern
   shrinks the prompt-budget cost of "how do I paint this section?" to a
   one-component answer; two competing patterns require the agent to pick.
2. **Future map evolution.** When `sectionBackground` adds, removes, or re-tones
   a variant, the migration cost scales with the number of direct importers.
   Consolidating sweep-class consumers behind one wrapper makes the next
   ADR-0014-style revision a one-component update for the bulk of the codebase.
3. **Mismatch-bug class.** The `<Section>` boundary closes the mismatch-bug
   class structurally: a `background: SectionBackground` prop cannot encode
   "light side from variant A, dark side from variant B." The variant identity
   is the contract.

### Decision drivers

- **Structural safety over reviewer discipline.** The mismatch bugs were
  invisible to type-check; they only surfaced under a manual cross-reference
  with the colour-system reference doc. A typed wrapper makes the bug class
  structurally impossible.
- **Single grep-visible pattern for sweep-class consumers.** New section shells
  default to one well-known component. Future maintainers (human or AI) consult
  one file, not seven.
- **Explicit negative space for non-`<section>` consumers.** The wrapper is not
  a one-size-fits-all replacement: `<footer>`, decorative non-semantic `<div>`
  strips, and `<div>` wrappers around components that already own a
  `role="region"` landmark have legitimate reasons to stay outside the wrapper.
  The boundary needs a documented rule, not a heuristic each author re-derives.

### Evaluated approaches

1. **No wrapper — every site continues to import `sectionBackground` directly.**
   Rejected. The mismatch-bug class would stay open: a direct importer can still
   write
   `class:list={[sectionBackground.default, 'dark:bg-background-dark-muted']}`
   and reintroduce the bug. The wrapper is the artefact that closes the bug
   class structurally.
2. **One wrapper for all sites, including non-`<section>` semantics.** Rejected.
   Forcing `<Section>` (which renders as `<section>`) onto `<footer>`,
   `<aside>`, or decorative `<div>` strips would either change the semantic
   markup (regression), nest landmarks (duplicate-landmark regression where the
   wrapped child already provides `role="region"`), or require an `as` prop that
   turns `<Section>` into a generic element-renderer with conditional logic per
   element type. The negative-space carve-out is cheaper and clearer than that
   complexity.
3. **Wrapper for sweep-class `<section>` consumers; direct map consumption for
   non-`<section>` semantics, for `<div>` wrappers around components that
   already own a region landmark, and for components that own their own shell
   with multiple style concerns** (e.g. `Content.astro`, `ProcessSteps`).
   **Chosen.**

## Decision

The project sanctions two consumption shapes for `sectionBackground`, governed
by a mechanical decision tree, plus one class-list join-order convention.

### Shape 1: `<Section>` wrapper (the default for new section shells)

A new component `src/components/ui/Section.astro` is the **default** path for
any new or migrated section shell whose root element is semantically a
`<section>` and where making it a `<section>` does not break a downstream
landmark contract. It owns the `sectionBackground` lookup; call-sites pass the
variant as a typed prop and never see the literal class string.

API (illustrative — full code lives in `Section.astro`):

```typescript
type Props = {
  /** Required background variant — picks the class pair from sectionBackground. */
  background: SectionBackground;
  /** Optional id forwarded to the rendered <section>. */
  id?: string;
  /** Optional aria-labelledby forwarded to the rendered <section>. */
  ariaLabelledby?: string;
  /** Additional CSS classes appended after the variant class via class:list. */
  class?: string;
  /** Arbitrary data-* attributes forwarded to the rendered <section>. */
  [key: `data-${string}`]: string | boolean;
};
```

```astro
<section
  id={id}
  aria-labelledby={ariaLabelledby}
  class:list={[className, sectionBackground[background]]}
  {...rest}
>
  <slot />
</section>
```

Notes on each prop choice:

- `background` is required. No default. A missing variant is a compile error,
  not a silent fall-through to `default`.
- `ariaLabelledby` (camelCase, lowercase 'b') is forwarded as `aria-labelledby`
  on the rendered element. The camelCase form mirrors `Modal.astro`'s
  `ariaLabelledby` prop. The repo also has `ariaLabelledBy` (capital 'B') in
  `FilterBar.astro`; the chosen `ariaLabelledby` form is correct for `<Section>`
  because both Modal and Section are single-element wrappers in
  `src/components/ui/` with a single labelling concern.
- `class` is forwarded and concatenated with the background class via
  `class:list`. Join order is fixed (see "Class-list join-order convention"
  below).
- Arbitrary `data-*` attributes are typed via the index signature
  `[key: \`data-\${string}\`]: string |
  boolean`, then flow through `{...rest}`after the named-prop destructure. This is load-bearing for`data-services-filter`/`data-service-map={…}`on`ServicesCatalog`, which the `servicesFilterController`reads from the same element that owns the background. The signature mirrors`FormSelect.astro:31`exactly so the two`data-\*`-forwarding components in `src/components/ui/`
  share one pattern.
- Default slot only. Headline / intro slots are out of scope; those belong to
  `SectionHeader` / `Content`-level concerns.
- The root element is always `<section>`. There is no `as` prop. Sites whose
  root is not semantically a `<section>` (or where making it one would break a
  landmark contract) do not use `<Section>` — see Shape 2 below.

The wrapper does **not** own padding. Call-sites continue to pass padding
utilities via `class`. Rationale: the 14 sweep sites use 7 distinct padding
configurations (`px-6 py-24 sm:py-32 lg:px-8`, `py-24` only,
`relative isolate overflow-hidden pt-14`, `px-6 py-16`, `pb-16` only, no padding
at all, etc.). A default-preset model would force opt-out at half the sites; a
named-preset model would multiply the API surface for no demonstrated naming
hierarchy. Owning no padding preserves the rendered class set at every call-site
and keeps the wrapper's responsibility narrow: **variant-to-class-string lookup
plus attribute forwarding**, nothing more.

### Shape 2: Direct `sectionBackground[X]` consumption (the negative-space carve-outs)

Four cases consume `sectionBackground` directly without going through
`<Section>`:

1. **The element's semantic role is not `<section>`.** Examples in the current
   codebase: `Footer.astro` (`<footer>`), `pages/services/index.astro:225` (a
   flush-continuation `<div>` strip with no heading and no `aria-labelledby`),
   `pages/success-stories/[slug].astro` (its various `<aside>` and section-shell
   internals). Wrapping these in `<Section>` would either change the semantic
   markup or nest `<section>` inside `<footer>` / `<aside>` (semantically
   wrong).
2. **The element is a presentational `<div>` wrapping a component that already
   owns a `role="region"` landmark with `aria-labelledby`.** Examples:
   `pages/index.astro:122` (Final-CTA `<div>` wrapping `<CTA>`),
   `pages/success-stories/[slug].astro:189-205` (CTA band `<div>` wrapping
   `<Cta>`). Upgrading the `<div>` to a `<section>` would create a duplicate
   landmark — the wrapped component's `role="region"` plus an outer unnamed
   `<section>` are two landmarks where one suffices and the outer one has no
   accessible name. The `[slug].astro` site documents this pattern explicitly.
3. **Section adapters that already wrap `Content.astro`.** `Stats.astro`,
   `Coaches.astro`, `Services.astro`, `SuccessStories.astro`, `Usps.astro`,
   `Testimonial.astro` either delegate to `Content.astro` (which itself consumes
   the map directly) or own their full shell because they have layout concerns
   beyond background-painting (e.g. `Testimonial.astro`'s header strip with
   `bg-foreground-950`). They are not retroactively migrated to `<Section>`.
   Rationale: they already own typed boundaries over their own concerns;
   threading their slot composition through one more wrapper would add a node
   without removing duplication.
4. **Components that own their own shell with multiple style concerns.**
   `ProcessSteps.astro` paints its own `<section>` with size-keyed padding, list
   rhythm, step rhythm, and a background variant. Its background lookup happens
   inside an inline-pick
   (`{ default: sectionBackground.default, muted: sectionBackground.muted } satisfies Record<NonNullable<Props['background']>, string>`)
   so the narrower `'default' | 'muted'` Prop union retains compile-time
   exhaustiveness. Wrapping the component in `<Section>` would split its single
   shell into nested elements; the inline pick is the right shape here.

### Shape 3: Hardcoded with a JSDoc note (the lone outlier)

UI primitives that coincidentally use a section-variant string but are not
section-rhythm participants stay hardcoded with a JSDoc note documenting the
divergence from ADR-0014's remit. Today this applies only to `Modal.astro:56`'s
`<el-dialog-panel>`, which paints `bg-background dark:bg-background-dark` for
visual reasons unrelated to section rhythm. A future debt-auditor pass may
revisit; for now the JSDoc note is the artefact.

### Class-list join-order convention

When concatenating call-site classes with the variant lookup, the order is
**padding/layout utilities first, variant class last**:

```astro
<!-- Correct -->
<section
  class:list={['px-6 py-24 sm:py-32 lg:px-8', sectionBackground[background]]}
>
  <div class:list={['flex justify-center pb-16', sectionBackground.muted]}>
    <!-- Incorrect -->
    <section
      class:list={[
        sectionBackground[background],
        'px-6 py-24 sm:py-32 lg:px-8',
      ]}
    >
    </section>
  </div>
</section>
```

The `<Section>` wrapper's internal join uses the same order:

```astro
<section class:list={[className, sectionBackground[background]]} ...></section>
```

This is a de-facto convention across 11 existing call-sites: `Content.astro:89`,
`Services.astro:83`, `Testimonial.astro:39`,
`success-stories/[slug].astro:113,157,181,196,212`,
`SuccessStoryCoachCard.astro:57`, `SuccessStoryHero.astro:55`,
`TestimonialGrid.astro:63`. Codifying it here makes the rule explicit so the
wrapper's internal join and every direct-importer addition stay consistent.
Tailwind's specificity is class-set-driven, not source-order-driven, so the
order is chosen for grep-readability, not for visual correctness.

**Note on source-form `class="..."` literals.** Tailwind classes inside a
source-form `class="..."` string are sorted by `prettier-plugin-tailwindcss`
(currently: background utilities before padding utilities), which is the
opposite of this convention. The wrapper avoids the conflict by construction:
the `class` prop string at the call-site contains only caller-supplied utilities
(no variant class), and the variant class is appended at runtime via
`class:list`. Direct-importer call-sites achieve the same property by keeping
the variant in a `class:list` array entry rather than mixing it into a literal
string. New section-shell sites that mix variant and caller utilities in a
single `class="..."` literal will be sorted by Prettier and deviate from the
convention; route them through `<Section>` or the direct import to stay
consistent.

### Negative-space verification (decision tree for new section-shell additions)

```
Is the element's root tag semantically a <section>?
│
├─ No (it is <footer>, <aside>, <nav>, <main>, <div>, ...)
│       → Shape 2: consume sectionBackground[X] directly at the literal-
│         string site, with the padding-first / variant-last class:list
│         join order. Document the element-type reason in a one-line
│         comment.
│
├─ Yes — it is a <section> today, OR
│        it is a <div> wrapping a component that already provides a
│        role="region" landmark with aria-labelledby (e.g. <CTA>, <Cta>)
│        — in this case making it a <section> would create a duplicate
│        landmark, so it stays Shape 2.
│
└─ Yes, no landmark conflict
    │
    └─ Does the component own multiple style concerns beyond the
       background (size-keyed padding, multi-variant text rhythm,
       conditional layout)?
       │
       ├─ Yes → consume sectionBackground via inline-pick or direct
       │        lookup inside the component's existing style map
       │        (e.g. ProcessSteps.astro).
       │
       └─ No  → use <Section background="X" class="…">…</Section>.
                This is the default for new section shells.
```

The first question is mechanical: is the rendered element a `<section>`, or
could making it one create a new unnamed landmark or a duplicate landmark? Both
checks are inspection-time, not judgment-time:

- "Is it a `<section>`?" — read the markup.
- "Would making it a `<section>` introduce a landmark conflict?" — check whether
  the immediate child component renders `role="region"` (grep for
  `role="region"` in the wrapped component) or whether the call-site exposes an
  `aria-labelledby` heading. If yes to either, keep the current element type.

The second question (multi-concern shell) is also mechanical: does the component
already own a `styles` object or a size-keyed map for non- background concerns?
If yes, keep the inline-pick.

### What does NOT change

- [ADR-0014](0014-light-mode-section-background-system.md) is unchanged. This
  ADR extends its adoption shape, not the variant set or the colour contract.
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) (extract- first)
  is unchanged. `<Section>` is itself a typed extract; its existence is
  consistent with extract-first.
- The existing section adapters (`Stats`, `Coaches`, `Usps`, `SuccessStories`,
  `Services`, `Testimonial`, `Content`, `SectionHeader`, `successStories/*`
  shells, `success-stories/[slug].astro` shells) keep their current direct-map
  shape. No retroactive sweep through `<Section>` for components already
  correctly consuming the map.
- Modal's hardcoded class string stays, with a JSDoc note added per the sweep
  task's OQ 3 owner answer.

### Scope and non-goals

**In scope:**

- The `<Section>` API surface (props, padding model, slot model, root element).
- The negative-space rule and decision tree for direct `sectionBackground[X]`
  consumption.
- The class-list join-order convention.
- Cross-references in `docs/CONVENTIONS.md` and `docs/ARCHITECTURE.md`.

**Out of scope:**

- Retroactive migration of existing correct consumers to `<Section>`.
- Padding-preset systems, `as`-prop generic-element rendering, or
  `<Section>`-internal headline/intro slots (these add API surface for
  speculative needs; if a future task surfaces them, a follow-up ADR evaluates
  them on evidence).
- Any `sectionHeadline` / `sectionText` consumption-shape changes — unaffected
  by this decision.

## Consequences

### Positive

- **Mismatch-bug class closed structurally.** A typed
  `background: SectionBackground` prop cannot encode a class-pair without a
  single variant identity. The three existing mismatches
  (`pages/index.astro:122`, `Contact.astro:52`, `Contact.astro:57`) are repaired
  in the sweep task; future sites cannot reintroduce the bug shape.
- **One default consumption shape for new section shells.** Future maintainers
  (human or AI) consult one component and one ADR.
- **Class-list join-order is explicit.** The de-facto convention is now written
  down. New direct-importer sites and the wrapper's internal join stay
  consistent.
- **Future map evolution becomes a one-file change for the wrapped bulk.** When
  the silver hex was revised by
  [ADR-0032](0032-revise-silver-surface-for-aa.md), every direct importer
  required a downstream check. After this ADR, the wrapped sites are insulated.
- **Explicit negative space.** The four direct-consumption carve-outs are
  documented, not derived per-author. New `<footer>` / `<aside>` /
  decorative-strip / CTA-wrapper authors do not need to re-evaluate the wrapper
  choice each time.

### Negative

- **Two competing consumption shapes** (`<Section>` vs direct
  `sectionBackground[X]`). Mitigated by the decision tree above and the
  negative-space carve-out being mechanical (root-element semantics +
  landmark-conflict check + multi-concern-shell test). A reviewer can decide
  each new site in seconds.
- **Wrapper overhead for the simplest sites.** Sites that previously read as
  `<section class="...">…</section>` now read as
  `<Section background="X" class="...">…</Section>`. The cognitive cost is one
  extra import and one prop. The trade-off is the bug-class closure and the
  future map-revision insulation.
- **No padding consolidation.** The wrapper deliberately does not own padding;
  the 14 sweep sites continue to author their own padding utilities. If a future
  audit shows a tight cluster of identical padding strings emerging, a follow-up
  ADR may add a `padding`-preset prop — this ADR does not pre-empt that
  decision.

### Risk mitigation

- **Wrapper drift into a god-component.** Mitigated by the explicit no-padding,
  no-headline-slot, no-`as`-prop decisions above. The component does one thing:
  variant-to-class-string lookup plus attribute forwarding. Adding scope
  requires a new ADR.
- **Negative-space misapplication** (someone uses direct map consumption for a
  sweep-class `<section>` site to skip the wrapper, or wraps a CTA-bearing
  `<div>` in `<Section>` and creates a duplicate landmark). Mitigated by the
  decision tree above and by the `<Section>` Vitest test, which serves as live
  documentation of the wrapper's API.
- **Forwarded slot trap.** `<Section>`'s default slot is forwarded through to
  its root `<section>`. If a future caller wraps `<Section>` in an outer adapter
  that forwards a slot in turn, and `<Section>` starts gating visible markup on
  slot presence, the
  [ADR-0036](0036-content-aware-slot-detection-in-forwarded-slots.md)
  render-and-trim rule applies. Today `<Section>` does not gate any visible
  markup on slot presence — the slot is always rendered, and the ADR-0036 trap
  does not apply. If future API growth introduces such gating, the rule applies
  at that point, not speculatively now.
- **Class-list join-order inversion.** The wrapper's internal join is
  `class:list={[className, sectionBackground[background]]}` — caller classes
  first, variant last. Inverting this in a future refactor would silently change
  rendered HTML byte-output for every wrapped site (the visual would be
  unaffected because Tailwind's specificity is set-based, but the
  `/how-it-works` byte-identity check at the sweep task's acceptance § E.2 would
  break). The convention is now documented here so a reviewer catches the
  inversion.

## Compliance

After the sweep task lands, the following files consume `sectionBackground`
through `<Section>` (Shape 1):

- `src/pages/contact/thanks.astro`
- `src/pages/how-it-works/index.astro` (Bottom-CTA)
- `src/pages/coaches/index.astro` (Bottom-CTA)
- `src/pages/success-stories/index.astro` (Stories Grid + Bottom-CTA)
- `src/pages/services/index.astro` (Bottom-CTA at line 230)
- `src/components/sections/Contact.astro` (outer shell, repaired to `default`)
- `src/components/sections/HeroSplit.astro`
- `src/components/sections/services/ServicesCatalog.astro`
- `src/components/ui/Accordion.astro`

The following files consume `sectionBackground` directly (Shape 2):

- `src/components/navigation/Footer.astro` (`<footer>`, not `<section>`)
- `src/pages/services/index.astro:225` (decorative continuation `<div>`)
- `src/pages/index.astro:122` (Final-CTA `<div>` wrapping `<CTA>` —
  duplicate-landmark carve-out, repaired to `default`)
- `src/components/sections/Contact.astro:57` (inner decorative `<div>`, repaired
  to `muted`)
- `src/components/sections/howItWorks/ProcessSteps.astro` (inline-pick from
  `sectionBackground`, owns multi-concern shell)
- All existing pre-sweep direct importers listed in the sweep requirements doc §
  Non-Scope (`Content.astro`, `Stats.astro`, `Coaches.astro`, `Services.astro`,
  `SuccessStories.astro`, `Testimonial.astro`, `Usps.astro`,
  `SectionHeader.astro`, `success-stories/[slug].astro`,
  `successStories/SuccessStoryHero.astro`,
  `successStories/SuccessStoryCoachCard.astro`,
  `successStories/TestimonialGrid.astro`)

The following file remains hardcoded with a JSDoc note (Shape 3):

- `src/components/ui/Modal.astro:56` — `<el-dialog-panel>` UI surface, not a
  section-rhythm participant.

A future `debt-auditor` pass over
`rg "bg-background[-muted]? dark:bg-background-dark"` against `src/` may
re-evaluate the Shape-2 and Shape-3 sites. That pass is not part of this ADR.

## References

- [ADR-0014](0014-light-mode-section-background-system.md) — originating
  decision; this ADR extends its adoption shape.
- [ADR-0017](0017-domain-data-integrity-pattern.md) —
  `as const satisfies Record<>`; the `<Section>` API uses `satisfies` for its
  background lookup, and `ProcessSteps.astro` retains the inline-pick
  `satisfies` shape for narrow-union exhaustiveness.
- [ADR-0032](0032-revise-silver-surface-for-aa.md) — the historical
  silver-revision example that motivates "future map-revision insulation" in the
  Positive consequences.
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) — extract-first
  composition; `<Section>` is consistent with this rule as a typed extract.
- [ADR-0036](0036-content-aware-slot-detection-in-forwarded-slots.md) —
  render-and-trim slot detection; cited in Risk mitigation for the
  not-yet-applicable forwarded-slot case.
- [ADR-0037](0037-adopt-astro-container-api-for-component-tests.md) — Container
  API; the `<Section>` Vitest follows the canonical `renderAstro` shape.
- `docs/reference/color-system.md` — full colour spec referenced by ADR-0014.
- `.claude/work/2026-04-26-adr-0014-section-background-sweep/01-requirements.md`
  — owner-approved sweep requirements that drove this ADR.
- `.claude/work/2026-04-26-adr-0014-section-background-sweep/02-concept.md` —
  Phase-2 concept doc that produced this ADR.
