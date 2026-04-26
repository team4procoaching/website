# Audit — Services Detail Page Review (2026-04-26)

Source for the initial debt-register entries. Captures the deferred findings
from the review of the `/services/[slug]` route landing on
`feat/services-detail-page` so the per-entry detail survives after the
worktree-local review reports are removed.

Seven entries: three were explicitly deferred by the project owner during the
review rounds, one is a pre-approved follow-up surfaced when ADR-0038's
`check:conventions` coverage was discussed, one is an implementer discovery
during the `categoriesById` direct-lookup fix that the reviewer verified and
recommended adding, and two follow from live inspection of the rendered detail
page after the register itself had landed (a paired page-level workaround and
its eventual structural replacement on `Accordion`).

All entries are minor severity. None block CMS handover. Three block long-term
maintenance (DEBT-260426-01, DEBT-260426-02, DEBT-260426-07) because they harden
conventions or component APIs that are currently enforced only by location, by
example, or by hand on the consumer side.

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

## DEBT-260426-06 — Differentiate `ProcessSteps` and `Accordion` backgrounds on detail page

**Severity:** minor **Effort:** XS **Blast radius:** One line in
`src/pages/services/[slug].astro`.

### Problem

`src/pages/services/[slug].astro` passes `background="muted"` to `ProcessSteps`,
which emits `bg-background-muted dark:bg-background-dark-muted`. `Accordion`
hardcodes the same Tailwind tokens at `src/components/ui/Accordion.astro:65`.
When `ServiceSocialProof` (step 6 in the IA composition) renders nothing —
because the service has no resolvable `testimonialIds`, as is the case for
`competition-prep` at launch — `ProcessSteps` (step 5) and `Accordion` (step 7)
become directly adjacent in the DOM, and the matching backgrounds merge them
into one large muted block visually. Verified by live inspection of the rendered
detail page against `pnpm dev`.

### Recommended fix shape

Drop the `background="muted"` prop on `ProcessSteps` in `[slug].astro` (it falls
back to `default` → `bg-background`), letting `Accordion`'s hardcoded muted
tokens contrast against it. One-line page change. The concept doc's Decision 6
§5 specified `background="muted"` for `ProcessSteps` from a pre-visual
perspective; live inspection of the rendered page is the moment to adjust visual
rhythm.

### Why deferred

Coaches reviewing the rendered IA before replacing placeholder copy do not need
this fix — the IA itself is legible without it. Eventually superseded by
DEBT-260426-07, which makes both sections' backgrounds explicitly composable
from the page.

---

## DEBT-260426-07 — `Accordion`: add typed `background?: 'default' | 'muted'` prop (mirrors `ProcessSteps` API)

**Severity:** minor **Effort:** S **Blast radius:** One UI primitive + tests +
one page consumer.

### Problem

`src/components/ui/Accordion.astro:65` hardcodes
`bg-background-muted dark:bg-background-dark-muted`.
`src/components/sections/howItWorks/ProcessSteps.astro` (Props block lines
51-56, record-of-classes lines 87-90) exposes the same surface as a typed
`background?: 'default' | 'muted'` prop. The asymmetry leaves the page
composition (`[slug].astro`) unable to control `Accordion`'s background
explicitly — only `ProcessSteps`'s. As more dynamic detail routes land
(`/coaches/[slug]` is anticipated by ADR-0038), the inability to alternate
backgrounds across the full eight-section composition becomes a real maintenance
lever, not just a one-route concern.

### Recommended fix shape

Add `background?: 'default' | 'muted'` to `Accordion`'s `Props`, default
`'default'`. Branch the section-element class string on the prop, mirroring
`ProcessSteps`'s pattern (record-of-classes with
`satisfies Record<NonNullable<Props['background']>, string>`, not inline
ternaries). Add test coverage for both prop values; `Accordion` currently has no
`background` test. Update `[slug].astro` to pass explicit `background` values so
the page owns the alternation. Mirrors ADR-0034 (extract-first; consistent typed
boundaries across section components) and the recorded preference for typed
boundaries over discipline.

### Why deferred

Production-code change to a primitive plus tests plus a page edit. Bigger blast
radius than the page-level workaround in DEBT-260426-06; deferred until either
(a) DEBT-260426-06 is no longer sufficient (e.g. a third detail-route needs a
different alternation shape), or (b) a debt-cleanup pass picks the structural
target as the architectural target. Supersedes DEBT-260426-06 on land — once
`Accordion` has the prop, the page passes both sections' backgrounds explicitly
and the workaround dissolves.

---

## Summary

Two entries (01, 02) harden conventions for future detail-route work and should
land before the next dynamic detail route (`/coaches/[slug]`,
`/programs/[slug]`). Three entries (03, 04, 05) are pure maintenance — none
block any current or pending feature. Two entries (06, 07) capture a visual
finding from live inspection of the rendered detail page: 06 is a one-line
page-level workaround, 07 is the structural fix (typed `background` prop on
`Accordion`) that supersedes 06 on land.
