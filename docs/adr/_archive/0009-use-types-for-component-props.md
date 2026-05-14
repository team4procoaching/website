# Use `type` for Component Props Definitions

Date: 2026-02-14

## Status

Consolidated into
[docs/CONVENTIONS.md#typescript-conventions](../../CONVENTIONS.md#typescript-conventions)

## Context

The current codebase inconsistently uses both `type` and `interface` for
defining component props (e.g., in `Footer.astro`). This leads to an
inconsistent coding style across the project.

TypeScript supports both constructs, but for Astro component props a uniform
choice improves readability and maintainability. Key considerations:

- **Union and intersection types:** `type` supports these natively, which is
  frequently needed for props (e.g., variant unions, composed prop sets).
- **Declaration merging:** `interface` allows implicit declaration merging,
  which is useful for library augmentation but undesirable for component props
  where accidental merging could introduce bugs.
- **IDE error messages:** Modern IDEs tend to produce more precise error
  messages for `type` aliases when used with object shapes.
- **Community guidance:** Matt Pocock (Total TypeScript) recommends using `type`
  by default and reserving `interface` for object inheritance via `extends`.

## Decision

All `Props` definitions in Astro components and data structures use `type`
aliases exclusively.

**Example:**

```typescript
type Props = {
  siteName: string;
  logo: LogoConfig;
};
```

All existing `interface Props` definitions (currently 5 files) are converted as
part of this decision.

### Scope and Non-Goals

**In Scope:**

- `Props` definitions in `.astro` files.
- Data structure definitions in `src/data/`.

**Out of Scope:**

- Type definitions in external/third-party libraries.
- Cases requiring declaration merging (e.g., module augmentation), where
  `interface` remains the correct choice.

## Consequences

### Positive

- **Consistency:** A single, uniform pattern for all props definitions across
  the project.
- **Flexibility:** `type` natively supports union types, intersections, and
  mapped types — patterns commonly needed for component props.
- **Clarity:** Eliminates the need to decide between `type` and `interface` on a
  case-by-case basis.

### Negative

- **Minimal migration effort:** 5 files require conversion from `interface` to
  `type`, which is a trivial change.

### Risk Mitigation

- All existing components are converted immediately alongside this ADR.
- All newly created components follow the `type Props` convention.
- An ESLint rule can be added in the future to enforce this automatically.

## Success Criteria

- Zero `interface Props` definitions remain in `.astro` files.
- All new components and data structures use `type` exclusively.

## References

- [Type vs Interface: Which Should You Use? — Total TypeScript](https://www.totaltypescript.com/type-vs-interface-which-should-you-use)
- [TypeScript Playground: Types vs Interfaces](https://www.typescriptlang.org/play/typescript/language-extensions/types-vs-interfaces.ts.html)
- [ADR-0007: Component Folder Structure](0007-component-folder-structure.md)
