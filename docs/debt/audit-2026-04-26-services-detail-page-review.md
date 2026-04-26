# Audit — Services Detail Page Review (2026-04-26)

Source for the initial debt-register entries. Captures the deferred findings
from the review of the `/services/[slug]` route landing on
`feat/services-detail-page` so the per-entry detail survives after the
worktree-local review reports are removed.

Five entries: three were explicitly deferred by the project owner during the
review rounds, one is a pre-approved follow-up surfaced when ADR-0038's
`check:conventions` coverage was discussed, and one is an implementer discovery
during the `categoriesById` direct-lookup fix that the reviewer verified and
recommended adding.

All entries are minor severity. None block CMS handover. Two block long-term
maintenance (DEBT-260426-01, DEBT-260426-02) because they harden conventions
that are currently enforced only by location or by example.

---

## DEBT-260426-01 — `check:conventions` rule: no `.ts` files in `src/pages/`

**Severity:** minor **Effort:** XS **Blast radius:** Convention tooling.

### Problem

Astro 6 routes any `.ts` file inside `src/pages/` as an endpoint. The current
project convention (helper modules live under `~/utils/`, page modules in
`src/pages/` are `.astro`-only) is enforced by location convention, not by
tooling. A future contributor parking a `.ts` file in `src/pages/` — a data
loader, a prerender hook, a co-located test — reproduces the build crash that
originally drove the helper-and-re-export pattern documented in ADR-0038 §1. The
crash is loud, but it surfaces only at `pnpm build` time, not at
convention-check time, and the diagnosis trail back to ADR-0038 is not obvious
from the error message.

### Recommended fix shape

