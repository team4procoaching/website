# Test-Fixture Follow-ups (2026-04-28)

Two minor follow-up items observed across the component-test work in PR #164
(introduced the `parse(html)` pattern in four UI-primitive tests), PR #166
(added five more occurrences in service-detail tests), and PR #167 (consolidated
fixture builders but did not address `parse(html)`).

This document is a findings record, not an audit report under the `audit-`
prefix convention — it captures context that did not exist as a tracked artifact
at the time the items were observed.

## DEBT-260428-01 — `parse(html)` helper duplication

Ten test files declare the same JSDom-instance-based parse helper:

```ts
function parse(html: string): Document {
  return new JSDOM(html).window.document;
}
```

Affected files:

- `src/components/sections/howItWorks/processSteps.test.ts`
- `src/components/sections/services/serviceDetailHero.test.ts`
- `src/components/sections/services/servicePricingBlock.test.ts`
- `src/components/sections/services/serviceSocialProof.test.ts`
- `src/components/sections/services/serviceWhatsIncluded.test.ts`
- `src/components/sections/services/serviceWhoIsFor.test.ts`
- `src/components/ui/accordion.test.ts`
- `src/components/ui/cta.test.ts`
- `src/components/ui/sectionHeader.test.ts`
- `src/components/ui/statsGrid.test.ts`

The JSDom-instance route is deliberate — it sidesteps an esbuild-init realm
clash with the Astro Container API on the current Vitest/Node/Astro/esbuild
combo, documented in ADR-0037 and in the prefaces of the affected files. The
duplication is the byte-identical helper itself, not the JSDom approach.

Suggested resolution: extract the helper to a typed `src/test-utils/` export
(either alongside `fixtures.ts` or as a sibling `parseDom.ts`). Each call site
replaces its local declaration with an import. Risk is low — the helper has no
callers outside test files.

## DEBT-260428-02 — `processSteps.test.ts` fixture-convention alignment

PR #167 introduced typed fixture builders in `src/test-utils/fixtures.ts`
(`buildCtaProps`, `buildSectionHeaderProps`, `buildFaqItems`, `buildStats`) and
migrated four UI-primitive tests to them. `processSteps.test.ts` was outside
that PR's scope and continues to use inline literals for `steps`.

A `buildProcessSteps` helper has only one consumer today. The codebase's
extraction threshold is two or more consumers, so this item is consciously
deferred — recorded under Deliberately Accepted in `REGISTER.md`. It reopens
automatically when a second `*.test.ts` file consumes `ProcessStep` as a
fixture.
