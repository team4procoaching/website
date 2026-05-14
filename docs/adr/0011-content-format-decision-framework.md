# Content Format Decision Framework

Date: 2026-03-10

## Status

Accepted

> **Current state (March 2026):** Content Collections and MDX are temporarily
> not in use. Success stories were migrated from an MDX Collection to a
> TypeScript data module when detail pages were removed. The decision framework
> remains valid — Content Collections will be reintroduced when detail pages or
> CMS integration return.

## Context

The project uses three different locations for data that components consume:

1. **Content Collections** (`src/content/`) — Astro's built-in system with Zod
   schema validation and file-based entries (MDX or YAML).
2. **Data modules** (`src/data/`) — TypeScript files exporting typed arrays,
   objects, and helper functions.
3. **Inline data** — props defined directly in page files.

During a refactoring effort, testimonials (9 short quote objects) were migrated
from a TypeScript array to a YAML Content Collection with individual files. This
migration was reverted because it added complexity (9 new files, async fetching,
Zod schema, `toTestimonial()` mapper) without proportional benefit — the data
has no body text, no individual detail pages, and fewer than 20 entries. The
same analysis correctly kept services data as TypeScript.

The lack of a documented decision framework led to inconsistent format choices.
This ADR establishes the criteria.

## Decision

Use a three-question flowchart to determine the correct data format:

### Question 1: Does the entry have rich body text?

Multi-paragraph prose, headings, links, emphasis — content that benefits from
Markdown/MDX formatting and would be awkward as a TypeScript string literal.

- **Yes → MDX Content Collection.** The entry gets its own `.mdx` file with
  frontmatter for metadata and a body for prose. Example: success stories have
  an article body rendered on detail pages.
- **No → Continue to Question 2.**

### Question 2: Is the data tightly coupled to code logic?

Helper functions that compute derived values, nested structures referenced by
CSS selectors, arrays consumed by CSS-only switching mechanisms, or data that
references other TypeScript constructs.

- **Yes → TypeScript data module.** The data stays in `src/data/*.ts` as typed
  arrays or objects. Examples:
  - **Services:** Pricing arrays consumed by CSS-only `group-has-[...]`
    selectors, category assignments, helper functions (`getFeaturedServices()`).
  - **Navigation:** Directly consumed by header/footer components, tightly
    coupled to route structure.
  - **Coaches:** Achievements arrays, computed team experience
    (`getTotalExperience()`), helper functions (`getCoachById()`).
  - **Quiz:** Multi-step flow with step→result mappings, consumed by client-side
    JavaScript.
- **No → Continue to Question 3.**

### Question 3: Is the dataset large, growing, or maintained by non-developers?

A dataset that will realistically grow beyond ~20 entries, where adding entries
should not require touching TypeScript, or where CMS integration is planned.

- **Yes → Content Collection (YAML or MDX depending on Question 1).** Provides
  build-time Zod validation, file-based entries, and potential CMS integration
  via Astro's content layer adapters.
- **No → TypeScript data module.** A small, stable dataset maintained by
  developers gains nothing from Content Collection overhead.

### Current Data Format Assignments

| Data            | Q1: Body text? | Q2: Code-coupled? | Q3: Growing? | Format         |
| --------------- | -------------- | ----------------- | ------------ | -------------- |
| Success Stories | Yes (MDX body) | No                | Yes          | MDX Collection |
| Services        | No             | Yes (pricing/CSS) | No           | TypeScript     |
| Coaches         | Partially      | Yes (helpers)     | No           | TypeScript     |
| Testimonials    | No             | No                | Possibly     | TypeScript     |
| FAQ             | No             | No                | No           | TypeScript     |
| USPs            | No             | No                | No           | TypeScript     |
| Stats           | No             | No                | No           | TypeScript     |
| Navigation      | No             | Yes (routes)      | No           | TypeScript     |
| Quiz            | No             | Yes (JS flow)     | No           | TypeScript     |

**Testimonials rationale:** Currently 9 entries with flat structure (name,
quote, avatar, title, featured flag). No body text, no detail pages. The pool
may grow but is unlikely to exceed 20–30 entries, and only developers will add
them. TypeScript provides type safety, colocation with the `Testimonial` type,
and zero async overhead. Re-evaluate if a CMS is introduced or the pool
exceeds 30.

**Coaches fullBio rationale:** The `fullBio` field contains multi-paragraph
prose that would benefit from MDX formatting (Question 1). However, coaches data
is heavily code-coupled (Question 2) with helper functions and computed values.
A future hybrid approach (MDX for bios, TypeScript for structured data) may be
warranted when real bio content replaces the current TODO placeholders.

### Scope and Non-Goals

**In Scope:**

- Decision framework for choosing between Content Collections and TypeScript
  data modules.
- Classification of all current data types in the project.
- Guidance for adding new data types.

**Out of Scope:**

- CMS integration strategy (would trigger re-evaluation of this ADR).
- File naming conventions within Content Collections (covered by Astro
  defaults).
- Migration tooling for format changes.

## Consequences

### Positive

- **Consistent decisions:** New data types can be classified without ad-hoc
  judgment. The flowchart produces deterministic results.
- **Right tool for the job:** Content Collections are reserved for content that
  genuinely benefits from their features (MDX rendering, individual pages,
  file-based entries). TypeScript modules handle structured data with code
  dependencies.
- **Less accidental complexity:** Prevents premature migration of simple data
  arrays to Content Collections, which adds files, async fetching, and mapping
  code without proportional benefit.

### Negative

- **Testimonials stay in TypeScript:** Adding a testimonial requires editing a
  `.ts` file, not dropping in a YAML file. Acceptable for developer-maintained
  data.
- **Manual re-evaluation needed:** If a dataset's characteristics change (e.g.,
  coaches get CMS-managed bios), the framework must be re-applied and the format
  may need to change.

### Risk Mitigation

- **Re-evaluation triggers:** Each TypeScript data module's JSDoc references
  this ADR and states the conditions under which migration should be
  reconsidered (e.g., "Re-evaluate if pool exceeds 30 entries" for
  testimonials).
- **Low migration cost:** Moving from TypeScript to Content Collection is
  straightforward — the reverse direction (as demonstrated with testimonials) is
  equally simple.

## Success Criteria

- Every `src/data/*.ts` file with static content references this ADR in its
  JSDoc, stating why TypeScript was chosen.
- New data types are classified using the three-question flowchart before
  implementation.
- No Content Collection exists for data without body text, detail pages, or
  growth beyond 20 entries.

## References

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [ADR-0001: Use Astro and MDX](_archive/0001-use-astro-js.md)
- [ADR-0010: Image Architecture](0010-use-astro-image-component-consistently.md)
