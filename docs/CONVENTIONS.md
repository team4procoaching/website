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
| Test utilities       | camelCase  | `test-utils/assertions.ts` (shared helpers)     |
| Pages / routes       | kebab-case | `how-it-works/index.astro`, `[slug].astro`      |
| Component subfolders | camelCase  | `sections/howItWorks/`, `sections/coaches/`     |
| CSS files            | kebab-case | `global.css`, `fonts.css`                       |

**Note**: Pages _must_ use kebab-case (Astro URL routing). Component subfolders
use camelCase to align with their parent component names (e.g., `HowItWorks` →
`howItWorks/`). This is an intentional divergence, not an inconsistency.

**Page file structure**: Every page uses the `directory/index.astro` pattern,
even standalone pages without sub-pages:

```
src/pages/
├── index.astro                    # / (homepage — exception: root level)
├── coaches/index.astro            # /coaches
├── contact/index.astro            # /contact
├── contact/thanks.astro           # /contact/thanks (sub-page)
├── how-it-works/index.astro       # /how-it-works
├── privacy/index.astro            # /privacy
├── services/index.astro           # /services
├── success-stories/index.astro    # /success-stories
└── terms/index.astro              # /terms
```

This allows adding sub-pages later (e.g., `/coaches/[slug]`) without renaming
the parent file or breaking its Git history.

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
Astro convention).

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

1. External packages (`astro:assets`, `vitest`)
2. Alias imports (`~/data/*`, `~/utils/*`, `~/types/*`)
3. Relative imports (same directory only)

Type-only imports use `import type` — enforced by TypeScript's
`verbatimModuleSyntax` and Biome.

This covers **all file types including `.astro`** — Biome parses the frontmatter
for import sorting even though Prettier handles `.astro` formatting. In the
developer workflow:

- **VS Code**: Biome's `source.organizeImports` code action fires on save
  (configured in `.vscode/settings.json` for all languages including `[astro]`)
- **CLI**: `pnpm format` runs `organize-imports` as its first step

---

## Internal Routes

All internal URLs are defined in `src/data/routes.ts` as typed constants. Pages,
CTAs, navigation, and components import from this module instead of using
hardcoded strings:

```typescript
// ✅ Central route reference
import { routes } from '~/data/routes';
primaryCta={{ label: 'Contact Us', href: routes.contact }}

// ❌ Hardcoded string (prohibited)
primaryCta={{ label: 'Contact Us', href: '/contact' }}
```

**Page routes** (`routes.home`, `routes.services`, etc.) are absolute paths.

**Anchor routes** (`homeAnchors.services`, `coachesAnchors.meetTheCoaches`,
etc.) are scoped to specific pages and include the `#` prefix. Each page's
anchors are a separate export to make the scope explicit.

**Rationale**: Eliminates string duplication across pages, data modules, and
components. When a route changes, only `routes.ts` needs updating — TypeScript
flags any consumers that reference removed or renamed exports.

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
modules, components). Currently: coaches, service categories, program types,
quiz steps/results.

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

The `isDarkBackground()` utility in `src/styles/sectionStyles.ts` is the single
source of truth for which `SectionBackground` values are considered dark.

---

## Client-Side Scripts

Module `<script>` is the **default** for all client-side JavaScript.
`<script is:inline>` is reserved for **Critical Early Execution** only — code
that must run before the browser finishes parsing the HTML. See
[ADR-0020](adr/0020-client-side-script-strategy-revised.md).

Currently, `CoachDetailModal` still uses `is:inline` (legacy from ADR-0012). It
will be migrated to a module script opportunistically — when next modified for
any reason.

### Module Script Structure (default)

For simple components, the script lives inline in the `.astro` file:

```typescript
/** Initialize a single component instance. Must be idempotent. */
function initComponent(root: HTMLElement): void {
  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  // ... component logic with full TypeScript support
}

/** Find and initialize all instances on the page. */
function initAll(): void {
  document
    .querySelectorAll<HTMLElement>('[data-my-component]')
    .forEach(initComponent);
}

// Executes once when the module loads. The listener persists and fires
// on every View Transition navigation.
document.addEventListener('astro:page-load', initAll);
```

### Controller Extraction (complex components)

When a component's client-side logic exceeds ~100 lines or has multiple distinct
concerns (state management, DOM manipulation, event binding), extract the
controller into `src/scripts/`:

```typescript
// src/scripts/myController.ts — testable, focused functions
export function initMyComponent(root: HTMLElement): void { ... }

// Component.astro — thin script, just import + init
<script>
  import { initMyComponent } from '~/scripts/myController';
  document.addEventListener('astro:page-load', () => { ... });
</script>
```

**Current example**: `QuizModal.astro` imports from
`~/scripts/quizModalController.ts`. The controller is independently testable
with jsdom (see `quizModalController.test.ts`).

### `is:inline` Structure (Critical Early Execution only)

```javascript
(function () {
  // @inline — Critical Early Execution, see ADR-0020
  // Must run before HTML parsing completes to prevent [specific issue]
  // ...
})();
```

### Rules

**Both patterns:**

- **Idempotent initialization** — the `data-initialized` guard ensures
  re-calling init on an already-initialized element is a no-op
- **Multi-instance safe** — use `querySelectorAll` + per-root init, not
  `querySelector` (components must not assume they are singletons)
