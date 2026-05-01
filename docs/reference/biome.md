# Biome Configuration & Workflow

Detailed documentation for the Biome formatter and linter configuration
[`biome.json`](../../biome.json) and our hybrid tooling strategy.

## Table of Contents

- [Overview](#overview)
- [Hybrid Strategy (Biome + Prettier)](#hybrid-strategy-biome--prettier)
- [Astro File Handling](#astro-file-handling)
- [Version Control Integration](#version-control-integration)
- [Formatter Configuration](#formatter-configuration)
- [Linter Configuration](#linter-configuration)
- [Tailwind CSS Integration](#tailwind-css-integration)
- [VS Code Configuration](#vs-code-configuration)
- [Why These Settings?](#why-these-settings)
- [Suppressing Rules](#suppressing-rules)
- [Auto-Formatting with Assist](#auto-formatting-with-assist)
- [Related Documentation](#related-documentation)

---

## Overview

[Biome](https://biomejs.dev) is a fast, modern toolchain for web development,
written in Rust. It replaces ESLint and Prettier for JavaScript, TypeScript,
JSON, and CSS files to maximize performance and consistency.

The linter rules are configured to enforce the
[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
as the project's baseline. Rules marked with "Google TS §_n_" in the tables
below map to specific sections of that guide. See
[CONVENTIONS.md](../CONVENTIONS.md#style-guide-baseline) for documented
deviations.

## Hybrid Strategy (Biome + Prettier)

We follow a **Domain-Split Hybrid Strategy** as defined in
[ADR 0004](../adr/0004-use-hybrid-formatting-biome-and-prettier.md).

| Domain                   | File Types                            | Tool         | Reason                                                                |
| :----------------------- | :------------------------------------ | :----------- | :-------------------------------------------------------------------- |
| **Scripting & Logic**    | `.js`, `.ts`, `.tsx`, `.json`, `.css` | **Biome**    | Extremely fast, strict linting, robust formatting.                    |
| **Content & Templating** | `.astro`, `.md`, `.mdx`, `.yaml`      | **Prettier** | Mature ecosystem, better support for mixed-content files (Astro/MDX). |

**Note:** Ensure your editor (VS Code) is configured to use the correct default
formatter for each file language.

---

## Astro File Handling

Astro files (`.astro`) are **explicitly excluded** from both Biome formatting
and linting. This is configured via the `includes` property in both sections:

```json
{
  "formatter": {
    "includes": ["**", "!**/*.astro"]
  },
  "linter": {
    "includes": ["**", "!**/*.astro"]
  }
}
```

### Why exclude Astro files from Biome?

1. **Template Recognition**: Biome only analyzes the JavaScript/TypeScript
   frontmatter (between `---` markers) but cannot see component usage in the
   template section below. This causes false positives like "unused import" for
   components that are actually used in the template.

2. **Experimental Support**: Biome's Astro support is experimental and lacks
   language-specific parsing for control flow inside templates, risking broken
   formatting.

3. **ADR Compliance**: Per
   [ADR-0004](../adr/0004-use-hybrid-formatting-biome-and-prettier.md), Prettier
   with `prettier-plugin-astro` is the designated tool for Astro files.

### What handles Astro files instead?

| Concern           | Tool                             | Command                               |
| :---------------- | :------------------------------- | :------------------------------------ |
| **Formatting**    | Prettier + prettier-plugin-astro | `pnpm format:prettier`                |
| **Type Checking** | Astro's built-in checker         | `pnpm typecheck` (runs `astro check`) |
| **Linting**       | N/A (covered by TypeScript)      | `pnpm typecheck`                      |

### Common False Positives (now resolved)

Before excluding Astro files, Biome would report these false positives:

```
src/components/BaseHead.astro:2:8 noUnusedImports
  ! This import is unused.
  > import SEO from './SEO.astro';
```

This occurred because `<SEO />` was used in the template, but Biome couldn't see
beyond the frontmatter. With the exclusion in place, these warnings no longer
appear.

---

## Version Control Integration

```json
{
  "vcs": {
    "clientKind": "git",
    "enabled": true,
    "useIgnoreFile": true
  }
}
```

**Purpose**: Integrates Biome with Git version control. Files ignored in
`.gitignore` are automatically ignored by Biome.

---

## Formatter Configuration

### General Settings

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "includes": ["**", "!**/*.astro"]
  }
}
```

**Settings Explained:**

| Setting       | Value                   | Why?                                                                          |
| :------------ | :---------------------- | :---------------------------------------------------------------------------- |
| `indentStyle` | `"space"`               | Spaces ensure consistent rendering across all editors.                        |
| `indentWidth` | `2`                     | Industry standard for modern JS/TS projects.                                  |
| `lineWidth`   | `100`                   | Balances readability with code density on modern screens.                     |
| `includes`    | `["**", "!**/*.astro"]` | **Crucial:** Explicitly excludes `.astro` to prevent conflicts with Prettier. |

### JavaScript Formatting

```json
{
  "javascript": {
    "formatter": {
      "enabled": true,
      "trailingCommas": "all",
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

**Settings Explained:**

| Setting          | Value      | Why                                                |
| ---------------- | ---------- | -------------------------------------------------- |
| `trailingCommas` | `"all"`    | Adds commas after last item → cleaner git diffs    |
| `quoteStyle`     | `"single"` | Use single quotes for strings → better readability |
| `semicolons`     | `"always"` | Always use semicolons → prevents ASI bugs          |

**Trailing Commas Rationale:**

```javascript
// ✅ Good - trailing comma
const obj = {
  name: 'John',
  age: 30, // <- trailing comma here
};

// Benefits:
// 1. Cleaner git diffs (only changed line shows)
// 2. Easy to add/remove/reorder properties
// 3. Prevents forgotten commas
```

**Single Quotes Rationale:**

- Slightly more readable than double quotes
- Less visual noise in code
- JSON uses double quotes, so distinction is clear
- Consistent with many JavaScript style guides

**Semicolons Rationale:**

- Prevents ASI (Automatic Semicolon Insertion) bugs
- Explicit is better than implicit
- Makes code intent clear

### CSS Formatting

```json
{
  "css": {
    "parser": {
      "cssModules": true,
      "tailwindDirectives": true
    },
    "formatter": {
      "enabled": true,
      "quoteStyle": "single"
    },
    "linter": {
      "enabled": true
    }
  }
}
```

**Settings Explained:**

| Setting              | Value      | Why?                                                        |
| -------------------- | ---------- | ----------------------------------------------------------- |
| `cssModules`         | `true`     | Support CSS Modules syntax (`:global`, `:local`, etc.)      |
| `tailwindDirectives` | `true`     | Parse Tailwind v4 directives (`@theme`, `@apply`, `@layer`) |
| `quoteStyle`         | `"single"` | Consistent with JavaScript                                  |

### JSON Formatting

```json
{
  "json": {
    "parser": {
      "allowComments": true,
      "allowTrailingCommas": true
    },
    "formatter": {
      "enabled": true,
      "trailingCommas": "none"
    },
    "linter": {
      "enabled": true
    }
  }
}
```

**Settings Explained:**

| Setting                      | Value    | Why?                                      |
| ---------------------------- | -------- | ----------------------------------------- |
| `allowComments`              | `true`   | Support JSONC (JSON with Comments)        |
| `allowTrailingCommas`        | `true`   | Parse JSON with trailing commas           |
| `trailingCommas` (formatter) | `"none"` | Don't add trailing commas when formatting |

**Why the difference?**

- **Parser**: Lenient - accepts comments and trailing commas for developer
  convenience
- **Formatter**: Strict - removes trailing commas for valid JSON output

This allows developers to use comments in config files (like `tsconfig.json`)
while producing valid JSON when needed.

---

## Linter Configuration

### General Linter Settings

```json
{
  "linter": {
    "enabled": true,
    "includes": ["**", "!**/*.astro"],
    "rules": {
      "recommended": true
      // ... specific rules
    }
  }
}
```

**Key points:**

- `recommended: true` enables Biome's curated set of best practices
- `includes` with `!**/*.astro` excludes Astro files from linting (see
  [Astro File Handling](#astro-file-handling))

### Accessibility Rules

```json
{
  "a11y": {
    "noSvgWithoutTitle": "off"
  }
}
```

**Why disabled?**

- Decorative SVGs don't need titles
- Icons with adjacent text don't need redundant titles
- We handle accessibility contextually, not automatically

**Best practice**: Add `aria-label` or `title` when SVG conveys meaning, skip
for decorative elements.

### Style Rules

```json
{
  "style": {
    "noParameterAssign": "error",
    "useAsConstAssertion": "error",
    "useDefaultParameterLast": "error",
    "useEnumInitializers": "error",
    "useSelfClosingElements": "error",
    "useSingleVarDeclarator": "error",
    "noUnusedTemplateLiteral": "error",
    "useNumberNamespace": "error",
    "noInferrableTypes": "error",
    "noUselessElse": "error",
    "noDefaultExport": "error",
    "useArrayLiterals": "error",
    "useConsistentArrayType": "error",
    "useDefaultSwitchClause": "error"
  }
}
```

**Rules Explained:**

| Rule                      | What it prevents                          | Example                                      | Source       |
| ------------------------- | ----------------------------------------- | -------------------------------------------- | ------------ |
| `noParameterAssign`       | Reassigning function parameters           | `function fn(x) { x = 1; }` ❌               |              |
| `useAsConstAssertion`     | Missing `as const` in constant assertions | `const arr = [1, 2]` → `as const` ✅         |              |
| `useDefaultParameterLast` | Default params before required params     | `fn(x = 1, y)` ❌                            |              |
| `useEnumInitializers`     | Enums without explicit values             | `enum X { A, B }` ❌                         |              |
| `useSelfClosingElements`  | Non-self-closing empty elements           | `<div></div>` → `<div />` ✅                 |              |
| `useSingleVarDeclarator`  | Multiple variables per declaration        | `const a = 1, b = 2` ❌                      |              |
| `noUnusedTemplateLiteral` | Template literals with no interpolation   | `` `hello` `` → `'hello'` ✅                 |              |
| `useNumberNamespace`      | Global number methods                     | `parseInt()` → `Number.parseInt()` ✅        |              |
| `noInferrableTypes`       | Redundant type annotations                | `const x: number = 1` ❌                     |              |
| `noUselessElse`           | Unnecessary else after return             | See below                                    |              |
| `noDefaultExport`         | Default exports                           | `export default class Foo` ❌                | Google TS §3 |
| `useArrayLiterals`        | `new Array()` constructor                 | `new Array(2)` → `[undefined, undefined]` ❌ | Google TS §5 |
| `useConsistentArrayType`  | Inconsistent array type syntax            | `Array<string>` → `string[]` ✅              | Google TS §7 |
| `useDefaultSwitchClause`  | Switch statements without default         | `switch(x) { case 1: break; }` ❌            | Google TS §5 |

**`noUselessElse` Example:**

```javascript
// ❌ Bad - useless else
function fn(x) {
  if (x > 0) {
    return 'positive';
  } else {
    return 'negative';
  }
}

// ✅ Good - no else needed
function fn(x) {
  if (x > 0) {
    return 'positive';
  }
  return 'negative';
}
```

### Suspicious Code Rules

```json
{
  "suspicious": {
    "noUnknownAtRules": "off",
    "noConstEnum": "error",
    "useGuardForIn": "error"
  }
}
```

| Rule               | Purpose                                                         | Source       |
| ------------------ | --------------------------------------------------------------- | ------------ |
| `noUnknownAtRules` | **Disabled** — Tailwind v4 directives trigger false positives   |              |
| `noConstEnum`      | Prevents `const enum` declarations                              | Google TS §6 |
| `useGuardForIn`    | Requires `hasOwnProperty` check or `Object.keys()` in `for..in` | Google TS §5 |

**Why `noUnknownAtRules` is disabled:** Tailwind v4 introduces directives like
`@theme`, `@utility`, and `@variant` that Biome's linter doesn't yet fully
recognize, even with `tailwindDirectives: true` enabled in the parser. This is a
[known limitation](https://github.com/biomejs/biome/issues/7899) in Biome 2.3.x.

**Note**: The VS Code CSS Language Service also warns about unknown at-rules.
This is handled separately in the
[VS Code Configuration](#vs-code-configuration) section.

### Overrides (per-file rule exceptions)

```json
{
  "overrides": [
    {
      "includes": ["*.config.mjs", "*.config.ts", ".prettierrc.mjs"],
      "linter": {
        "rules": {
          "style": {
            "noDefaultExport": "off"
          }
        }
      }
    }
  ]
}
```

**Why?** Config files for Astro, Vitest, Prettier, and Commitlint **require**
default exports — that's their documented API. The `noDefaultExport` rule
enforces Google's "no default exports" guideline everywhere else, but these
framework config files are exempt by necessity.

---

## Tailwind CSS Integration

Biome 2.3+ includes native support for Tailwind CSS syntax through the
`css.parser.tailwindDirectives` option.

### Parser Configuration

```json
{
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  }
}
```

This enables parsing of Tailwind v4 directives:

| Directive   | Purpose                          |
| ----------- | -------------------------------- |
| `@theme`    | Define design tokens             |
| `@utility`  | Create custom utilities          |
| `@variant`  | Define custom variants           |
| `@apply`    | Apply utility classes inline     |
| `@layer`    | Organize styles into layers      |
| `@tailwind` | Import Tailwind's base styles    |
| `@config`   | Reference Tailwind configuration |

### Known Limitations (Biome 2.3.x)

While the parser recognizes Tailwind syntax, the linter's `noUnknownAtRules`
rule may still flag some directives. This is why we disable the rule:

```json
{
  "linter": {
    "rules": {
      "suspicious": {
        "noUnknownAtRules": "off"
      }
    }
  }
}
```

### Future: Tailwind Class Sorting

Biome includes an experimental `useSortedClasses` rule for automatic Tailwind
class sorting (similar to `prettier-plugin-tailwindcss`). Once stable, it can be
enabled:

```json
{
  "linter": {
    "rules": {
      "nursery": {
        "useSortedClasses": {
          "level": "warn",
          "options": {
            "attributes": ["class", "className", "class:list"],
            "functions": ["clsx", "cn", "cva"]
          }
        }
      }
    }
  }
}
```

**Note**: This rule is currently in the `nursery` group (experimental) and not
enabled by default.

---

## VS Code Configuration

To ensure Biome and Tailwind work correctly in VS Code, add these settings to
`.vscode/settings.json`:

### Essential Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "biome.enabled": true
}
```

### Disable VS Code CSS Validation for Tailwind

VS Code's built-in CSS Language Service doesn't recognize Tailwind directives
and will show warnings like "Unknown at rule @theme". Disable this:

```json
{
  "css.lint.unknownAtRules": "ignore"
}
```

### Formatter Overrides (Hybrid Strategy)

```json
{
  // Prettier for content/templating files
  "[astro]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[markdown]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[mdx]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[yaml]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },

  // Biome for scripting/logic files
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
  "[css]": { "editor.defaultFormatter": "biomejs.biome" }
}
```

### Tailwind IntelliSense

```json
{
  "tailwindCSS.includeLanguages": {
    "astro": "html",
    "markdown": "html",
    "mdx": "html"
  },
  "tailwindCSS.files.exclude": [
    "**/.git/**",
    "**/node_modules/**",
    "**/.hg/**",
    "**/.svn/**"
  ]
}
```

---

## Why These Settings?

### Performance

Biome is **10-100x faster** than ESLint + Prettier:

- Written in Rust (native performance)
- Parallel processing
- Optimized for monorepos

### Consistency

All rules enforce **consistent code style** across:

- Different developers
- Different time periods
- Different machines

### Safety

Style rules catch **common bugs**:

- Parameter reassignment bugs
- Missing const assertions (type narrowing)
- Implicit type coercion

### Maintainability

- **Self-closing elements**: Easier to refactor JSX/TSX
- **Single declarators**: Clearer git diffs
- **Number namespace**: Future-proof (no global pollution)

---

## Suppressing Rules

Sometimes a rule must be violated for a valid reason (e.g., legacy code,
specific library requirements). You can suppress rules using comments.

**Syntax:** `// biome-ignore <category>/<group>/<rule>: <explanation>`

**✅ Good Example:** Always provide a specific rule and an explanation.

```javascript
// biome-ignore lint/style/noParameterAssign: Library X requires mutation here
function registerPlugin(plugin) {
  plugin.active = true;
}
```

**❌ Bad Example:** Avoid suppressing everything without context.

```javascript
// biome-ignore lint: fixing later
const x = 1;
```

> **Tip:** In VS Code, you can hover over a Biome error and choose "Quick Fix" >
> "Suppress rule" to generate the comment automatically.

---

## Auto-Formatting with Assist

```json
{
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

**Purpose**: Enables "code actions" in editors.

**Effect**: In VS Code, you can:

- Right-click → "Organize Imports" (or use `pnpm organize-imports`)
- Auto-sort imports alphabetically
- Remove unused imports

**Scope**: Covers **all file types including `.astro`** — Biome parses the
frontmatter for import sorting even though Prettier is the `.astro` formatter.
The `assist` section intentionally does not exclude `.astro` files (unlike
`formatter` and `linter`).

**Pipeline integration**: `pnpm format` runs `organize-imports` as its first
step, followed by Biome formatting and Prettier formatting. VS Code achieves the
same via `codeActionsOnSave` (configured per language in
`.vscode/settings.json`).

---

## Related Documentation

- [ADR 0004: Hybrid Formatting (Biome + Prettier)](../adr/0004-use-hybrid-formatting-biome-and-prettier.md)
- [Biome Official Docs](https://biomejs.dev)
- [Biome Tailwind Support (v2.3 Release Notes)](https://biomejs.dev/blog/biome-v2-3/)
