# Client-Side Script Strategy: `is:inline` vs Module `<script>`

Date: 2026-03-15

## Status

Superseded by [ADR-0020](../0020-client-side-script-strategy-revised.md)

## Context

Astro offers two ways to include client-side JavaScript in components:

1. **Module `<script>`** (default) — processed by Astro's bundler (Vite),
   supports TypeScript, tree-shaken, deduped across pages, runs as ES module.
2. **`<script is:inline>`** — rendered as-is into the HTML, no bundling, no
   TypeScript, no deduplication, runs in global scope.

The project uses both patterns, which raised questions during code reviews about
when to use which. Currently:

- **Module `<script>`:** `SuccessStories.astro` (slider dots/navigation),
  `StoryCategoryFilter.astro` (filter logic).
- **`is:inline`:** `CoachDetailModal.astro`, `QuizModal.astro`,
  `ServiceCategoryTabs.astro`, `HeroFullscreen.astro` (reduced-motion).

The choice is not arbitrary — each pattern has technical constraints that
determine which is appropriate.

## Decision

Use module `<script>` by default. Use `is:inline` only when one of these
conditions applies:

### When to use `is:inline`

1. **Template data pattern:** The script reads data from a `<template>`
   element's `data-*` attributes that are populated at build time. Module
   scripts are bundled and deduped by Astro, which means they may execute before
   the template element exists in the DOM, or they may be hoisted to a different
   location. `is:inline` guarantees the script runs in the component's document
   position.

   Examples: `CoachDetailModal.astro` (coach data JSON), `QuizModal.astro` (quiz
   data JSON), `ServiceCategoryTabs.astro` (service-to-category map).

2. **Critical early execution:** The script must run before Astro's module
   bundling completes, e.g., for accessibility features that should not flash or
   flicker.

   Example: `HeroFullscreen.astro` (reduced-motion video pause — must run before
   video starts playing).

3. **View Transition compatibility with re-initialization:** The script needs to
   re-run after View Transition navigation and uses `data-initialized` guards to
   prevent double-initialization. Module scripts are deduped across navigations;
   `is:inline` scripts re-execute on each page load.

### Conventions for `is:inline` scripts

- Wrap in IIFE to avoid global scope pollution.
- Use `var` (not `let`/`const`) for maximum compatibility, since `is:inline`
  bypasses the TypeScript compiler and Vite's target configuration.
- Use `data-*-initialized` attribute guards against double-initialization.
- Register both `DOMContentLoaded` and `astro:page-load` listeners.
- Use DOM API (`createElement`, `textContent`) instead of `innerHTML` for XSS
  safety.

### Conventions for module `<script>`

- TypeScript is available — use `const`/`let`, typed DOM queries, etc.
- Script is automatically deduped — one instance per page regardless of how many
  times the component appears.
- Still register `astro:page-load` for View Transition support, but
  `DOMContentLoaded` is unnecessary (module scripts run after DOM is ready).

### Current Assignment

| Component           | Pattern     | Reason                                    |
| ------------------- | ----------- | ----------------------------------------- |
| CoachDetailModal    | `is:inline` | Template data pattern + View Transitions  |
| QuizModal           | `is:inline` | Template data pattern + View Transitions  |
| ServiceCategoryTabs | `is:inline` | Template data pattern + View Transitions  |
| HeroFullscreen      | `is:inline` | Critical early execution (reduced-motion) |
| SuccessStories      | Module      | No template data, standard DOM init       |
| StoryCategoryFilter | Module      | No template data, TypeScript available    |

### Scope and Non-Goals

**In Scope:**

- Decision framework for choosing between `is:inline` and module `<script>`.
- Coding conventions for each pattern.
- Classification of current components.

**Out of Scope:**

- Migration of `is:inline` scripts to framework components (React, Svelte).
- Web Component / Custom Element strategy (covered by
  [ADR-0019](../0019-use-tailwindplus-elements-for-interactive-ui.md) —
  `@tailwindplus/elements`).
- Client-side state management beyond vanilla DOM.

## Consequences

### Positive

- **Clear decision criteria:** New components can be classified without ad-hoc
  judgment. The three conditions are verifiable.
- **Consistent conventions:** `var` vs `const`, IIFE wrapping, initialization
  guards — all documented and auditable.
- **Honest about trade-offs:** `is:inline` loses TypeScript and tree-shaking but
  gains execution control. The trade-off is explicit.

### Negative

- **Two patterns to maintain:** Developers must understand both and apply the
  correct one. Mitigated by this ADR and the CODE_REVIEW_BRIEF.
- **`is:inline` scripts are larger:** No tree-shaking, no minification by
  Astro's bundler. Acceptable for the current component set (< 5KB total).

### Risk Mitigation

- **CODE_REVIEW_BRIEF** documents both patterns and points to this ADR.
- **LLM code reviews** flag pattern misuse (e.g., module script reading from
  `<template data-json>`).
- **Initialization guards** prevent the most common `is:inline` pitfall (double
  execution after View Transitions).

## Success Criteria

- Every `<script>` and `<script is:inline>` in the project has a comment
  explaining why that pattern was chosen (or the choice is obvious from the
  template data pattern).
- No `is:inline` script uses `innerHTML` or `set:html` for dynamic content.
- All `is:inline` scripts are wrapped in IIFEs.
- New components default to module `<script>` unless one of the three conditions
  applies.

## References

- [Astro Scripts & Event Handling](https://docs.astro.build/en/guides/scripts-and-event-handling/)
- [Astro `is:inline` Directive](https://docs.astro.build/en/reference/directives-reference/#isinline)
- [ADR-0001: Use Astro and MDX](../0001-use-astro-js.md)
- [ADR-0015: Animation & Motion System](../0015-animation-and-motion-system.md)
  — applies this ADR's module script pattern for `ScrollAnimations.astro`
- [ADR-0019: Use `@tailwindplus/elements`](../0019-use-tailwindplus-elements-for-interactive-ui.md)
  — covers the Custom Element / Web Component strategy referenced in Scope
- [ADR-0026: Dual-Dispatch Controller Init](../0026-dual-dispatch-controller-init.md)
  — specifies the bootstrap lifecycle for module scripts that must work on cold
  loads, building on the module-script-as-default rule from ADR-0020
