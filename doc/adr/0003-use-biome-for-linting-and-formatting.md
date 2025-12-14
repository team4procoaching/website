# Use Biome for Linting and Formatting

Date: 2025-12-14

## Status

Superceded by [ADR-0004](0004-use-hybrid-formatting-biome-and-prettier.md)

## Context

To maintain code quality, consistent styling, and organized imports in our Astro project, we need to establish a linting and formatting strategy. The project will also utilize **Tailwind CSS** for styling, which benefits from consistent class sorting.

The industry standard has long been a combination of **ESLint** (for linting) and **Prettier** (for formatting), plus additional plugins for Tailwind. However, setting up these tools together often requires complex configuration to prevent conflicts, and managing their dependencies can be cumbersome ("dependency hell").

We evaluated **Biome** as a modern alternative.
* **Project constraints:** This is currently a solo-developer project, prioritizing low maintenance and high developer velocity.
* **Technical requirements:** TypeScript support, Astro file support, import sorting, and Tailwind class sorting are essential.

We compared the two options:
* **Biome:** A Rust-based all-in-one toolchain. It offers speed and zero-configuration defaults but has a smaller plugin ecosystem.
* **ESLint + Prettier:** The battle-tested standard with a massive ecosystem, but slower performance and higher configuration complexity.

## Decision

We will use **Biome** as the sole tool for code formatting, linting, and import sorting.
We will not install ESLint or Prettier.

## Consequences

**Positive:**
* **Performance:** Biome is written in Rust and is significantly faster than the Node.js-based ESLint/Prettier stack, improving the developer experience (DX) and CI pipeline speed.
* **Simplicity & Stability:** Reduces dependency bloat. One tool (`biome.json`) replaces multiple config files (`.eslintrc`, `.prettierrc`) and eliminates the risk of conflicting rules.
* **Tailwind Support:** Biome natively supports sorting Tailwind CSS classes, eliminating the need for the external `prettier-plugin-tailwindcss`.
* **Supply Chain Security:** Biome installs as a single binary with very few dependencies, significantly reducing the attack surface compared to the deep dependency tree of ESLint plugins.
* **Astro Compatibility:** Biome provides first-class support for Astro files and matches the tooling used by the official `astro.build` repository.

**Negative:**
* **No Type-Aware Linting:** Unlike `typescript-eslint`, Biome currently analyzes code primarily at the syntax level. It cannot enforce rules that require full type information, such as detecting **"floating promises"** (calling an async function without awaiting it). The existing `useAwait` rule only checks for usage inside an async function definition, not strictly for function calls. We accept this risk in favor of better performance.
* **Ecosystem Limits:** Specific niche linting rules available in the vast ESLint plugin ecosystem might be missing.