- **DOM API only** — never `innerHTML` for user-facing content (XSS prevention)
- **`replaceChildren()`** for clearing container content (not `while`-loops)

**Module scripts:**

- **`const`/`let`** — standard modern JavaScript
- **TypeScript** — typed DOM queries, typed JSON consumption
- **`astro:page-load` listener** for View Transition support (fires on initial
  load and every subsequent navigation)
- **Event listener cleanup** — listeners on elements inside the component root
  are cleaned up implicitly by DOM swap. Listeners on global objects (`window`,
  `document`, observers) require explicit teardown via `astro:before-swap`

**`is:inline` scripts (legacy / Critical Early Execution):**

- **IIFE wrapper** — necessary because `is:inline` executes in global scope
  (module scripts have implicit scope isolation)
- **`let`/`const`** — all target browsers support them (`var` is no longer
  required)
- **Comment header** with `@inline` tag explaining why `is:inline` is needed

### Data Passing (Astro → Client)

Build-time data is serialized to a hidden `<template>` element:

```astro
<template id="my-data" data-json={JSON.stringify(data)}></template>
```

### Error Handling

JSON parsing from `<template>` elements follows this pattern:

```typescript
const dataEl = document.getElementById('my-data');
if (!dataEl) return;

const json = dataEl.getAttribute('data-json');
if (!json) return;

let data: MyDataType[];
try {
  data = JSON.parse(json);
} catch (e) {
  console.error('[ComponentName] Failed to parse data', e);
  return;
}
```

Three layers: null-check on element → null-check on attribute → try/catch with
component-prefixed error log. The type annotation on `JSON.parse` provides
compile-time safety but not runtime validation — the data is trusted because it
is generated at build time from typed data modules.

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

> ⚠️ **Astro 6 parser strictness**: JSX comments (`{/* ... */}`) must be placed
> _before_ the element, not _inside_ the element's attribute list. The stricter
> JSX parser interprets braces between attributes as expressions, causing type
> errors.
>
> ```astro
> {/* ✅ Comment before element */}
> <svg class="size-6" set:html={icon} />
>
> {/* ❌ Comment inside attribute list — causes parse errors */}
> <svg class="size-6" {/* SAFETY: ... */} set:html={icon} />
> ```

If a new `set:html` usage is added without this comment, it should be flagged in
code review.

---

## TypeScript Conventions

### Style Guide Baseline

This project follows the
[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
as its baseline for TypeScript code style. Enforcement is automated at two
levels:

- **Biome** enforces formatting (semicolons, single quotes, trailing commas) and
  structural rules (`noDefaultExport`, `useConsistentArrayType`, `noConstEnum`,
  `useGuardForIn`, etc.). Run via `pnpm lint`.
- **`scripts/check-conventions.mjs`** covers rules Biome cannot express: no
  `parseInt`/`parseFloat`, no `interface` for object shapes (ADR-0009), and
  camelCase file naming. The check functions live in
  `scripts/conventions/checks.mjs` (pure logic, independently testable); the CLI
  wrapper handles I/O and reporting. Run via `pnpm check:conventions`.

Both run as part of `pnpm check`.

The project deviates from Google's guide in two documented cases:

#### Deviation 1: `type` over `interface` for object shapes

Google recommends `interface` for object literal types. This project uses `type`
exclusively, as decided in
[ADR-0009](adr/0009-use-types-for-component-props.md).

**Rationale:**

- `type` supports unions and intersections natively — frequently needed for
  component props and discriminated unions (`ImageSource`, `CtaAction`).
- `interface` allows implicit declaration merging, which is undesirable for
  component props where accidental merging could introduce bugs.
- Consistent with the Astro/frontend ecosystem convention (Matt Pocock's Total
  TypeScript recommends `type` as default).

**Where `type` is required** (not a style choice): discriminated unions
(`ImageSource`, `CtaAction`), string literal unions (`ServiceCategory`,
`CoachId`, `SectionBackground`), and type aliases (`FooterLink = NavItem`).

#### Deviation 2: `camelCase` file names instead of `snake_case`

Google's internal convention uses `snake_case` for TypeScript file names. This
project uses `camelCase` for `.ts` files and `PascalCase` for `.astro`
components (see [File Naming](#file-naming) above).

**Rationale:**

- Astro components must be PascalCase. Using `snake_case` for `.ts` files would
  introduce a third naming convention alongside PascalCase (`.astro`) and
  kebab-case (pages/routes).
- `camelCase` is the de-facto standard in the frontend ecosystem (React, Vue,
  Astro, Next.js).
- Google explicitly notes that its guide is _"specifically useful for people
  authoring code they intend to import into Google, but otherwise may not apply
  in your external environment."_

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

scripts/conventions/
├── checks.mjs
└── checks.test.mjs
```

Vitest discovers tests in both `src/` (`.test.ts`) and `scripts/` (`.test.mjs`)
— see `vitest.config.ts` for the include patterns.

**Shared test helpers** live in `src/test-utils/` — use these before writing
inline assertion helpers to avoid duplication:

```typescript
import { assertDefined, assertNotNull } from '~/test-utils/assertions';

const el = modal.querySelector<HTMLInputElement>('.my-input');
assertNotNull(el); // Fails fast if null, narrows type to HTMLInputElement
el.checked = true; // No lint warning, no `!` needed
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
