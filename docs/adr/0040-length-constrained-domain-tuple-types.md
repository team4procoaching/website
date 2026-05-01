# Length-Constrained Domain Tuple Types

Date: 2026-04-29

## Status

Accepted

## Context

Several places in the project produce arrays of homogeneous elements that are
ultimately consumed by a visual contract with a fixed-size budget. The canonical
example, and the one that motivated this ADR, is the success-story detail page:
`StoryDetail.processStats` and `StoryDetail.results` are `readonly Stat[]`
arrays, each rendered through `StatsGrid.astro`, whose staggered scroll-reveal
animation is implemented via eight `:nth-child(1)` through `:nth-child(8)` rules
in `src/styles/global.css`. A ninth tile would render correctly but lose its
`transition-delay` and break the staggered cascade — a soft visual regression
the existing build pipeline does not flag.

Until now the cap was carried by JSDoc on `StatsGrid.astro` ("keep `stats` at
eight entries or fewer if the staggered reveal matters"). JSDoc is non-binding —
a future content author who types nine entries in a story's `processStats` sees
no compile error, no test failure, no build failure. The constraint disappeared
into a comment. This ADR captures the pattern that closes the gap.

### Decision drivers

- The project's typed-boundaries philosophy: drift in domain data should surface
  at compile time wherever the constraint can be expressed in the type system.
- The AI-first working principle: future maintainers and AI tools rely on type
  signals to learn the design. JSDoc requires reading; types require passing.
- The realistic blast radius. Tightening at a primitive Prop (e.g.
  `StatsGrid.Props.stats`) forces every caller — including the homepage call
  site that derives its array via `Object.values(record)` — to either cast to a
  tuple or route through a dedicated transform. Tightening at the authoring
  surface (the domain type that describes the content) catches the realistic-bug
  surface (a story author types a ninth metric) without imposing tuple shape on
  consumers that do not need it.

### Evaluated approaches

The requirements analysis for this task evaluated four solution classes in
detail. Summary:

1. **Typed length-constraint at the component Prop boundary (A-prop).** Tighten
   `StatsGrid.Props.stats` to a tuple. Forces a cast or transform helper at the
   homepage `Object.values(record)` call site, where the data already has
   compile-time integrity via `as const satisfies Record<>`. Rejected: adds
   friction at the only site where the constraint is already independently
   guaranteed.
2. **Typed length-constraint at the content boundary (A-content). Chosen.**
   Tighten the domain types whose values feed the visual contract.
   `StatsGrid.Props.stats` stays a generic `readonly Stat[]`. The constraint
   lives where the bug is introduced — the authoring surface.
3. **Runtime warning (B).** A `console.warn` or dev-time `throw` inside the
   StatsGrid frontmatter when `stats.length > 8`. Wrong layer for a project that
   prioritises typed boundaries; weakest enforcement variant.
4. **Extend the CSS rules (C).** Add `:nth-child(9)` etc. Solves the wrong
   problem — the cap is not the bug, the lack of enforcement is.
5. **Deliberate acceptance (D).** Record the soft cap in
   `docs/debt/REGISTER.md`. Honest about cost-benefit at the current consumer
   scale, but rejected after the owner weighed long-form story content (8+
   metrics) as a plausible future state worth catching at compile time.

## Decision

When a domain type's value will be rendered through a visual contract whose size
budget is fixed, tighten the domain type to a length-bounded shape over the
element type. The shape lives next to the domain type in the data module, not in
a shared types module, because its length bound is specific to the consuming
visual contract, not to the element shape.

The canonical shape is a 1..N-arm union of fixed-length required-slot tuples:

```typescript
type DomainCollection =
  | readonly [Element]
  | readonly [Element, Element]
  | /* …one arm per length, up to N… */
  | readonly [Element, Element, /* …N times… */];
```

Each arm is a fixed-length tuple over the element type. The shortest arm
enforces the lower bound (1 here, in line with `min-1`); the longest arm
enforces the upper bound. A literal of length 0 or N+1 fails `astro check` /
`tsc` with a `Source has X element(s) but target requires/allows N` diagnostic
against the longest arm of the union.

The constraint is asserted in tests with a `// @ts-expect-error`-bearing
negative case alongside a positive case at the maximum length, so a future
refactor that accidentally widens the union back to `readonly Element[]` is
caught by the test as well as by the consumer types.

### What does NOT change

- **Component Prop types.** Primitive UI components like `StatsGrid.astro` whose
  Props accept a homogeneous list keep their `readonly T[]` Props. The
  constraint is upstream, at the authoring surface; the component remains a
  generic primitive. Callers that hand-author inline literals (e.g. the homepage
  stats strip, the services-page evidence strip) own their own cap discipline
  locally — typically a 2–4-element literal far below the cap.
- **`as const satisfies Record<>` (ADR-0017).** Length-constrained tuples apply
  to homogeneous-element collections; the data-integrity Record pattern applies
  to ID-keyed catalogues. The two patterns sit alongside each other and address
  different invariants. A field can use both shapes if it is both ID-keyed and
  length-bound, but the only example today (`successStories.ts`) is a
  homogeneous list, not a catalogue.
- **Visual budgets that are CSS-enforced and ≤2 entries.** A binary before/after
  pair, a trinary three-card row whose layout breaks at 4: those are usually
  expressed as fields with explicit names (`before`, `after`) rather than
  arrays. This ADR does not retro-apply to such fields.

### Scope and non-goals

**In scope:**

- Domain types whose array fields feed a visual contract with a fixed-size
  budget the type can express.
- Tuples over the same element type the array used (no new element shape
  introduced — the tuple narrows the _length_, not the _contents_).

**Out of scope:**

- Branded types or runtime guards as a substitute for the tuple. Those are
  cheaper to add later than to remove later; the tuple shape is the defensible
  default.
- Generalised "length-bounded array" utility types (e.g. a generic
  `BoundedArray<T, N>`). A 1..N union of fixed-length tuples covers the cases at
  hand with less indirection. A utility may earn its place when three or more
  unrelated domains converge on the same shape.
- Migration of CMS-backed content. Once a domain moves to MDX or a headless CMS,
  the TypeScript-side tuple no longer applies; the editor learns about the limit
  through a build failure or a CMS-side schema. Acknowledged as a known
  limitation of this pattern.

## Consequences

### Positive

- **Compile-time enforcement at the authoring surface.** A story author who adds
  a ninth metric to `processStats` or `results` sees a TypeScript error before
  the rendered animation is silently degraded.
- **No friction at downstream consumers.** Each arm of the union is a
  fixed-length tuple over the element type alone (no `T | undefined` leaking
  in), so the union widens cleanly to `readonly Element[]`. All existing
  consumers (`SuccessStoryHero`, `SuccessStoryResultsGrid`, `[slug].astro`)
  type-check unchanged. Component primitives stay generic.
- **Documentation co-location.** The tuple alias's JSDoc carries the rationale
  ("matches the eight-rule stagger range in `global.css`") next to the type, so
  future readers find the explanation by hover, not by archaeology.
- **Test-asserted invariant.** A `// @ts-expect-error` negative case in the
  domain's test file fails when the union is widened back to an array,
  preventing silent loss of the constraint in a future refactor.

### Negative

- **Verbose error message.** A 9-element literal produces a message like "Source
  has 9 element(s) but target allows only 8" — structurally accurate but does
  not surface the visual reason. Mitigated by JSDoc on the tuple alias and by
  this ADR's existence. The empty-literal case (a `min-1` violation) reports
  against the longest arm of the union — the diagnostic reads
  `Source has 0 element(s) but target requires N` rather than `requires 1`.
  Structurally accurate; one-line JSDoc on the alias spells out the actual
  `1..N` range.
- **Verbose alias declaration.** An N-arm union takes N lines (vs. one line for
  a variadic-optional shape). The verbosity is one-time-read; ADR-0040 treats it
  as the cost of an enforcement shape that survives TypeScript subtyping rules.
- **Two sources of truth for the numeric cap, partially mitigated by paired
  anchor comments.** The cap (8) lives in the `:nth-child` rule range in
  `global.css` _and_ in the tuple shape. The implementing PR adds a paired
  anchor-comment pair (one on the TS alias pointing at the CSS file, one above
  the CSS rule block pointing at the tuple alias) so a future maintainer who
  edits one side has a discoverable pointer to the other. The residual risk is
  therefore rename/renumber-without-pair-update — a maintainer who renames
  `StoryStats` or extends the CSS to nine selectors without touching the
  matching anchor — rather than nobody-knows-they-are-paired. Acceptable cost
  for a number that has never moved and is unlikely to.
- **CMS migration drops the guard.** Once the success-story content moves out of
  TypeScript, the tuple goes with it. The editor will hit the build failure or a
  CMS-side schema. Acknowledged; the guard buys enforcement for the
  TypeScript-authored era, not forever.
- **Adds shape conceptually adjacent to ADR-0017.** A reader may wonder whether
  the two patterns conflict. They do not — they cover different invariants — but
  the boundary is now another pattern to learn.

### Risk mitigation

- The verbose error message is mitigated by JSDoc and by ADR cross-reference in
  the JSDoc body.
- The two-sources-of-truth issue is mitigated by the anchor-comment pair added
  in the introducing PR: the tuple alias carries a comment naming the CSS
  source, and the CSS rule block carries a matching comment naming the tuple
  alias. Renaming or renumbering either side without updating the other is the
  residual failure mode and relies on the maintainer noticing the
  cross-reference on grep.

## Success criteria

- Adding a ninth element to any tuple-typed field (`StoryDetail.processStats`,
  `StoryDetail.results`) is a TypeScript error caught by `astro check` / `tsc`.
- The test asserting the cap fails when the union is widened back to a generic
  array.
- No downstream consumer of the tuple-typed fields requires a new cast or
  helper; all existing consumers type-check without modification. The shape was
  empirically validated against the consuming call sites
  (`SuccessStoryHero.astro:125`, `[slug].astro:153`,
  `SuccessStoryResultsGrid.astro:48`, `pages/index.astro:91`,
  `pages/coaches/index.astro:55`, `ServicesCatalog.astro:148`); `pnpm typecheck`
  is clean before and after the introducing PR. The variadic-optional shape
  (`readonly [T, T?, …]`) was rejected because TS treats `T?` slots as
  `T | undefined`, breaking subtyping into `readonly T[]`.

## References

- [ADR-0017: Domain Data Integrity Pattern](0017-domain-data-integrity-pattern.md)
  — companion compile-time enforcement pattern for ID-keyed catalogues.
  Length-constrained tuples and `as const satisfies Record<>` are the two shapes
  in the project's compile-time data-integrity family.
- [ADR-0015: Animation and Motion System](0015-animation-and-motion-system.md) —
  establishes `data-animate-stagger` and the `:nth-child` stagger rule range
  that the cap matches.
- The full evaluation of the four solution classes (A-prop, A-content, B, C, D)
  and the call-site impact analysis was recorded in the requirements artefact
  for this task and removed with the worktree on merge. The Decision section
  above summarises the chosen path; the rejected alternatives are listed in
  §Evaluated approaches.
- [TypeScript variadic tuple types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types)
  — language feature underpinning fixed-length tuples; the union of arms is the
  shape the ADR canonicalises.
