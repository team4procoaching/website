# Use Named Exports for Data Modules

Date: 2026-03-16

## Status

Accepted

## Context

The project's data layer (`src/data/*.ts`) used two export patterns
inconsistently:

1. **Default export:** `navigation.ts`, `stats.ts`, `site.ts` exported their
   main config object as `export default`.
2. **Named exports:** `coaches.ts`, `services.ts`, `contact.ts`, `cta.ts`,
   `testimonials.ts`, `usps.ts`, `quiz.ts`, `thanks.ts` used `export { ... }`.

The inconsistency was flagged in a post-refactoring code review. Default exports
have known downsides for maintainability:

- **Rename risk:** Consumers can import under any name
  (`import foo from '~/data/navigation'`), making global search-and-replace
  unreliable.
- **Auto-import friction:** IDE auto-imports work better with named exports
  because the symbol name is unambiguous.
- **Tree-shaking:** While Astro/Vite handles both, named exports make the
  dependency graph more explicit.
- **Astro convention:** Astro's own documentation and examples use named exports
  for data and configuration modules.

## Decision

All `src/data/*.ts` modules use **named exports exclusively**. No default
exports.

### Rules

- Export data objects via `export { configName }` or `export { name1, name2 }`.
- Export types via `export type { TypeName }` (separate from value exports for
  clarity).
- Inline `export type` at the definition site is acceptable for types that are
  only used externally (e.g., `export type LogoConfig = { ... }`).
- Consumers import with `import { configName } from '~/data/module'`.

### Scope and Non-Goals

**In Scope:**

- All files in `src/data/*.ts`.
- Consumer imports in pages, layouts, and components.

**Out of Scope:**

- Component default exports (Astro components are imported by filename, not by
  export name — default export is the Astro convention there).
- Third-party library re-exports.

## Consequences

### Positive

- **Consistent pattern:** One export style across all 11 data modules. No
  decision needed per file.
- **Reliable refactoring:** `grep 'siteConfig'` finds every usage because the
  name is fixed at the export site.
- **Better IDE support:** Auto-imports use the canonical name.

### Negative

- **Slightly more verbose imports:** `import { siteConfig } from` vs
  `import siteConfig from`. Negligible.

### Risk Mitigation

- Biome/ESLint rule `no-default-export` can enforce this in the future (scoped
  to `src/data/`).

## Success Criteria

- Zero `export default` in `src/data/*.ts`.
- All consumer imports use destructuring syntax (`import { ... } from`).

## References

- [Astro Island Architecture](https://docs.astro.build/en/concepts/islands/)
- [ADR-0009: Use `type` for Component Props](0009-use-types-for-component-props.md)
