# Services Category Filter: Toolbar Pattern with FilterBar Primitive

Date: 2026-04-19

## Status

Accepted

## Context

Before a comprehensive refactoring, the Services page used a `role="tablist"`
pattern wrapped in a `ServiceCategoryTabs` component: a self-contained wrapper
that rendered the tab buttons, handled click-to-show-panel wiring, and exposed
no reusable primitive. The wrapper assumed one-of-N visibility and used
`aria-selected` for the active tab.

The Services page redesign made the tablist contract untenable. The "All"
default view (show every service across every category) violates the one-of-N
assumption of `tablist`, and `aria-selected` announcements no longer matched the
user's mental model. ADR-0024 documents the full ARIA-semantics rejection of the
tab pattern on this surface.

ADR-0024 established the **semantic** direction — categories behave as filters,
`role="toolbar"` with `aria-pressed` — but did not specify the **implementation
architecture**: which primitive renders the toolbar, which module owns the
interaction logic, which template ↔ controller contract connects them.

### Decision drivers

- Reuse the `role="toolbar"` + `aria-pressed` semantics from ADR-0024 without
  re-implementing them per surface.
- Keep services-specific logic (URL state, deep-links, keyboard navigation,
  scroll behavior) separate from the reusable primitive, so future filterable
  surfaces (Success Stories by tag, Coaches by specialty) can reuse the
  primitive without inheriting services-specific behavior.
- Make the template ↔ controller contract visible to both sides (DOM inspection
  and static analysis), rather than hiding it behind a wrapper component.

### Evaluated approaches

1. **Keep `ServiceCategoryTabs` wrapper, change internals to toolbar
   semantics.** Rejected. The wrapper bundled markup and behavior in one unit;
   an internal reshape would have preserved the one-surface assumption and
   prevented the primitive from being reused by future filter surfaces.
2. **Use a `FilterBar` primitive inline in `ServicesCatalog`, paired with a
   services-specific controller.** Chosen — rationale in the Decision section
   below.

## Decision

The Services category navigation is realized as a three-layer stack:

1. **Primitive:** `FilterBar` (`src/components/ui/FilterBar.astro`) renders the
   toolbar markup with `role="toolbar"` and `aria-pressed` on each button,
   without any services-specific behavior. The primitive itself is
   services-agnostic.
2. **Controller:** `servicesFilterController.ts`
   (`src/scripts/servicesFilterController.ts`) owns URL state, `?service=<id>`
   and `#<category>` deep-link resolution, click-driven filter application,
   keyboard navigation (Arrow / Home / End with roving tabindex), and
   `scrollIntoView` behavior. It exports `ALL_CATEGORIES_SENTINEL` as the single
   source of truth for the "unfiltered view" identifier.
3. **Template contract:** `ServicesCatalog.astro` embeds `FilterBar` directly
   and carries the controller contract on the section element via three data
   attributes:
   - `data-services-filter` — root marker the controller queries for
   - `data-category-group="{id}"` — per-category wrapper the controller toggles
     via a `.hidden` class
   - `data-service-map` — JSON blob of `{serviceId: categoryId}` for
     `?service=<id>` deep-link resolution

### What does NOT change

- ADR-0024 remains the authoritative ARIA-semantics decision. ADR-0029 documents
  how ADR-0024's direction is realized on the Services surface, not a new
  semantic choice.
- `ServiceCategoryTabs` is the only removed component. The pricing toggle,
  `ServiceCard`, and other Services-page components are unaffected.
- Fallback behavior when the controller does not run (JavaScript disabled, or
  module fails to initialize): the filter bar is inert, all category groups
  remain visible, and the page degrades to a flat catalog. No category is hidden
  until the controller applies `.hidden`.

### Scope and non-goals

**In scope:**

- The Services page category filter implementation architecture.
- The data-attribute contract between `ServicesCatalog` and
  `servicesFilterController`.

**Out of scope:**

- The ARIA-semantics choice itself — see ADR-0024.
- The primitive-vs-selection decision tree — see ADR-0023.
- Application to other filterable surfaces (Success Stories, Coaches) — those
  reuse `FilterBar` but may implement their own controllers with their own
  sentinels and URL-parameter schemes.

## Consequences

### Positive

- The `FilterBar` primitive is reusable across future filter surfaces without
  inheriting services-specific logic.
- The template ↔ controller contract is visible in the DOM (data attributes) and
  in the controller's `cacheDom` function, so drift between the two sides is
  caught by tests and by direct inspection.
- The controller-exported `ALL_CATEGORIES_SENTINEL` prevents silent collision if
  a future category is ever named "all" and makes the template/controller
  coupling explicit rather than a magic string.

### Negative

- The layered stack (primitive + controller + template contract) requires three
  files to be in sync for the filter to work. Mitigation: the contract surface
  is narrow (three data attributes, one sentinel export), and Vitest tests in
  `servicesFilterController.test.ts` exercise the controller against a fixture
  that mirrors the template output.

## References

- [ADR-0023](0023-filter-vs-selection-primitives.md) — `FilterBar` as the chosen
  primitive for filter surfaces.
- [ADR-0024](0024-category-filter-semantics.md) — toolbar-filter ARIA semantics;
  this ADR realizes that decision on the Services surface.
- [ADR-0025](0025-filterable-catalog-pages.md) — server-renders-full-list
  pattern applied here.
- [ADR-0028](0028-filterbar-labelling-xor-reversal.md) — FilterBar labelling XOR
  reversal; applies at the primitive level, while this ADR addresses the
  consumer-level architecture.
- [`src/components/ui/FilterBar.astro`](../../src/components/ui/FilterBar.astro)
  — primitive implementation.
- [`src/components/sections/services/ServicesCatalog.astro`](../../src/components/sections/services/ServicesCatalog.astro)
  — template layer.
- [`src/scripts/servicesFilterController.ts`](../../src/scripts/servicesFilterController.ts)
  — controller layer.
