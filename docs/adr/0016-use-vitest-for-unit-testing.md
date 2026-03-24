# Use Vitest for Unit Testing

Date: 2026-03-24

## Status

Accepted

## Context

The project had no test infrastructure. Utility functions (`slugify`,
`isExternal`, `parseCounterValue`) contain non-trivial logic — Unicode
transliteration, URL classification, numeric parsing — that is easy to break
with small changes and hard to verify manually.

A test runner was needed that integrates well with the existing toolchain:

- **Astro** uses Vite as its build tool
- **TypeScript** is used throughout (strict mode)
- **Path aliases** (`~/utils/...`) are configured in `tsconfig.json`
- **pnpm** is the package manager (ADR-0002)

Evaluated test runners:

1. **Vitest** — native Vite integration, runs TypeScript without transpile
   setup, understands Vite path aliases out of the box, fast watch mode,
   Jest-compatible API. **Chosen.**
2. **Jest** — largest ecosystem, but ESM support is fragile, requires `ts-jest`
   or `@swc/jest` for TypeScript, needs separate config for path aliases.
   Rejected (too much configuration overhead for the benefit).
3. **Node.js test runner** (`node:test`) — zero dependencies, built into Node
   18+, but no native TypeScript support, no path alias resolving, no watch
   mode. Rejected (developer experience too limited).
4. **Bun test** — extremely fast, but requires Bun as runtime. Rejected
   (conflicts with ADR-0006's Node.js/pnpm stack).

## Decision

Use **Vitest** as the unit test runner for all `src/utils/*.ts` functions.

### Configuration

Minimal `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '~': resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

### Conventions

- Test files are **co-located** with their source: `slugify.ts` →
  `slugify.test.ts` (same directory)
- Scripts: `pnpm test` (watch mode for development), `pnpm test:run` (single run
  for CI)
- Tests cover: documented JSDoc examples, edge cases, error cases, and
  real-world values from the project's data modules

### Scope and Non-Goals

**In Scope:**

- Unit tests for pure utility functions (`src/utils/`)
- CI integration via `pnpm test:run`

**Out of Scope:**

- Component tests (Astro components require a rendering context)
- Integration / E2E tests (Playwright — separate future decision)
- Snapshot testing (no use case for utility functions)
- Test coverage thresholds (premature for the current scope)

## Consequences

### Positive

- **Vite alignment**: Shares the same transform pipeline as Astro — no duplicate
  config for TypeScript, path aliases, or ESM
- **Zero-config TypeScript**: Runs `.ts` files directly without `ts-jest` or
  build step
- **Fast feedback**: Watch mode re-runs affected tests on save (~20ms for the
  current suite)
- **Jest-compatible API**: `describe`, `it`, `expect` — familiar to most
  developers
- **Co-location**: Test files next to source makes them discoverable and
  encourages keeping tests up to date

### Negative

- **New devDependency**: Adds `vitest` to `devDependencies` (but no runtime
  impact — dev-only)
- **Parallel config file**: `vitest.config.ts` alongside `astro.config.mjs`.
  Vitest can theoretically read from `astro.config.mjs` via `getViteConfig()`,
  but keeping them separate avoids coupling test config to framework config.

### Risk Mitigation

- **Dependency scope**: Vitest is dev-only, pinned via Renovate (ADR-0005), and
  does not affect the production bundle
- **Config drift**: The `~` alias is defined in both `tsconfig.json` and
  `vitest.config.ts`. If the alias changes, both files must be updated. This is
  acceptable given the low change frequency.

## Success Criteria

- All utility functions have unit tests covering JSDoc examples and edge cases
- `pnpm test:run` completes in under 5 seconds
- Tests run in CI as part of the quality gate (alongside typecheck and lint)
- New utility functions are expected to include tests (enforced by code review,
  not automation)

## References

- [Vitest Documentation](https://vitest.dev/)
- [Vitest + Astro Guide](https://docs.astro.build/en/guides/testing/#vitest)
- [ADR-0001: Use Astro.js](0001-use-astro-js.md) — Vite-based build tool
- [ADR-0002: Use pnpm](0002-use-pnpm-package-manager.md) — package manager
- [ADR-0006: Strict Pinning](0006-enforce-strict-environment-and-dependency-pinning.md)
  — dependency management strategy
