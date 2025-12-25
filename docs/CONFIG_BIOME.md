# Biome Configuration & Workflow

Detailed documentation for the Biome formatter and linter configuration
[`biome.json`](../biome.json) and our hybrid tooling strategy.

## 📋 Table of Contents

- [Overview](#-overview)
- [Hybrid Strategy (Biome + Prettier)](#-hybrid-strategy-biome--prettier)
- [Version Control Integration](#-version-control-integration)
- [Formatter Configuration](#-formatter-configuration)
- [Linter Configuration](#-linter-configuration)
- [Suppressing Rules](#-suppressing-rules)
- [Auto-Formatting with Assist](#-auto-formatting-with-assist)
- [Related Documentation](#-related-documentation)

---

## 🎯 Overview

[Biome](https://biomejs.dev) is a fast, modern toolchain for web development,
written in Rust. It replaces ESLint and Prettier for JavaScript, TypeScript,
JSON, and CSS files to maximize performance and consistency.

## 🤝 Hybrid Strategy (Biome + Prettier)

We follow a **Domain-Split Hybrid Strategy** as defined in
[ADR 0004](../doc/adr/0004-use-hybrid-formatting-biome-and-prettier.md).

| Domain                   | File Types                            | Tool         | Reason                                                                |
| :----------------------- | :------------------------------------ | :----------- | :-------------------------------------------------------------------- |
| **Scripting & Logic**    | `.js`, `.ts`, `.tsx`, `.json`, `.css` | **Biome**    | Extremely fast, strict linting, robust formatting.                    |
| **Content & Templating** | `.astro`, `.md`, `.mdx`, `.yaml`      | **Prettier** | Mature ecosystem, better support for mixed-content files (Astro/MDX). |

**Note:** Ensure your editor (VS Code) is configured to use the correct default
formatter for each file language.

---

## 🔗 Version Control Integration

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

## 🎨 Formatter Configuration

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
      "allowWrongLineComments": true
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

| Setting                  | Value      | Why?                                                 |
| ------------------------ | ---------- | ---------------------------------------------------- |
| `cssModules`             | `true`     | Support CSS Modules syntax                           |
| `allowWrongLineComments` | `true`     | Allow `//` comments in CSS (non-standard but useful) |
| `quoteStyle`             | `"single"` | Consistent with JavaScript                           |

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

## 🔍 Linter Configuration

### General Linter Settings

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
      // ... specific rules
    }
  }
}
```

**`recommended: true`** enables Biome's curated set of best practices.

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
    "noUselessElse": "error"
  }
}
```

**Rules Explained:**

| Rule                      | What it prevents                          | Example                               |
| ------------------------- | ----------------------------------------- | ------------------------------------- |
| `noParameterAssign`       | Reassigning function parameters           | `function fn(x) { x = 1; }` ❌        |
| `useAsConstAssertion`     | Missing `as const` in constant assertions | `const arr = [1, 2]` → `as const` ✅  |
| `useDefaultParameterLast` | Default params before required params     | `fn(x = 1, y)` ❌                     |
| `useEnumInitializers`     | Enums without explicit values             | `enum X { A, B }` ❌                  |
| `useSelfClosingElements`  | Non-self-closing empty elements           | `<div></div>` → `<div />` ✅          |
| `useSingleVarDeclarator`  | Multiple variables per declaration        | `const a = 1, b = 2` ❌               |
| `noUnusedTemplateLiteral` | Template literals with no interpolation   | `` `hello` `` → `'hello'` ✅          |
| `useNumberNamespace`      | Global number methods                     | `parseInt()` → `Number.parseInt()` ✅ |
| `noInferrableTypes`       | Redundant type annotations                | `const x: number = 1` ❌              |
| `noUselessElse`           | Unnecessary else after return             | See below                             |

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
    "noUnknownAtRules": "warn"
  }
}
```

**Purpose**: Warns about unknown CSS `@rules` (like `@apply` without Tailwind).

**Level**: `warn` (not `error`) because some at-rules are valid in specific
contexts.

## 🤔 Why These Settings?

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

## 🛡️ Suppressing Rules

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

## 🔄 Auto-Formatting with Assist

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

---

## 📚 Related Documentation

- [ADR 0003: Use Biome for Linting and Formatting](../doc/adr/0003-use-biome-for-linting-and-formatting.md)
- [ADR 0004: Hybrid Formatting (Biome + Prettier)](../doc/adr/0004-use-hybrid-formatting-biome-and-prettier.md)
- [Biome Official Docs](https://biomejs.dev)

---

**Next**: See [CONFIG_RENOVATE.md](CONFIG_RENOVATE.md) for dependency management
configuration.
