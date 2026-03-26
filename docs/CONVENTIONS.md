# Coding Conventions

Project-specific coding patterns and naming conventions for the **Team 4 Pro
Coaching** website. This document complements
[CONTRIBUTING.md](../CONTRIBUTING.md) (workflow and process) and
[ARCHITECTURE.md](ARCHITECTURE.md) (high-level decisions).

**Rule of thumb**: If a convention is _why_ we do something → ADR. If it's _how_
we do something consistently → this document.

---

## File Naming

| Category             | Convention | Examples                                        |
| :------------------- | :--------- | :---------------------------------------------- |
| Components           | PascalCase | `CoachCardExpanded.astro`, `PillSwitcher.astro` |
| Data modules         | camelCase  | `coaches.ts`, `successStories.ts`               |
| Utility functions    | camelCase  | `slugify.ts`, `isExternal.ts`, `counter.ts`     |
| Type files           | camelCase  | `components.ts`                                 |
| Test files           | camelCase  | `slugify.test.ts` (co-located with source)      |
| Pages / routes       | kebab-case | `how-it-works/index.astro`, `[slug].astro`      |
| Component subfolders | camelCase  | `sections/howItWorks/`, `sections/coaches/`     |
| CSS files            | kebab-case | `global.css`, `fonts.css`                       |

**Note**: Pages _must_ use kebab-case (Astro URL routing). Component subfolders
use camelCase to align with their parent component names (e.g., `HowItWorks` →
`howItWorks/`). This is an intentional divergence, not an inconsistency.

---

## Naming Patterns in Data Modules

| Pattern          | Convention        | Examples                                |
| :--------------- | :---------------- | :-------------------------------------- |
| ID arrays        | `{domain}Ids`     | `coachIds`, `categoryIds`, `programIds` |
| Derived ID types | `{Domain}Id`      | `CoachId`, `ProgramId`                  |
| Record lookups   | `{domain}ById`    | `coachesById`, `categoriesById`         |
| Section config   | `{domain}Section` | `coachesSection`, `servicesSection`     |
| Display labels   | `{domain}Labels`  | `programLabels`                         |

**Exception**: `ServiceCategory` does not follow `{Domain}Id` because a category
is semantically a classification, not an entity identifier. This is intentional.

---

## Exports

All data modules use **collected export blocks at the end of the file** — not
inline `export` at each declaration. This provides a clear public API summary
and makes it immediately visible what is internal vs. exported.

```typescript
// ✅ Collected exports (project convention)
const coachIds = [...] as const;
type CoachId = (typeof coachIds)[number];
const coachesById = { ... } satisfies Record<CoachId, CoachExpanded>;

export { coachIds, coachesById, coachesExpanded };
export type { CoachId, CoachExpanded };
```

```typescript
// ❌ Inline exports (not used in this project)
export const coachIds = [...] as const;
export type CoachId = (typeof coachIds)[number];
```

**Value exports** and **type exports** are in separate `export` / `export type`
blocks for clarity.

**Applies to**: `src/data/*.ts`, `src/utils/*.ts`, `src/types/*.ts`.

**Does not apply to**: Astro components (which export only `Props` via implicit
Astro convention) and `content.config.ts` (Astro convention).

---

## Imports

### Path Aliases

All imports use the `~` alias for `src/`:

```typescript
// ✅ Alias import
import { slugify } from '~/utils/slugify';
import type { CoachId } from '~/data/coaches';

// ❌ Relative import (only acceptable within the same directory)
import { slugify } from '../../utils/slugify';
```

### No Barrel Files

The project does **not** use `index.ts` re-exports. All imports point directly
to the source file:

```typescript
// ✅ Direct import
import { coachIds } from '~/data/coaches';

// ❌ Barrel import (prohibited)
import { coachIds } from '~/data';
```

**Rationale**: Barrel files degrade tree-shaking reliability, attract circular
dependencies, slow down TypeScript type resolution, and obscure the actual
dependency graph. Direct imports keep dependencies explicit — consistent with
the project's YAGNI approach.

