# Organize Components into Domain-Based Subfolders

Date: 2026-02-01

## Status

Consolidated into
[docs/CONVENTIONS.md#component-folder-structure](../../CONVENTIONS.md#component-folder-structure)

## Context

The project's `components/` directory is growing as more Astro components are
added. Currently, all components reside in a flat structure directly under
`components/`. With the introduction of new UI primitives (Button, TextLink) and
section components (Hero), a decision is needed on how to organize these files.

Two approaches were evaluated:

1. **Flat Structure:** All components remain in `components/` with naming
   conventions to indicate purpose (e.g., `UiButton.astro`,
   `SectionHero.astro`).
2. **Domain-Based Subfolders:** Components are grouped by their architectural
   role into subfolders (`layout/`, `navigation/`, `sections/`, `ui/`).

As a solo developer with a background in strictly typed languages (Java/Go), I
value clear separation of concerns and predictable file locations over minimal
directory depth.

_This ADR was later amended by ADR-0008 to align the page-wrapper location with
Astro's project-structure convention. The substance of both ADRs is now
consolidated into
[docs/CONVENTIONS.md § File Naming → Component Folder Structure](../../CONVENTIONS.md#component-folder-structure)._

## Decision

I decide to adopt a **Domain-Based Subfolder Structure** for the `components/`
directory. Components are grouped by their architectural purpose:

```
components/
├── layout/        # Structural components (BaseLayout, BaseHead, SEO)
├── navigation/    # Navigation-related components (Header, menus, links)
├── sections/      # Page sections (Hero, Features, Testimonials, etc.)
└── ui/            # Reusable UI primitives (Button, TextLink, Logo)
```

**Classification Criteria:**

| Folder        | Purpose                                               | Examples                                 |
| ------------- | ----------------------------------------------------- | ---------------------------------------- |
| `layout/`     | Page structure, document head, meta tags              | BaseLayout, BaseHead, SEO                |
| `navigation/` | Site navigation, menus, routing                       | Header, DesktopMenu, MobileMenu, NavLink |
| `sections/`   | Self-contained page sections with layout              | Hero, Features, Testimonials             |
| `ui/`         | Small, reusable primitives without layout assumptions | Button, TextLink, Logo, Icon             |

**Import Convention:**

All imports use the `~/components/` alias with the full path:

```typescript
import Button from '~/components/ui/Button.astro';
import Hero from '~/components/sections/Hero.astro';
```

### Scope and Non-Goals

**In Scope:**

- Organization of `.astro` components in the `components/` directory.
- Classification criteria for new components.
- Import path conventions.

**Out of Scope:**

- Organization of other directories (`data/`, `pages/`, `styles/`).
- Component naming conventions beyond folder placement.
- Shared TypeScript types (remain in `data/` or dedicated `types/` directory).

## Consequences

### Positive

- **Predictable Location:** New components have a clear home based on their
  purpose, reducing decision fatigue.
- **Scalability:** The structure accommodates growth without cluttering a single
  directory.
- **IDE Navigation:** Subfolders provide natural grouping in file explorers and
  fuzzy finders.
- **Separation of Concerns:** The folder name communicates the component's
  architectural role.

### Negative

- **Deeper Imports:** Import paths are longer (`~/components/ui/Button.astro`
  vs. `~/components/Button.astro`).
- **Refactoring Overhead:** Moving components between folders requires updating
  all import statements.
- **Initial Migration:** Existing components must be moved and imports updated
  across the codebase.

### Risk Mitigation

- **TypeScript Path Aliases:** The `~/` alias keeps imports readable despite the
  additional depth.
- **IDE Support:** Modern IDEs (VS Code with Astro extension) handle import
  updates automatically during file moves.
- **Consistent Classification:** The decision table above provides clear
  guidance to prevent ambiguous placement.

## Success Criteria

- All existing components are migrated to the new structure without breaking the
  build.
- New components can be classified into the correct folder within 10 seconds
  using the criteria table.
- No component files exist directly in `components/` (all are in subfolders).

## References

- [Astro Project Structure](https://docs.astro.build/en/basics/project-structure/)
- [React File Structure Recommendations](https://react.dev/learn/thinking-in-react)
