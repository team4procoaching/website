# Category Navigation as Filter (Not Tabs)

Date: 2026-04-16

## Status

Accepted

## Context

The Services page organizes its nine services into three categories
(Bodybuilding, Athletic, Wellness). Users can narrow the view to one category or
see all of them at once.

The initial implementation used a tab pattern:

- `role="tablist"` on the category navigation
- `role="tab"` on each category button
- `role="tabpanel"` on each category section
- `aria-selected` tracked the active tab
- Exactly one category was visible at any time; no "all" option

After the Services page redesign (April 2026), the default view became "All
categories visible", with category buttons acting as filters that narrow the
list. This broke the tab semantics in two ways:

1. The `tablist` pattern assumes one-of-N visibility. An "All" option shows all
   panels simultaneously — that violates the tab contract.
2. Screen reader announcements for tabs ("Bodybuilding tab, selected") no longer
   matched the mental model ("filter by Bodybuilding"). Users of assistive
   technology got a misleading interaction cue.

The underlying question: are categories **tabs** (distinct panels, pick one) or
**filters** (narrow a visible list)?

### Decision drivers

- Default view shows all services across categories (no hidden content)
- Accessibility semantics must match user mental model
- Support for an "All" option is required
- Deep-links from the Quiz may target a specific service within any category, or
  filter to a category without a service

### Evaluated approaches

1. **Keep tab semantics, special-case "All"** — rejected. `aria-selected` on a
   button that shows _all_ panels is a contradiction. Any screen reader would
   announce "All tab, selected" while multiple panels are visible, breaking the
   tab contract.
2. **Use a dropdown/select instead of pill buttons** — rejected. The Services
   page is a primary conversion surface; a dropdown adds interaction overhead
   for no gain. Coach feedback in earlier reviews also explicitly preferred
   pill-style controls.
3. **Use filter semantics: `role="toolbar"` + `aria-pressed`. Chosen.**

## Decision

Category navigation on the Services page uses filter semantics:

- The container uses `role="toolbar"` with `aria-labelledby` pointing to a
  visible label (`"Browse by goal"`).
- Each button uses `aria-pressed="true|false"` to indicate active state.
- Content groups below the toolbar are plain `<div>` containers with
  `data-category-group="{id}"` and no ARIA role — they are content, not tab
  panels.
- The default state is "All" — all groups visible, no button pressed
  exclusively.
- Filtering hides non-matching groups via a `.hidden` class (CSS
  `display: none`).

Screen readers announce "Bodybuilding, button, not pressed" or "Bodybuilding,
button, pressed", which matches the user's mental model ("I am filtering by
Bodybuilding" rather than "I am selecting a tab").

### What does NOT change

- The pricing toggle continues to use `SegmentedControl` (selection semantics) —
  it is not a filter and should not use filter semantics.
- Keyboard navigation still supports arrow keys, Home, and End for intra-toolbar
  movement — toolbars and tablists share this pattern.
- Deep-linking from the Quiz continues to work; the controller translates URL
  parameters into filter state after hydration.

### Scope and non-goals

**In scope:**

- Categories on the Services page
- Future filterable catalogs with optional "All" semantics (Success Stories by
  tag, Coaches by specialty, etc.)

**Out of scope:**

- Tab patterns elsewhere on the site (e.g., future onboarding flows with
  distinct panels and no "All" option) — those remain tabs
- The decision of which UI primitive to use for a given case — see
  [ADR-0023](0023-filter-vs-selection-primitives.md) for that decision tree

## Consequences

### Positive

- Accessibility semantics match the user's mental model.
- An "All" option is no longer a special case — it is the default state.
- Server-rendered HTML contains all services at all times (no tab panels that
  need to be expanded), which improves crawler indexing without special
  treatment.
- The pattern generalizes: any future filterable list on the site can use the
  same `toolbar` + `aria-pressed` approach.

### Negative

- Developers familiar with the previous tab pattern need to unlearn it for this
  surface. Mitigation: this ADR documents the reasoning.
- Toolbar + `aria-pressed` is slightly less common than tablist in component
  libraries; some reference documentation may default to tabs. Mitigation: the
  filter pattern is first-class in WAI-ARIA and widely supported.

## References

- [WAI-ARIA Authoring Practices: Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)
- [WAI-ARIA Authoring Practices: Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
  (the pattern that was explicitly rejected)
- [ADR-0023](0023-filter-vs-selection-primitives.md) — Filter vs. Selection
  primitives
- [ADR-0025](0025-filterable-catalog-pages.md) — Server-render full list +
  client-side filtering
- [ADR-0028](0028-filterbar-labelling-xor-reversal.md) — See also: FilterBar
  labelling XOR reversal, refining the accessible-name contract for the
  primitive that implements this filter
- [ADR-0029](0029-services-toolbar-filter-paradigm.md) — See also:
  implementation architecture for the services filter, applying the toolbar
  semantics decided here
