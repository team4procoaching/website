# Inline-First Page Composition

Date: 2026-04-23

## Status

Superseded by [ADR-0034](../0034-extract-first-for-ai-assisted-development.md)

> **Why this was superseded (same day, 2026-04-23).** A design review within
> hours of acceptance identified that (1) the "organic convergence" duplicate
> detection depends on reviewer discipline with no tool-level enforcement, and
> (2) the block-adoption friction argument assumes human typing costs that do
> not apply under AI-assisted code generation. The decision was reversed to an
> extract-first default. See ADR-0034 for the new policy; the Context and
> Decision below are preserved as a historical record of the reasoning that was
> considered but not retained.

## Context

A survey of the repository in April 2026 showed that **31 of 53 Astro components
(58 %) have exactly one consumer**, and the ratio has been increasing: recent
feature branches have added roughly three single-use components per new page.

Two forces converged to produce this pattern:

- **An unwritten default.** When a new page section was designed, the reflex was
  to extract it into its own component file — even when the markup had no shared
  consumer and no internal logic. The section became a component because "that
  is how sections are done," not because extraction earned its keep.
- **External block sources pull the other way.** The project adopts markup
  patterns from Tailwind Plus (already registered in
  [ADR-0019](../0019-use-tailwindplus-elements-for-interactive-ui.md)), HyperUI,
  and Astro theme marketplaces. These sources ship **inline markup intended for
  the page file**, not component APIs. Re-wrapping every block into a dedicated
  `.astro` file with `Props` types adds friction without adding reuse.

The symptoms of over-extraction are visible in the tree:

- Wrapper components that only render a `.map()` over data with a card element
  (`TestimonialGrid` wrapping `TestimonialCard`, `Usps` wrapping `UspCard`).
- Page-specific hero and card variants that are imported exactly once.
- JSDoc blocks explaining constraints that would read equally well as inline
  comments in the page that consumes them.

This is not broken code — the existing extractions are well-typed and
well-documented. It is a drift in the default question that produces more files
than the project actually benefits from.

### Decision drivers

- Keep the whole page intent-of-reading in one file where reasonable — a
  300-line page that tells a linear story beats a 100-line page that delegates
  to six single-use files.
- Make adoption of external blocks (Tailwind Plus, HyperUI, Astro themes) the
  path of least resistance.
- Preserve the real wins of component extraction — shared primitives, logic
  containment, reusable shells — without applying the same discipline to
  page-specific markup that has no shared consumer.

### Evaluated approaches

1. **Extract-first (status quo).** Every meaningful page section becomes its own
   `.astro` component. Rejected: produces the 58 %-single-use ratio documented
   above, fights the inline nature of external block sources, and grows the
   component surface faster than the page surface without reuse returns.
2. **Inline-only.** No component extraction except for a fixed list of
   primitives. Rejected: loses the legitimate value of extraction for shared
   primitives, shells with layout responsibilities, and components with
   non-trivial client-side logic.
3. **Inline-first with extraction criteria.** Default to inline markup inside
   the consuming page, extract only when specific criteria apply. **Chosen.**

## Decision

**New UI structure lives inline in the consuming `.astro` file**, unless at
least one of three criteria applies:

1. **Shared consumer count.** The same markup is used by two or more pages or
   components today, **or** a second consumer is concretely planned in the same
   work unit (not a hypothetical future need).
2. **Non-trivial logic or state.** The component contains client-side
   controllers, form state, modal triggers, or enough TypeScript derivation that
   embedding it in the page would dominate the page's frontmatter.
3. **Shared primitive or shell.** The component is a universal building block
   (`Button`, `CtaButton`, `TextLink`, `SmartImage`, `PullQuote`, `StatsGrid`,
   `Content`) or a structural shell (`BaseLayout`, `Header`, `Footer`, `Modal`)
   that participates in cross-cutting layout or document concerns.

If none of these criteria applies, the markup stays inline in the page.

Constraints, design rationale, and accessibility notes that would otherwise live
in a component JSDoc header live as inline comment blocks at the corresponding
section of the page, next to the markup they explain.

### What does NOT change