Add an assertion to `scripts/conventions/checks.mjs` that fails when any `.ts`
(or `.tsx`) file appears inside `src/pages/`. Three lines of glob plus one
assertion. Cover it with a positive and negative case in
`scripts/conventions/checks.test.mjs`. The check converts a
convention-by-construction into a convention-enforced-by-CI, with the diagnosis
shipped in the failure message ("page modules must be `.astro`; helpers belong
under `src/utils/` — see ADR-0038 §1").

Pattern reference: ADR-0038 §1.

### Why deferred

Out of scope for the services-detail-page branch — the branch establishes the
pattern, hardening the tooling around it is a separate concern with its own
concept doc. Cheap follow-up; touch one script file and one test file.

---

## DEBT-260426-02 — ADR-0038 §1: document local `Props` declaration under helper-and-re-export shape

**Severity:** minor **Effort:** S **Blast radius:** ADR text + future
detail-route authors.

### Problem

The helper-and-re-export shape documented in ADR-0038 §1
(`export { getServiceSlugPaths as getStaticPaths } from '~/utils/serviceSlugPaths'`)
defeats Astro's automatic `Astro.props` inference. Without an explicit
`type Props` declaration on the consuming page, `Astro.props.service` arrives as
`any`, which silently destroys the type narrowing the helper's predicate already
performs. The bug is invisible at the import site — consumer code compiles
cleanly because `any` infects every property access — and only surfaces when a
downstream consumer that needs the narrowed type (a `Record` lookup keyed by a
literal-union, for instance) is added.

The current `src/pages/services/[slug].astro` carries the workaround at lines
65-70: a five-line comment naming cause, mechanism, and consequence, plus
`type Props = { service: ServiceWithCompleteDetailContent };`. ADR-0038 §1
currently does not mention the requirement. Future detail-route authors
(`/coaches/[slug]`, `/programs/[slug]`, etc.) will rediscover this the hard way.

### Recommended fix shape

Add one paragraph to ADR-0038 §1 documenting the requirement, with the canonical
example pinned to the `Props` block at the top of
`src/pages/services/[slug].astro`. Wording sketch: "Re-exporting
`getStaticPaths` from a helper module defeats Astro's automatic prop inference.
The consuming page must declare its own `type Props = { ... }` matching the
helper's `props` field, otherwise the narrowing the predicate performs is lost
on the page side."

### Why deferred

Branch-local: ADR amendment is its own concept-doc-and-review cycle. The
existing comment block in `[slug].astro` is honest and self-contained, so the
next detail-route author has a working example even before the ADR amendment
lands.

---

## DEBT-260426-03 — Decouple `ServiceDetailHero` chip-count test from Tailwind class

**Severity:** minor **Effort:** S **Blast radius:** One production component +
one test file.

### Problem

`src/components/sections/services/serviceDetailHero.test.ts` asserts the hero
chip count via `doc.querySelectorAll('span.bg-teal-100')` (lines 89 and 100).
The selector couples the test to a Tailwind utility class. If the design ever
swaps the chip color (dark-mode rework, design-token migration, extraction into
a shared `Chip` component with a different class), the test fails for the wrong
reason — a class rename, not a structural regression.

The contract the test is meant to defend is the chip _count_, not the chip
_color_.

### Recommended fix shape

Add `data-role="hero-chip"` (or similar) to the chip `<span>` in
`ServiceDetailHero.astro`. Rewrite the test selectors as
`[data-role="hero-chip"]`. Decouples the test from utility-class churn while
preserving the count contract.

### Why deferred

The test catches the regression it was designed for; a class-rename
break-on-irrelevant-change is a future-cost, not a present one. The fix touches
a production component for purely test-stability reasons, which the project
owner preferred to defer rather than land in the branch that introduced the
test.

---

## DEBT-260426-04 — Replace "PR-body deviation note" session-jargon in component-test prefaces

**Severity:** minor **Effort:** M **Blast radius:** Six test files across two
component groups.

### Problem

Six section-component test files carry the same six-line preface explaining why
they import `jsdom` as a library rather than switching the test environment via
the Vitest `@vitest-environment jsdom` pragma:

- `src/components/sections/services/serviceDetailHero.test.ts`
- `src/components/sections/services/servicePricingBlock.test.ts`
- `src/components/sections/services/serviceSocialProof.test.ts`
- `src/components/sections/services/serviceWhatsIncluded.test.ts`
- `src/components/sections/services/serviceWhoIsFor.test.ts`
- `src/components/sections/howItWorks/processSteps.test.ts`

The preface ends with:
`See ADR-0037 §Conventions and the PR-body deviation note for the full chain.`
The "PR-body deviation note" half is session-jargon — it points at a
pull-request description that becomes unfindable from the repo six months later.
The right pointer is ADR-0037 itself, which is permanent. The "PR-body" half
adds nothing once the ADR exists.

The five services tests reproduce the wording from `processSteps.test.ts`, which
landed on a previous branch — so the source of the issue is precedent, not
regression.

### Recommended fix shape

One sweep across all six files: drop the "and the PR-body deviation note" half
and end the preface at `See ADR-0037 §Conventions for the full chain.` Per-file
edit is trivial; the value of bundling is one PR rather than six.

### Why deferred

Repo-wide, not branch-introduced — the cleanup spans a pre-existing test file
outside this branch's scope. Bundling is cheaper than fixing in isolation, but
bundling means a separate task.

---

## DEBT-260426-05 — Extract `TextButton` primitive once 3+ consumers exist

**Severity:** minor **Effort:** M **Blast radius:** New primitive component +
two existing call sites.

### Problem

`src/components/sections/services/ServicePricingBlock.astro` (lines 142-150)
renders a raw `<button>` styled to mirror the visual shape of the existing
`TextLink` primitive (`animated-underline` utility plus trailing arrow). The
reason the markup is reproduced rather than reusing `TextLink` is that
`TextLink` renders an `<a href>` and cannot carry the Invokers API attributes
(`command`/`commandfor`, ADR-0027) needed to trigger a modal. The same shape
exists in `ServicesCatalog.astro` for the mid-page quiz CTA.

Two consumers of "TextLink-shape but with Invokers attributes" is on the
threshold for extraction per ADR-0034 (extract-first for identifiable UI
sections), but small repeated UI is judgement-based. The JSDoc above the
ServicePricingBlock call site (lines 129-136) documents the choice honestly and
points at the ServicesCatalog precedent.

### Recommended fix shape

When a third consumer needs the same shape, extract a `TextButton` primitive:
same visual contract as `TextLink` (utility classes, trailing arrow), `<button>`
element, optional pass-through for the Invokers attributes (`command`,
`commandfor`). Migrate the two existing call sites in the same change.

### Why deferred

Premature extraction at two consumers — flag now, extract on the third
appearance. The current shape is documented and the precedent is named.

---

## Summary

Two entries (01, 02) harden conventions for future detail-route work and should
land before the next dynamic detail route (`/coaches/[slug]`,
`/programs/[slug]`). The remaining three (03, 04, 05) are pure maintenance —
none block any current or pending feature.
