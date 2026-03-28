# Client-Side Script Strategy (Revised)

Date: 2026-03-28

Supersedes: [ADR-0012](0012-client-side-script-strategy.md)

## Status

Accepted

## Context

[ADR-0012](0012-client-side-script-strategy.md) established three criteria for
choosing `<script is:inline>` over module `<script>`:

1. **Template data pattern** — scripts reading `<template data-json>` elements
2. **Critical early execution** — scripts that must run before HTML parsing
   completes
3. **View Transition re-initialization** — scripts needing re-execution after
   navigation

Upon review, **two of the three criteria do not hold**:

### Criterion 1 is incorrect: Module scripts can read `<template>` elements

ADR-0012 argued that module scripts might execute before the `<template>`
element exists in the DOM because Astro hoists and deduplicates them. This is
not accurate.

`<script type="module">` is `deferred` per the HTML specification — the browser
executes it only after the HTML document is fully parsed. Astro's hoisting
changes the script tag's position in the HTML output, but not its execution
timing. A `querySelector` call in a module script operates on the complete DOM
tree, regardless of where Astro placed the script tag.

The old ADR conflated **build-time transformation** (where the script tag ends
up in the HTML) with **runtime semantics** (when the browser executes it).

**Consequence:** `CoachDetailModal`, `QuizModal`, and `ServiceCategoryTabs` do
not need `is:inline` for reading `<template data-json>` elements.

### Criterion 3 is incorrect: `astro:page-load` works in module scripts

ADR-0012 argued that module scripts do not re-execute after View Transitions and
therefore need `is:inline`. This is partially true — module scripts are loaded
and executed **once**. However, an `astro:page-load` event listener registered
at the module's top level persists across navigations. Astro fires
`astro:page-load` on every View Transition navigation, the registered `init`
function is called, it finds the new `<template>` element in the swapped DOM,
and initializes the component.

