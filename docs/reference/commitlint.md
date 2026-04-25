# commitlint Reference

Commit message validation for the Team 4 Pro Coaching website. Enforces
[Conventional Commits](https://www.conventionalcommits.org/) via a Git hook.

For the user-facing commit convention (types, scopes, examples), see
[CONTRIBUTING.md](../../CONTRIBUTING.md). This document covers the technical
configuration.

---

## Configuration

**File**: `commitlint.config.mjs` (project root)

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
  },
};
```

Extends the standard Conventional Commits ruleset from
`@commitlint/config-conventional`. One custom rule override: scopes are
mandatory.

**Packages**: `@commitlint/cli` and `@commitlint/config-conventional`
(devDependencies in `package.json`).

---

## Enforcement

commitlint runs as a Git hook via Husky.

**Hook**: `.husky/commit-msg`

```bash
pnpm dlx commitlint --edit "$1"
```

This validates every commit message before it is accepted. Invalid messages
reject the commit.

**Pre-commit hook** (`.husky/pre-commit`) runs separately and handles secret
scanning (Gitleaks) and formatting (lint-staged) — not commit message
validation.

---

## Rules

The `@commitlint/config-conventional` ruleset enforces:

| Rule                | Setting | Effect                                    |
| :------------------ | :------ | :---------------------------------------- |
| `type-enum`         | Error   | Type must be from the conventional list   |
| `type-empty`        | Error   | Type is required                          |
| `type-case`         | Error   | Type must be lowercase                    |
| `subject-empty`     | Error   | Description is required                   |
| `subject-case`      | Error   | Description must not start with uppercase |
| `header-max-length` | Error   | Header must be 100 characters or fewer    |
| `scope-empty`       | Error   | Scope is required (custom override)       |

`type-enum` is extended locally to include `copy` on top of the conventional
baseline — see [CONTRIBUTING.md](../../CONTRIBUTING.md) for the definition.

---

## Scope Reference

Scope examples (`component`, `data`, `system`, plus domain names like `coaches`,
`cta`) live in [CONTRIBUTING.md](../../CONTRIBUTING.md). The list is not
enforced by commitlint (no `scope-enum` rule). New scopes can be introduced
without config changes. If the list grows unwieldy, a `scope-enum` rule can be
added to restrict allowed values.

---

## Related Documentation

| Document                                 | Purpose                             |
| :--------------------------------------- | :---------------------------------- |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Commit convention for contributors  |
| [DEVELOPMENT.md](../DEVELOPMENT.md)      | Git hooks setup and troubleshooting |