- **[ADR-0007](../0007-component-folder-structure.md)** still governs folder
  placement for any component that _is_ extracted — `sections/` by domain, `ui/`
  for primitives, `navigation/` for nav, `layout/` for shells.
- **[ADR-0009](../0009-use-types-for-component-props.md)** (`type` for Props)
  still applies to any extracted component.
- **[ADR-0013](../0013-use-named-exports-for-data-modules.md)**,
  **[ADR-0017](../0017-domain-data-integrity-pattern.md)**, and other
  data-module rules are untouched — this ADR is about page markup composition,
  not data.
- **Existing single-use components are not mass-refactored.** Retro cleanup is
  an opt-in effort (separate PRs), not a mandate. A component is revisited when
  it is touched for an independent reason, or when a scoped audit decides to
  inline it.
- **Page length is not a reason to extract.** Astro compiles long pages as
  cheaply as short ones. A 300–400-line page with linear flow is acceptable and
  often preferable to a short page that jumps across files.

### Scope and non-goals

**In scope:**

- The default question when designing a new page section or block: _"does this
  need to be its own component, or can it be inline?"_
- The set of criteria that justify extraction at the point of creation.
- Where JSDoc-style rationale lives when extraction does not happen.

**Out of scope:**

- Retro-refactoring existing single-use components (handled case by case in
  separate PRs).
- Style, layout, accessibility, or animation conventions (covered by other
  ADRs).
- Controller-extraction thresholds for client-side scripts (covered by
  `docs/CONVENTIONS.md` → Client-Side Scripts and
  [ADR-0020](../0020-client-side-script-strategy-revised.md)).

## Consequences

### Positive

- **Linear readability.** A page's full information architecture is visible on a
  single file scroll — useful for reviewers, for the owner, and for AI-assisted
  design sparring that reasons about section ordering.
- **Frictionless block adoption.** Tailwind Plus, HyperUI, and Astro theme
  blocks land as inline markup directly — no intermediate component-API design
  step.
- **Lower file-count cognitive load.** The single-use ratio trends down over
  time. Fewer files to navigate in IDE fuzzy-find and fewer JSDoc headers to
  maintain.
- **Extraction becomes meaningful.** When something _is_ extracted, the reader
  can assume there is a real reason (shared use, logic, primitive) — extraction
  stops being noise.

### Negative

- **Longer page files.** Pages with rich compositions run 300–400 lines,
  occasionally more. Navigation inside a single file requires anchor comments or
  editor outline features.
- **Markup duplication risk.** When two pages converge on similar but not
  identical markup, the inline-first default makes the duplication visible
  rather than hidden behind a component wrapper. This is a feature — real
  convergence triggers extraction organically — but it requires discipline to
  notice.
- **Reflex resistance.** "Should I extract this?" becomes an active decision at
  design-sparring time rather than a default. This adds one explicit check per
  section.

### Risk mitigation

- **Phase-2 design sparring (CLAUDE.md)** adds an explicit check: for each new
  UI block, state whether it meets an extraction criterion. If none, it stays
  inline.
- **Organic convergence, not preemptive abstraction.** When a second consumer
  appears for inline markup, extract _at that moment_ — not before. The
  duplication between first and second consumer is the evidence that the pattern
  is real.
- **Anchor comments for long pages.** Pages over ~250 lines use numbered or
  named comment blocks (`{/* 1. Hero */}`, `{/* 2. Narrative */}`) so readers
  can navigate the file by outline.

## Success criteria

- The project-wide single-use-component ratio trends downward over the next
  several feature cycles.
- New feature branches add at most one new component per new page on average,
  with the rest of the feature landing as inline markup.
- External-block adoptions (Tailwind Plus, HyperUI, Astro themes) land as inline
  page markup in the majority of cases, with extraction reserved for blocks that
  meet the criteria above.

## References

- [ADR-0007 — Component folder structure](../0007-component-folder-structure.md)
- [ADR-0009 — `type` for Props](../0009-use-types-for-component-props.md)
- [ADR-0019 — @tailwindplus/elements](../0019-use-tailwindplus-elements-for-interactive-ui.md)
- `CLAUDE.md` — Phase 2 design sparring, "Don't add features beyond what the
  task requires"
- `docs/CONVENTIONS.md` — Component Composition