### Import Ordering

Import ordering is **enforced by Biome** (`organizeImports: "on"` in
`biome.json`). No manual sorting required. The logical grouping Biome applies:

1. External packages (`astro:content`, `vitest`)
2. Alias imports (`~/data/*`, `~/utils/*`, `~/types/*`)
3. Relative imports (same directory only)

Type-only imports use `import type` — enforced by TypeScript's
`verbatimModuleSyntax` and Biome.

---

## Data Integrity: `as const satisfies Record<>` Pattern

Domain data with ID-based lookups uses the **const-array + Record + satisfies**
pattern to guarantee compile-time completeness:

```typescript
// 1. ID array — single source of truth
const coachIds = ['helle', 'gina', 'irene'] as const;

// 2. ID type — derived, never manually written
type CoachId = (typeof coachIds)[number];

// 3. Data record — satisfies guarantees completeness
const coachesById = {
  helle: { id: 'helle', ... },
  gina:  { id: 'gina', ... },
  irene: { id: 'irene', ... },
} as const satisfies Record<CoachId, CoachExpanded>;

// 4. Ordered array — derived, follows canonical order
const coachesExpanded = coachIds.map((id) => coachesById[id]);
```

**Why `satisfies` instead of `: Record<>`**: A type annotation widens literal
types to `string`. `satisfies` validates completeness while preserving literal
types — critical when downstream code derives union types from the data (e.g.,
`Step2OptionId` in `quiz.ts`).

**When to use**: Any dataset where IDs are referenced across files (data
modules, Content Collections via Zod, components). Currently: coaches, service
categories, program types, quiz steps/results.

**When NOT to use**: Simple display arrays without cross-references
(testimonials, stats, USPs, FAQ items, navigation).

---

## Component Composition

### Section Components Wrap `Content.astro`

Section components (`Stats`, `Coaches`, `Usps`, `SuccessStories`) delegate their
layout to `Content.astro` and inject domain-specific content via slots:

```astro
<Content headline={headline} background={background}>
  <slot />
  <!-- Intro text (default slot) -->
  <Fragment slot="content">
    <ul class="grid ...">...</ul>
    <!-- Domain-specific grid -->
  </Fragment>
</Content>
```

This keeps layout logic (padding, max-width, section backgrounds) in one place.

### Dark Background Handling

Components that render on both light and dark section backgrounds accept a
`darkBackground` prop (or derive it via `isDarkBackground(background)`). Style
variants are computed as objects or ternaries in the frontmatter, not in the
template:

```typescript
// ✅ Style variants in frontmatter
const styles = darkBackground
  ? { title: 'text-white', ... }
  : { title: 'text-foreground-950', ... };
```

The `isDarkBackground()` utility in `src/utils/styles.ts` is the single source
of truth for which `SectionBackground` values are considered dark.

---

## Client-Side Scripts (`is:inline`)

Scripts that read build-time data from `<template>` elements or need
re-execution after View Transitions use `<script is:inline>`. These follow
specific conventions per [ADR-0012](adr/0012-client-side-script-strategy.md):

### Structure

```javascript
(function () {
  function init() {
    var container = document.querySelector('[data-my-component]');
    if (!container || container.dataset.initialized === 'true') return;
    container.dataset.initialized = 'true';

    // ... component logic
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('astro:page-load', init);
})();
```

### Rules

- **IIFE wrapper** to avoid global scope pollution
- **`var`** instead of `let`/`const` (older parser compatibility, per ADR-0012)
- **`data-*-initialized` guard** to prevent double initialization
- **DOM API only** — never `innerHTML` for user-facing content (XSS prevention)
- **`replaceChildren()`** for clearing container content (not `while`-loops)

### Data Passing (Astro → Client)

Build-time data is serialized to a hidden `<template>` element:

```astro
<template id="my-data" data-json={JSON.stringify(data)}></template>
```

### Error Handling

JSON parsing from `<template>` elements follows this pattern:

