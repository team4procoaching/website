# Use Hybrid Formatting Strategy (Biome + Prettier)

Date: 2025-12-14

## Status

Accepted

Supercedes [ADR-0003](0003-use-biome-for-linting-and-formatting.md)

## Context

We previously decided in [ADR-0003] to use **Biome** as the exclusive tool for
linting and formatting to minimize dependencies and maximize performance.

However, during implementation, we identified a gap in Biome's capabilities
regarding **MDX and Markdown** files. As this project relies heavily on MDX for
content (see [ADR-0001]), proper formatting for these files is critical. Biome's
support for Markdown is currently experimental and lacks the maturity of
established tools.

We evaluated two options:

1.  **Pure Biome:** Accept unformatted or strictly editor-formatted MDX files.
2.  **Hybrid Approach:** Use Biome for code and Prettier strictly for
    content/markdown.

## Decision

We will adopt a **Domain-Split Hybrid Strategy**:

1.  **Biome** is used for **Scripting & Logic** (`.js`, `.ts`, `.json`, `.css`).
    It provides fast linting and formatting for the application core.
2.  **Prettier** (with `prettier-plugin-astro`) is used for **Templating &
    Content** (`.astro`, `.md`, `.mdx`).

We decided **against** using Biome for Astro files because the documentation
(v2.3.0) states that Astro support is experimental and lacks language-specific
parsing (e.g., control flow inside templates), which creates a risk of broken
formatting.

## Consequences

**Positive:**

- **Reliability:** We use the industry-standard formatter (Prettier + official
  plugin) for Astro components, ensuring correct handling of complex template
  syntax.
- **Performance:** We still benefit from Biome's speed for pure
  TypeScript/JavaScript files.
- **Safety:** We avoid the risks associated with experimental features in our
  primary UI components.

**Negative:**

- **Setup Complexity:** Requires maintaining two configurations (`biome.json`
  and `.prettierrc.mjs`) and managing ignore files carefully to prevent overlap.
- **Dependencies:** We must install `prettier`, `prettier-plugin-astro`.
