# Filter vs. Selection: Two Distinct Interaction Primitives

Date: 2026-04-16

## Status

Accepted

## Context

The project uses interactive "pill-style" controls in two different contexts:

1. **Pricing toggle** on the Services page — pure local selection, no side
   effects. Switching between `Monthly`, `6 Months`, `12 Months` drives CSS-only
   visibility changes via `:checked` and `:has()` selectors.
2. **Category filter** on the Services page — filtering with side effects.
   Switching between `All`, `Bodybuilding`, `Athletic`, `Wellness` updates URL
   state, handles deep-links from the Quiz, manages scroll behavior, and toggles
   `aria-pressed` on buttons.

Visually, these controls look nearly identical. Conceptually, they are
fundamentally different:

- **Selection** is a local state change. The user picks one option out of
  several, and the UI responds. No URL, no scroll, no persistence.
- **Filter** is navigation-adjacent. It changes what is visible on the page,
  deserves URL state so it can be shared or bookmarked, and integrates with
  deep-link flows (Quiz results, external links).

A previous iteration considered extending the existing CSS-only
`SegmentedControl` component with optional JavaScript for filter behavior. That
would have broken the component's CSS-only contract — any consumer relying on
"no JS required" (like the pricing toggle) would suddenly ship JavaScript it did
not need.

### Decision drivers

- Keep CSS-only primitives truly CSS-only — no hidden JS payload
- Preserve clear expectations for consumers ("if I use X, I know what I get")
- Support future reuse in both categories without forcing one into the shape of
  the other

### Evaluated approaches

1. **Extend `SegmentedControl` with optional JS** — rejected. Breaks the
   CSS-only contract and conflates two interaction models in one component.
2. **Build a single "super-primitive" with both modes via a `mode` prop** —
   rejected. The two modes share nothing beyond visual styling. A
   `mode: 'selection' | 'filter'` prop would be a thin wrapper over two entirely
   different implementations.
3. **Two separate primitives with shared visual styling. Chosen.**

## Decision

The project uses two distinct UI primitives for pill-style controls:

| Primitive          | Interaction Model | ARIA                              | Controller | Use for                       |
| :----------------- | :---------------- | :-------------------------------- | :--------- | :---------------------------- |
| `SegmentedControl` | Selection         | `fieldset` + `aria-labelledby`    | None (CSS) | Local state, no side effects  |
| `FilterBar`        | Filter            | `role="toolbar"` + `aria-pressed` | Yes (JS)   | URL state, deep-links, scroll |

Both primitives live in `components/ui/` because they are generic
(domain-agnostic). Domain-specific logic (the controller) lives in
`src/scripts/` and is imported by the consumer, not by the primitive.

### Decision tree for future controls

**Use `SegmentedControl` when:**

- The control drives purely visual state on the same page
- No URL interaction, no scroll, no analytics beyond basic form tracking
- CSS-only behavior is acceptable or desired

**Use `FilterBar` when:**

- The control changes what content is shown and that state should be shareable
  via URL
- The control participates in deep-link flows (incoming links with parameters or
  hashes)
- Accessibility semantics of `aria-pressed` fit better than `aria-selected`

**Use neither — build a new primitive when:**

- The control is a tab navigation (distinct panels, one at a time, no "all"
  option). Tabs are semantically different: `aria-selected` +
  `tablist`/`tabpanel`. Do not re-use FilterBar for tabs; the semantic mismatch
  would be misleading.

### What does NOT change

- `SegmentedControl` stays CSS-only. No JS will be added to its core
  implementation.
- The pricing toggle on the Services page continues to use `SegmentedControl`
  unchanged.
- Existing `FormSelect`, `Button`, and other primitives are unaffected.

### Scope and non-goals

**In scope:**

- Conceptual boundary between selection and filter primitives
- Folder placement of both (`components/ui/`)
- Where domain-specific controller logic lives (`src/scripts/`, not in the
  primitive)

**Out of scope:**

- Visual design of either primitive (both share pill styling via Tailwind
  utilities — see consuming components)
- Deciding which future UI controls map to which category (handled case-by-case
  by the decision tree above)

## Consequences

### Positive

- Each primitive has a clear, narrow purpose that can be explained in one
  sentence.
- Consumers know what they get: CSS-only or JS-driven, no surprises.
- Domain-specific logic is cleanly separated from reusable primitives, matching
  the `src/scripts/` pattern already established by `quizModalController.ts`.
- Future filter use cases (Success Stories tags, Coach specialties) can reuse
  `FilterBar` with a new domain-specific controller, without inventing new
  primitives.

### Negative

- Two primitives with near-identical visual styling can look redundant at first
  glance. Mitigation: cross-referencing JSDoc in both components explains when
  to use which, so the distinction is discoverable.
- Slight duplication in Tailwind utility usage between the two primitives.
  Acceptable: the shared styling is ~3 class strings, not structural code.

### Risk mitigation

- Both primitives carry mutual JSDoc references explaining the decision tree.
  Any developer reaching for one will see the other and the boundary.

## References

- [ADR-0007](_archive/0007-component-folder-structure.md) — UI folder structure
- [ADR-0019](0019-use-tailwindplus-elements-for-interactive-ui.md) — related
  interactive UI decisions
- [ADR-0020](0020-client-side-script-strategy-revised.md) — script strategy for
  the controller
- [ADR-0024](0024-category-filter-semantics.md) — Why categories use filter
  semantics instead of tab semantics
- [ADR-0028](0028-filterbar-labelling-xor-reversal.md) — See also: FilterBar
  labelling XOR reversal; refines the primitive's ARIA-labelling contract
- [ADR-0029](0029-services-toolbar-filter-paradigm.md) — See also: consumer-
  level architecture for the services toolbar-filter, using this primitive
