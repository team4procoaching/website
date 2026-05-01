# Domain Data Integrity Pattern

Date: 2026-03-25

## Status

Accepted

> **Current state (March 2026):** The pattern is actively used across all domain
> datasets. References to Content Collection schemas (Zod) and
> `content.config.ts` in this ADR reflect the state at time of writing. Content
> Collections are temporarily not in use but the pattern will apply to Zod
> schemas again when they are reintroduced.

> **Note (2026-04-24):** The `Stat` / `CatalogStat` split in `src/data/stats.ts`
> refines this ADR's record pattern for the case where the same presentational
> shape appears in both keyed (catalog) and inline (display-only) contexts. The
> `as const satisfies Record<…>` requirement applies to the keyed form; inline
> usages stay on `readonly T[]`.

## Context

The project manages several domain datasets (coaches, service categories,
program types, quiz steps) that are referenced across multiple files: TypeScript
data modules, Astro components, Content Collection schemas (Zod), and MDX
frontmatter.

Before this decision, ID values were duplicated as manual string literals in
each consumer:

```typescript
// coaches.ts
type CoachExpanded = { id: string; ... };

// successStories.ts
type CoachId = 'helle' | 'gina' | 'irene';  // manually synced

// content.config.ts
coach: z.enum(['helle', 'gina', 'irene']),   // manually synced again
```

This created several failure modes:

1. **Typo in one location** — no compile error, silent data mismatch
2. **New entity added to one file but not others** — no compile error, runtime
   gaps (e.g., missing quiz result for a new service)
3. **ID type widened to `string`** — functions like `getCoachById(id: string)`
   accept any string, defeating the purpose of having known IDs
4. **Array completeness unverified** — a `CoachExpanded[]` could silently miss a
   coach entry without compile-time feedback

Evaluated approaches:

1. **Manual synchronization with comments** ("must match X in Y") — the original
   approach. Relies on discipline, fails silently. Rejected.
2. **Zod schema as source of truth** — would couple data modules to the Content
   Collection API. Zod types don't export const arrays. Rejected.
3. **Const array + derived type + Record with `satisfies`** — TypeScript
   enforces completeness at compile time, Zod consumes the same runtime array.
   **Chosen.**

## Decision

All domain datasets with ID-based cross-references use the **const-array +
Record + satisfies** pattern:

```typescript
// 1. Const array — the single source of truth (runtime value)
const coachIds = ['helle', 'gina', 'irene'] as const;

// 2. Derived type — never a manual union (compile-time type)
type CoachId = (typeof coachIds)[number];

// 3. Data record — satisfies guarantees every ID has a data entry
const coachesById = {
  helle: { id: 'helle', ... },
  gina:  { id: 'gina', ... },
  irene: { id: 'irene', ... },
} as const satisfies Record<CoachId, CoachExpanded>;

// 4. Ordered array — derived from the record, follows canonical ID order
const coachesExpanded = coachIds.map((id) => coachesById[id]);

// 5. Zod schema — consumes the same const array
coach: z.enum(coachIds),  // in content.config.ts
```

### Why `satisfies` Instead of Type Annotation

A type annotation (`: Record<CoachId, CoachExpanded>`) validates completeness
but **widens** literal types to their base types. For example, option IDs in
quiz data become `string` instead of `'competition-prep' | 'off-season' | ...`.

`satisfies` validates the Record constraint while **preserving** the literal
types from `as const`. This is critical when downstream code derives union types
from the data (e.g., `Step2OptionId` in `quiz.ts`).

### Downstream Type Derivation

The pattern enables cascading type safety across data modules:

```
services.ts          quiz.ts
categoryIds ──────► step2: Record<ServiceCategory, QuizStep>
                         │
                         ▼ (extract option IDs)
                    Step2OptionId
                         │
                         ▼
                    results: Record<Step2OptionId, QuizResult>
```

Adding a new service category without adding a quiz step and result entries
produces a compile error at each level.

### Lookup Functions

Because the data is a complete `Record<Id, Data>`, lookup functions return the
data type directly — not `Data | undefined`:

```typescript
// Direct record access — no find(), no undefined
function getCoachById(id: CoachId): CoachExpanded {
  return coachesById[id];
}
```

### Current Applications

| Data Module         | ID Array      | ID Type           | Record                                 |
| :------------------ | :------------ | :---------------- | :------------------------------------- |
| `coaches.ts`        | `coachIds`    | `CoachId`         | `coachesById`                          |
| `services.ts`       | `categoryIds` | `ServiceCategory` | `categoriesById`                       |
| `successStories.ts` | `programIds`  | `ProgramId`       | `programLabels`                        |
| `quiz.ts`           | (derived)     | `Step2OptionId`   | `step1OptionsById`, `step2`, `results` |

### Scope and Non-Goals

**In Scope:**

- Domain datasets with ID-based cross-references between files
- Datasets consumed by Zod schemas in Content Collections
- Datasets where completeness must be guaranteed (every ID has data)

**Out of Scope:**

- Simple display arrays without cross-references (testimonials, stats, USPs, FAQ
  items, navigation) — these remain plain `readonly T[]` arrays
- Client-side JavaScript data (serialized to `<template>` elements at build time
  — TypeScript constraints do not apply at runtime)

## Consequences

### Positive

- **Compile-time completeness**: Missing data entries for new IDs are caught
  before the code runs
- **Single source of truth**: Each ID value exists exactly once (in the const
  array), eliminating synchronization bugs
- **Type narrowing**: Lookup functions return `T` instead of `T | undefined`,
  simplifying consumer code
- **Zod alignment**: Content Collection validation uses the same runtime arrays,
  so TypeScript types and Zod schemas cannot diverge
- **Cascading safety**: Derived union types (like `Step2OptionId`) propagate
  completeness constraints to downstream data structures

### Negative

- **Boilerplate**: The four-step pattern (array → type → record → derived array)
  adds structural overhead compared to a simple array
- **Learning curve**: The `satisfies` keyword and `(typeof arr)[number]` idiom
  are less familiar to junior TypeScript developers
- **Indirection**: Data is defined in a `Record` and then mapped to an array,
  which adds a layer of indirection for readers who just want to see the data

### Risk Mitigation

- **Boilerplate**: The pattern is documented in
  [CONVENTIONS.md](../CONVENTIONS.md) with a copy-pasteable template
- **Learning curve**: The pattern is consistently applied across all applicable
  data modules, so developers learn it once
- **Indirection**: JSDoc comments on each Record explain its purpose and link to
  this ADR

## Success Criteria

- Every new domain entity type with cross-file ID references uses this pattern
- No manual string-literal ID duplication exists across data modules and Content
  Collection schemas
- Adding a new ID to any const array without updating all dependent Records
  produces a TypeScript error
- Code reviews flag deviations from this pattern for applicable data types

## References

- [CONVENTIONS.md](../CONVENTIONS.md) — implementation guide with code template
- [`type` for Component Props](../CONVENTIONS.md#typescript-conventions) —
  related TypeScript convention (consolidated from ADR-0009)
- [ADR-0011: Content Format Decision Framework](0011-content-format-decision-framework.md)
  — determines which data uses Collections vs. TypeScript modules
- [TypeScript `satisfies` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
  — language feature enabling this pattern