```javascript
var dataEl = document.getElementById('my-data');
if (!dataEl) return;

var json = dataEl.getAttribute('data-json');
if (!json) return;

var data;
try {
  data = JSON.parse(json);
} catch (e) {
  console.error('[ComponentName] Failed to parse data', e);
  return;
}
```

Three layers: null-check on element → null-check on attribute → try/catch with
component-prefixed error log. The `console.error` prefix (`[ComponentName]`)
identifies the source immediately in DevTools.

### Data Attribute Naming

Client-side scripts use `data-{domain}-{element}` attributes:

```html
data-coach-id="helle"
<!-- domain: coach, element: id -->
data-category-tab="wellness"
<!-- domain: category, element: tab -->
data-filter-select
<!-- domain: filter, element: select -->
data-quiz-step="1"
<!-- domain: quiz, element: step -->
```

The `PillSwitcher` component formalizes this via the `name` prop, which
generates `data-{name}-tab` and `data-{name}-select` attributes.

---

## CSS Conventions

### Tailwind CSS vs. Custom Classes

**Default**: Use Tailwind utility classes directly in templates.

**Custom classes in `global.css`** are justified only when Tailwind cannot
express the pattern:

- Keyframe animations (`@keyframes` + `animation:`)
- Pseudo-element effects (`::after`, `::before` with gradient sweeps)
- Complex multi-property hover transitions
- Browser workarounds (`scrollbar-hide`)

**`@apply` is not used.** Tailwind's `@apply` extracts utilities into CSS
classes — this defeats the utility-first approach, creates an abstraction layer
that hides what styles are applied, and makes it harder to search for class
usage. If a pattern needs a custom class, write the CSS properties directly
instead of compositing utilities via `@apply`.

### Custom Class Naming

Custom utility classes in `global.css` use **kebab-case**:

```css
.hover-scale { ... }
.hover-shine { ... }
.animated-underline { ... }
.scrollbar-hide { ... }
```

### Animation Data Attributes

Scroll-reveal animations use `data-animate` with predefined values. See
[Animation System Reference](reference/animation-system.md) for the full list.

### `set:html` Safety

Every use of Astro's `set:html` directive has a `SECURITY` or `SAFETY` comment
confirming the content is from a trusted static source:

```astro
{/* SAFETY: icon content is statically defined in ~/data/icons.ts */}
<svg set:html={icon} />
```

If a new `set:html` usage is added without this comment, it should be flagged in
code review.

---

## TypeScript Conventions

### Props Definitions

Component props use `type` (not `interface`) per
[ADR-0009](adr/0009-use-types-for-component-props.md):

```typescript
type Props = {
  /** Headline text */
  headline: string;
  /** Background variant */
  background?: SectionBackground;
};
```

### Image Handling

Content images use the `ImageSource` discriminated union and `SmartImage`
component per [ADR-0010](adr/0010-use-astro-image-component-consistently.md).
Small decorative images (≤ 64px, e.g., avatars) may use plain `<img>`.

---

## Testing Conventions

Test files are **co-located** with their source:

```
src/utils/
├── slugify.ts
├── slugify.test.ts
├── isExternal.ts
├── isExternal.test.ts
├── counter.ts
└── counter.test.ts
```

Tests should cover: JSDoc examples, edge cases, error cases, and real-world
values from the project's data modules. See
[ADR-0016](adr/0016-use-vitest-for-unit-testing.md).

---

## Related Documentation

| Document                                          | Focus                          |
| :------------------------------------------------ | :----------------------------- |
| [CONTRIBUTING.md](../CONTRIBUTING.md)             | Workflow, commits, PR process  |
| [ARCHITECTURE.md](ARCHITECTURE.md)                | High-level decisions and ADRs  |
| [DEVELOPMENT.md](DEVELOPMENT.md)                  | Setup, tooling, daily workflow |
| [Animation System](reference/animation-system.md) | Scroll reveals, hover effects  |
| [Color System](reference/color-system.md)         | Design tokens, backgrounds     |
