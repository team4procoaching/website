# Clarify Distinction Between src/layouts/ and components/layout/

Date: 2026-02-01

## Status

Consolidated into
[docs/CONVENTIONS.md#component-folder-structure](../../CONVENTIONS.md#component-folder-structure)

## Context

[ADR-0007](0007-component-folder-structure.md) introduced a domain-based
subfolder structure for components. However, it incorrectly placed
`BaseLayout.astro` in `components/layout/`, which conflicts with Astro's
established project structure convention.

Astro's official documentation designates `src/layouts/` as the conventional
location for page wrapper components—those that contain `<html>`, `<body>`, and
`<slot />` to wrap entire pages.

This led to confusion about the purpose of `components/layout/` versus
`src/layouts/`.

_This ADR amended ADR-0007; both are now consolidated into the same
[docs/CONVENTIONS.md § File Naming → Component Folder Structure](../../CONVENTIONS.md#component-folder-structure)
section._

## Decision

I decide to **clarify the distinction** between the two locations:

| Location             | Purpose                 | Characteristics                                             |
| -------------------- | ----------------------- | ----------------------------------------------------------- |
| `src/layouts/`       | Page wrappers           | Contains `<html>`, `<body>`, `<slot />`; wraps entire pages |
| `components/layout/` | Layout helper fragments | Used _within_ layouts or pages; does not wrap pages         |

**Concrete Assignment:**

| Component          | Location             | Rationale                                 |
| ------------------ | -------------------- | ----------------------------------------- |
| `BaseLayout.astro` | `src/layouts/`       | Page wrapper with `<slot />`              |
| `BaseHead.astro`   | `components/layout/` | `<head>` fragment, used within BaseLayout |
| `SEO.astro`        | `components/layout/` | Meta tags fragment, used within BaseHead  |

**Updated Directory Structure:**

```
src/
├── layouts/                 # Page wrappers (Astro convention)
│   └── BaseLayout.astro
└── components/
    ├── layout/              # Layout helper fragments
    │   ├── BaseHead.astro
    │   └── SEO.astro
    ├── navigation/
    ├── sections/
    └── ui/
```

### Scope and Non-Goals

**In Scope:**

- Clarification of the boundary between `src/layouts/` and `components/layout/`.
- Correction of component placement from ADR-0007.

**Out of Scope:**

- Changes to other component folders (`navigation/`, `sections/`, `ui/`).
- Changes to the classification criteria for those folders.

## Consequences

### Positive

- **Astro Alignment:** Follows Astro's official project structure, making the
  codebase familiar to other Astro developers.
- **Clear Mental Model:** "layouts/ = page wrappers, components/layout/ = helper
  fragments" is easy to remember.
- **Discoverability:** New developers looking for page templates will find them
  in the expected location.

### Negative

- **Amendment Overhead:** Requires updating ADR-0007's documentation references
  and any components already moved incorrectly.

### Risk Mitigation

- **Documentation Update:** ARCHITECTURE.md, DEVELOPMENT.md, and CONTRIBUTING.md
  are updated to reflect this clarification.
- **Simple Rule:** If a component has `<slot />` and wraps an entire page, it
  goes in `src/layouts/`. Everything else goes in `components/`.

## Success Criteria

- `BaseLayout.astro` resides in `src/layouts/`.
- `BaseHead.astro` and `SEO.astro` reside in `components/layout/`.
- No page wrapper components exist in `components/layout/`.
- Documentation accurately reflects the distinction.

## References

- [Astro Project Structure - Layouts](https://docs.astro.build/en/basics/layouts/)
- [ADR-0007: Component Folder Structure](0007-component-folder-structure.md)
