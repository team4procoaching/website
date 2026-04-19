# Use `@tailwindplus/elements` for Interactive UI Components

Date: 2026-03-27

## Status

Accepted

## Context

The project needs interactive UI patterns — specifically modal dialogs
(CoachDetailModal, QuizModal) and an accordion/disclosure (FAQ section) — that
require JavaScript-driven behavior: opening/closing with transitions, scroll
locking, click-outside-to-close, focus trapping, and ARIA attribute management.

The project is built with Astro (static HTML, no JS framework on the client) and
styled with Tailwind CSS v4. Any interactive solution must work without React,
Vue, or another runtime framework.

The site's UI was designed using **Tailwind Plus** UI Blocks (commercially
licensed). The UI Blocks are professionally designed by Tailwind Labs designers
and implemented by experienced engineers. Several blocks matched the project's
design direction closely, so they were adopted and adapted rather than built
from scratch. The HTML variants of these blocks use `@tailwindplus/elements` — a
library of headless Custom Elements that power the interactive behavior.

### Options Evaluated

1. **Native `<dialog>` element without wrapper** — HTML's `<dialog>` provides
   `showModal()`, focus trapping, and a `::backdrop` pseudo-element. However, it
   lacks smooth exit transitions (the element is removed from the top layer
   immediately on close), consistent scroll locking across browsers, and
   click-outside-to-close behavior. Each of these gaps requires custom
   JavaScript — effectively reimplementing what `el-dialog` already provides.
   **Rejected.**

2. **Custom Web Components (self-built)** — Writing bespoke `<t4p-dialog>` and
   `<t4p-disclosure>` elements. This would avoid the external dependency but
   requires significant effort to match the quality of scroll locking,
   transition orchestration, and accessibility handling that
   `@tailwindplus/elements` already provides. The resulting code would be less
   tested, less reviewed, and harder to maintain for a small team. **Rejected.**

3. **Alpine.js** — A popular lightweight framework for HTML-driven
   interactivity. Would add a ~15 KB runtime dependency for behavior that is
   already covered by `@tailwindplus/elements` (~204 KB total library,
   tree-shakeable to only the used elements). Introduces a different mental
   model (`x-data`, `x-show`, `x-transition`) alongside the existing Tailwind
   Plus markup conventions. Mixing two approaches (Alpine for behavior, Tailwind
   Plus for design) creates unnecessary friction. **Rejected.**

4. **`@tailwindplus/elements` (`el-dialog`, `el-disclosure`)** — Already used by
   the Tailwind Plus UI Blocks that the project adopted. Wraps native platform
   features (`<dialog>`, Custom Elements, Invoker Commands via
   `commandfor`/`command`) with polyfills for browsers that don't yet support
   them natively. Maintained by the Tailwind Labs team. Licensed under the
   existing Tailwind Plus commercial license. **Chosen.**

## Decision

Use `@tailwindplus/elements` as the project's solution for interactive UI
components that require JavaScript behavior beyond what static HTML provides.

### Used Elements

| Element           | Purpose                        | Used In                     |
| :---------------- | :----------------------------- | :-------------------------- |
| `<el-dialog>`     | Modal dialogs with transitions | CoachDetailModal, QuizModal |
| `<el-disclosure>` | Collapsible accordion sections | FAQ section                 |

### Integration Pattern

Elements is installed via npm and imported in the Astro base layout:

```typescript
// BaseLayout.astro
import '@tailwindplus/elements';
```

Interactive triggers use the **Invoker Commands** pattern — a declarative HTML
API where a button's `commandfor` attribute references a target element's `id`,
and the `command` attribute specifies the action:

```html
<button commandfor="coach-modal" command="show-modal">
  View Coach Details
</button>

<el-dialog>
  <dialog id="coach-modal">
    <!-- modal content -->
  </dialog>
</el-dialog>
```

This pattern keeps all interactivity in HTML attributes — no JavaScript event
listeners for open/close behavior. The project's own client-side scripts (see
ADR-0020) handle data population from `<template>` elements, not dialog
lifecycle.

### Scope and Non-Goals

**In Scope:**

- Decision to use `@tailwindplus/elements` for modal and disclosure behavior
- Which elements are used and where
- Fallback strategy if the library becomes unavailable

**Out of Scope:**

- Full Tailwind Plus UI Block catalog usage (only `el-dialog` and
  `el-disclosure` are relevant here)
- Client-side script conventions (covered by ADR-0020)
- Animation/transition CSS (covered by ADR-0015)

## Consequences

### Positive