This is the pattern
[Astro documents](https://docs.astro.build/en/guides/view-transitions/#script-behavior-with-view-transitions)
for View Transition compatibility in module scripts.

**Consequence:** View Transition re-initialization is not a valid criterion for
`is:inline`.

### Criterion 2 remains valid

Code that must run before the first render — before the browser has finished
parsing the HTML — cannot wait for module script timing. `is:inline` scripts
execute synchronously at the point they appear in the document.

Currently, only `HeroFullscreen.astro` requires this: the
`prefers-reduced-motion` check pauses the background video before it starts
playing.

**Why CSS alone is insufficient:** The `<video>` element has `autoplay` for the
default (motion-enabled) experience. A CSS `@media (prefers-reduced-motion)`
rule can hide or replace the video visually, but it cannot **stop the video from
loading and auto-playing** in the background — the browser begins playback as
soon as the element is parsed, regardless of CSS display state. The `is:inline`
script calls `video.pause()` synchronously before the `<video>` element reaches
the rendering pipeline, preventing both the wasted bandwidth and the brief
visible flash that a deferred module script would allow.

A deferred module script would execute after parsing completes, leaving a window
of several frames where the video plays visibly before being paused — a jarring
experience for users who explicitly opted out of motion.

## Decision

### New decision model

**Module `<script>` is the default** for all client-side JavaScript.

**`<script is:inline>` is used only for Critical Early Execution** — code that
must run before the browser finishes parsing the HTML document. Currently, this
applies exclusively to `HeroFullscreen.astro`.

A script qualifies for `is:inline` only when **all** of these apply:

1. The problem cannot be solved with HTML attributes or CSS alone.
2. The logic must execute before HTML parsing completes.
3. A module script plus `astro:page-load` is functionally insufficient.
4. The inline portion is minimal — defer everything else to a module script.

### Conventions for module `<script>` (default)

**Initialization pattern — supports multiple instances per page:**

```typescript
/**
 * Initialize a single component instance.
 * Must be idempotent — safe to call multiple times on the same element.
 */
function initComponent(root: HTMLElement): void {
  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  // ... component logic with full TypeScript support
}

/**
 * Find and initialize all instances on the page.
 * Called once on initial load and once per View Transition navigation.
 */
function initAll(): void {
  document
    .querySelectorAll<HTMLElement>('[data-my-component]')
    .forEach(initComponent);
}

// Top-level: this line executes exactly once (when the module first loads).
// The listener then persists and fires on every subsequent View Transition
// navigation, calling initAll() against the freshly swapped DOM.
document.addEventListener('astro:page-load', initAll);
```

**Key principles:**

- **Idempotent initialization**: The `data-initialized` guard ensures calling
  `initComponent` on an already-initialized element is a no-op. This is critical
  because `astro:page-load` fires on every navigation — including navigations
  that do not swap the component's DOM subtree.
- **Multi-instance safe**: `querySelectorAll` + per-root initialization instead
  of `querySelector`. Components must not assume they are singletons.
- **`transition:persist` caveat**: If a component uses Astro's
  `transition:persist` directive, the DOM element survives navigation and
  retains its `data-initialized` attribute. The guard correctly prevents
  re-initialization in this case. If a persisted component needs
  re-initialization (e.g., to update its data), it must explicitly remove the
  `data-initialized` attribute in an `astro:before-swap` listener.

**Rules:**

- **TypeScript** — full type safety, typed DOM queries (`querySelector<T>`)
- **`const`/`let`** — standard modern JavaScript
- **`astro:page-load` listener** for View Transition support
- **`data-*-initialized` guard** with idempotent initialization
- **DOM API only** — no `innerHTML` for user-facing content (XSS prevention)
- **`replaceChildren()`** for clearing container content
- **Error handling** — null-check on element → null-check on attribute →
  try/catch with component-prefixed `console.error`

**Event listener cleanup:** For simple components that bind listeners to
elements inside the component root, cleanup is handled implicitly — Astro's View
Transition DOM swap removes the old elements and their listeners. For components
that bind listeners to **global objects** (`window`, `document`) or use
`matchMedia`, `IntersectionObserver`, or `ResizeObserver`, cleanup must be
explicit. Use `astro:before-swap` to tear down global listeners before the DOM
swap occurs:

```typescript
document.addEventListener('astro:before-swap', () => {
  // Remove global listeners, disconnect observers, etc.
});
```

### Conventions for `is:inline` (Critical Early Execution only)

```javascript
(function () {
  // @inline — Critical Early Execution, see ADR-0020
  // Pauses autoplay video before rendering for prefers-reduced-motion users.
  // CSS cannot prevent autoplay; only JS can call video.pause().
  const video = document.querySelector('video');
  if (video && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.pause();
  }
})();
```

Rules:

- **IIFE wrapper** to avoid global scope pollution — necessary because
  `is:inline` scripts execute in the global scope (unlike module scripts, which
  have implicit module-level scope isolation)
- **`let`/`const`** — all target browsers support them; `var` is no longer
  required (the compatibility concern in ADR-0012 is moot for a project using
  View Transitions, which require a modern browser baseline)
- **Comment header** with `@inline` tag explaining the Critical Early Execution
  requirement and why CSS/markup cannot solve the problem
- **Minimal scope** — only the critical-path logic; defer everything else to a
  module script

### Data passing pattern (unchanged)

Build-time data serialized to `<template>` elements works identically in both
module and `is:inline` scripts:

```astro
<template id="my-data" data-json={JSON.stringify(data)}></template>
```

The module script reads it via typed DOM access:

```typescript
const dataEl = document.getElementById('my-data');
if (!dataEl) return;

const json = dataEl.getAttribute('data-json');
if (!json) return;

let data: CoachData[];
try {
  data = JSON.parse(json);
} catch (e) {
  console.error('[ComponentName] Failed to parse data', e);
  return;
}
```

**Important:** `JSON.parse` with a TypeScript type annotation provides
**compile-time type safety** (typed consumption after parse), not **runtime
validation**. The parsed data is trusted because it is generated at build time
from typed data modules. If future use cases involve non-trivial or external
payloads, runtime validation (e.g., via Zod) should be added.

### Migration plan

No dedicated migration project. Components are migrated when they are next
modified for any reason. Migration is **mandatory** when a component on this
list is touched — the change and the migration are part of the same PR.

| Component           | Current     | Target        | Migrate when next changed      |
| :------------------ | :---------- | :------------ | :----------------------------- |
| HeroFullscreen      | `is:inline` | `is:inline`   | — (correct, stays)             |
| CoachDetailModal    | `is:inline` | Module script | Yes — mandatory at next change |
| QuizModal           | `is:inline` | Module script | Yes — mandatory at next change |
| ServiceCategoryTabs | `is:inline` | Module script | Yes — mandatory at next change |
| SuccessStories      | Module      | Module        | — (already correct)            |
| StoryCategoryFilter | Module      | Module        | — (already correct)            |

New `is:inline` usage requires review with explicit reference to this ADR and a
justification against the four-point checklist above.

### Scope and Non-Goals

**In Scope:**

- Revised decision framework (one criterion instead of three)
- Updated coding conventions for both patterns
- Migration plan for existing `is:inline` components
- Lifecycle considerations (cleanup, idempotency, `transition:persist`)

**Out of Scope:**

- Migration of `is:inline` scripts to framework components (React, Svelte)
- Web Component / Custom Element strategy (covered by
  [ADR-0019](0019-use-tailwindplus-elements-for-interactive-ui.md) — Custom
  Elements solve the lifecycle/re-initialization problem natively via
  `connectedCallback`/`disconnectedCallback`; for components requiring complex
  state or lifecycle management, ADR-0019 is the preferred approach)
- Client-side state management beyond vanilla DOM
- Alternative data passing patterns (`<script type="application/json">` data
  islands — a potential future improvement over `<template data-json>`)

## Consequences

### Positive

- **Simpler decision model**: One criterion (`is:inline` for Critical Early
  Execution only) instead of three, reducing cognitive load for developers and
  reviewers
- **TypeScript in modal/tab scripts**: Migration enables typed DOM queries,
  typed JSON consumption, and compile-time safety in the four largest
  client-side scripts
- **Vite processing**: Module scripts are minified, tree-shaken, and bundled —
  reducing payload for `CoachDetailModal` (~150 lines), `QuizModal` (~200
  lines), and `ServiceCategoryTabs` (~130 lines)
- **Modern JavaScript**: `const`/`let` replaces `var` in all scripts,
  eliminating a consistent source of reviewer confusion
- **CSP compatibility**: Fewer inline scripts improves compatibility with
  restrictive Content Security Policies (CSP) that disallow `unsafe-inline`

### Negative

- **Migration effort**: Three components need script rewrites. Mitigated by the
  mandatory-at-next-change migration strategy.
- **Transitional inconsistency**: Until all three components are migrated, both
  patterns coexist with different conventions. The migration table in this ADR
  tracks progress.

### Risk Mitigation

- **Migration correctness**: Each migration must be tested with View Transition
  navigation to verify `astro:page-load` re-initialization works — navigate away
  and back, verify component state resets correctly
- **Duplicate listeners**: Reviewer checklist item — verify no global listeners
  are registered inside `initComponent` without cleanup via `astro:before-swap`
- **HeroFullscreen regression**: The `is:inline` script for reduced-motion must
  remain — any refactoring of `HeroFullscreen` should not accidentally migrate
  it to a module script
- **CONVENTIONS.md**: Updated to reflect both the current state (mixed) and the
  target state (module scripts everywhere except HeroFullscreen)

## Success Criteria

- Every new component uses module `<script>` by default
- `is:inline` is only used with a `@inline` comment referencing this ADR and
  explaining the Critical Early Execution requirement
- After all three components are migrated, no `is:inline` scripts remain except
  `HeroFullscreen.astro`
- `var` usage is eliminated from all client-side scripts
- All client-side scripts that read `<template data-json>` use typed consumption
  after `JSON.parse`
- Navigation via View Transitions is tested for every migrated component
  (navigate away, navigate back, verify correct re-initialization)
- No duplicate event listeners accumulate after repeated View Transition
  navigations

## References

- [ADR-0012](0012-client-side-script-strategy.md) — superseded by this ADR
- [Astro Scripts & Event Handling](https://docs.astro.build/en/guides/scripts-and-event-handling/)
- [Astro `is:inline` Directive](https://docs.astro.build/en/reference/directives-reference/#isinline)
- [Astro View Transitions — Script behavior](https://docs.astro.build/en/guides/view-transitions/#script-behavior-with-view-transitions)
- [HTML spec: `defer` attribute on module scripts](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-type)
- [ADR-0019](0019-use-tailwindplus-elements-for-interactive-ui.md) — Custom
  Element strategy for complex lifecycle management
- [CONVENTIONS.md](../CONVENTIONS.md) — coding patterns for both script types