- **Professional quality without custom code:** Scroll locking, focus trapping,
  exit transitions, click-outside-to-close, and ARIA management are handled by a
  library built and tested by the Tailwind Labs team — not maintained as bespoke
  project code.
- **Declarative HTML API:** The `commandfor`/`command` pattern keeps interactive
  triggers in markup. No framework runtime, no JavaScript glue code for
  open/close behavior.
- **Platform-aligned architecture:** `@tailwindplus/elements` wraps native
  platform features (`<dialog>`, Custom Elements, Invoker Commands) and
  polyfills gaps. As browsers ship native support, the polyfills become no-ops
  and the library shrinks.
- **Design consistency:** Using the same elements that power Tailwind Plus UI
  Blocks means the project's adapted blocks stay structurally compatible with
  upstream examples. Future UI Block updates can be referenced without
  structural translation.
- **Single dependency:** One library covers both dialogs and disclosures, rather
  than mixing approaches (e.g., Alpine for accordions, custom JS for modals).

### Negative

- **Commercial dependency:** `@tailwindplus/elements` requires a Tailwind Plus
  license. The project has one, but the library cannot be used in contexts where
  the license doesn't apply.
- **Limited to Tailwind Plus element set:** Only the components provided by the
  library are available. If a future UI pattern requires something not in the
  set (Autocomplete, Command Palette, Tabs, etc.), it is available — but
  patterns outside the library's scope require a separate solution.
- **Opaque internals:** The library is not open-source in the traditional sense.
  Debugging transitions or accessibility edge cases requires inspecting
  minified/bundled code rather than reading documented source.

### Risk Mitigation

- **Library abandoned or license changes:** `@tailwindplus/elements` is
  maintained by Tailwind Labs, who have a strong commercial incentive to keep it
  working (it powers their flagship UI Block product). However, if the library
  becomes unmaintained:
  1. **Pin the last working version** via `pnpm` lockfile and RenovateBot
     (ADR-0005/0006). The library has no external runtime dependencies, so a
     pinned version will continue to work indefinitely.
  2. **Replace with native APIs** when browser support matures. The library's
     value comes from polyfilling gaps in `<dialog>` transitions and Invoker
     Commands. Once these ship natively in all target browsers, the
     `<el-dialog>` wrapper can be replaced with standard `<dialog>` + CSS
     transitions and native `commandfor`/`command`. The `<el-disclosure>` can be
     replaced with `<details>`/`<summary>` plus transition CSS.
  3. **Self-built Web Components** remain the last-resort fallback. The
     project's existing client-side script patterns (ADR-0020) provide the
     infrastructure for custom client-side behavior.

- **Opaque internals:** The library's behavior surface is small (open, close,
  transition, focus trap). Edge cases can be worked around with CSS or the
  project's own client-side scripts.

## Success Criteria

- All modal and disclosure interactions use `@tailwindplus/elements` Custom
  Elements — no parallel dialog/accordion implementations exist in the project
- No custom JavaScript is written for dialog open/close lifecycle or disclosure
  toggle behavior
- `@tailwindplus/elements` is the only client-side behavior dependency (no
  Alpine.js, no Headless UI, no custom dialog polyfills)
- The library version is pinned and managed by RenovateBot

## References

- [Tailwind Plus Elements Documentation](https://tailwindcss.com/plus/ui-blocks/documentation/elements)
- [Tailwind Plus Elements on npm](https://www.npmjs.com/package/@tailwindplus/elements)
- [Vanilla JS Support for Tailwind Plus](https://tailwindcss.com/blog/vanilla-js-support-for-tailwind-plus)
  — announcement blog post explaining the Custom Elements approach
- [Invoker Commands (TC39 Proposal)](https://open-ui.org/components/invokers.explainer/)
  — the `commandfor`/`command` platform API that Elements polyfills
- [ADR-0020: Client-Side Script Strategy](0020-client-side-script-strategy-revised.md)
  — module vs `is:inline` decision for client-side JavaScript
- [ADR-0027: Invokers API Modal Trigger Standard](0027-invokers-api-modal-trigger-standard.md)
  — formalizes the Invokers API (`command`/`commandfor`) as the project's
  modal-trigger mechanism; `el-dialog` provides the wrapping layer (enter/exit
  transitions, scroll-lock, focus-management) around the native `<dialog>`
  target — orthogonal to the Invokers API, not a fallback for it
- [ADR-0005: Adopt RenovateBot](0005-adopt-renovate-for-automated-dependency-management.md)
  — automated dependency update management
- [ADR-0006: Strict Environment and Dependency Pinning](0006-enforce-strict-environment-and-dependency-pinning.md)
  — pinning strategy for the locked version fallback
