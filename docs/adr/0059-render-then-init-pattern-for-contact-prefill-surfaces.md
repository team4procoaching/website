# Hidden-by-Default Render-then-Init Pattern for Contact-Prefill Surfaces

Date: 2026-05-26

## ADR Warrant Check

- [x] **A — Contract**: Establishes the contract that every contact-prefill
      surface follows — declarative HTML ships with the `hidden` class, a typed
      client-side controller or reader populates `data-*` placeholders via
      `.textContent` / `.setAttribute`, and the `hidden` class is removed only
      on a successful parse. Four live surfaces share this contract today:
      `ConfiguratorContextBox` (PR #220 / #222), `ServiceLockedLine` (this
      stream), `ThanksSelectionSummary` (this stream), and the headline-variant
      `<span>` toggle pair in `Contact.astro` (this stream). Future
      contact-prefill surfaces follow the same contract. ADR-0051's prose
      mentions "ships with the `hidden` class" in passing but does not name a
      reusable pattern; with three-plus surfaces sharing the contract and no
      written home, this is the moment the warrant tips.
- [x] **B — Asymmetry**: No new asymmetry. The cross-class asymmetry between
      subscription and session services is documented in ADR-0051; the headline
      differentiation makes that asymmetry _legible_ on the contact page but
      does not introduce a new structural one.
- [x] **C — External revisit**: The Stripe-sunset trigger is already named in
      ADR-0043; when Stripe direct-checkout lands, the configurator-prefill
      surfaces redirect to checkout rather than the contact form, and the
      hidden-by-default contract carries forward to whichever surfaces remain
      contact-routed. No new external trigger surfaces.

## Status

Accepted

## Context

The Posing Configurator stream (PR #220 / #222) shipped
`ConfiguratorContextBox.astro` as the first contact-form surface that renders
declaratively with the `hidden` class and is revealed by a client-side
controller after a successful `parseConfiguratorParams` call. ADR-0051
documented the Configurator → Contact URL contract and mentioned the
`hidden`-class shipping in passing, but did not name the underlying pattern as
reusable.

This stream adds three sibling surfaces on the contact and thanks pages:

- `ServiceLockedLine` — a read-only display of the locked service on
  configurator landings, swapped in place of the editable `FormSelect` dropdown.
- `ThanksSelectionSummary` — the contact-page selection restated on
  `/contact/thanks` after submit, populated from a sessionStorage carry written
  at submit time.
- A headline-variant `<span>` pair inside the rendered heading of
  `Contact.astro` — one default-visible (the conversational headline), one
  default-hidden (the transactional headline used on configurator landings).

Three-plus surfaces sharing one contract, in a project that maintains an
AI-first workflow (see `user_ai_first_workflow` memory in `CLAUDE.md`), is the
warrant tipping point: an AI agent or future maintainer reading the codebase
needs a "context / decision / consequences" scaffolding to recognise the pattern
in 2027, not just a one-paragraph convention note. The alternative — landing the
pattern as a CONVENTIONS subsection alone — was considered and rejected for the
same reason. CONVENTIONS.md cross-references this ADR rather than carrying the
full decision.

## Decision

Name the pattern **hidden-by-default render-then-init**. The contract:

1. **Declarative HTML ships with the `hidden` class.** Visible-on-load markup is
   dominant-case only (the conversational headline, the editable service
   dropdown). Every variant surface (`ServiceLockedLine`,
   `ConfiguratorContextBox`, `ThanksSelectionSummary`, the transactional
   headline `<span>`) ships hidden. The page is FOUC-free under SSG with no
   JS-required render path for the dominant case.
2. **A typed client-side controller or reader populates `data-*` placeholders.**
   Writes use `.textContent` and `.setAttribute` only — never `innerHTML` for
   user-facing content (XSS-safe by construction, per CONVENTIONS.md §
   Client-Side Scripts Rules).
3. **The controller removes `hidden` on a successful parse; leaves it on absent
   or malformed input.** A visitor arriving without a valid Configurator
   deep-link, or without a sessionStorage carry on the thanks page, never sees a
   hidden surface flash.
4. **Init is wired via `bootstrapOnLoad`** (ADR-0026) so cold-load and View
   Transitions navigation paths both fire idempotently.
5. **The headline-variant pair is the same pattern at element granularity.** Two
   `<span>` siblings inside the heading element — one default-visible, one
   default-hidden — with the controller flipping `hidden` based on
   `parseConfiguratorParams` returning non-null on a configurator landing.

The three live contact-side surfaces are `ConfiguratorContextBox`,
`ServiceLockedLine`, and `ThanksSelectionSummary`. The two contact-side clients
are `src/scripts/contactFormController.ts` (which owns the contact page's
controller logic and the headline toggle) and
`src/scripts/thanksSelectionReader.ts` (which owns the thanks page's reader
logic).

## Consequences

### Positive

- **FOUC-free SSG.** Every dominant-case surface is visible on load with no JS
  dependency; only the variant surfaces wait for the controller. The
  Configurator landing — which is the conversion-relevant case — sees no flicker
  because `parseConfiguratorParams` runs synchronously in `bootstrapOnLoad`.
- **XSS-safe writes by construction.** The contract excludes `innerHTML`. A
  controller that needs to render user-influenced data has only `.textContent`
  and `.setAttribute` available, both of which are safe against script
  injection.
- **Testability in isolation.** Each controller / reader is unit-testable with
  jsdom; per-component Container API tests cover the hidden-by-default invariant
  for each surface (each component's `*.test.ts` asserts the rendered HTML
  carries `class="hidden"`).
- **Recognisability under the AI-first workflow.** A future contributor or AI
  agent encountering a fifth contact-prefill surface in 2027 finds this ADR via
  the JSDoc cross-reference on the component (per ADR-0054) and reproduces the
  contract instead of reinventing it.

### Negative

- **Discoverability cost on every new prefill surface.** Each new variant
  surface must follow the contract — ship hidden, write via `textContent` /
  `setAttribute`, remove `hidden` only on successful parse. The cost is small
  per-surface but real; the inverse cost (a future contributor reinventing the
  visibility pattern from scratch) is what this ADR exists to prevent.
- **`bootstrapOnLoad` coupling.** Every controller / reader depends on
  ADR-0026's dual-dispatch helper. If ADR-0031 (native View Transitions) ever
  accepts and supersedes ADR-0026, the controllers migrate alongside. The
  migration surface is bounded — two files (`contactFormController.ts`,
  `thanksSelectionReader.ts`) plus the existing `ConfiguratorContextBox` init.

## References

- [ADR-0020](0020-client-side-script-strategy-revised.md) — Module `<script>`
  default and the "complex scripts → extract to `src/scripts/`" guidance the two
  contact-side clients follow.
- [ADR-0026](0026-dual-dispatch-controller-init.md) — `bootstrapOnLoad`
  dispatches on both `DOMContentLoaded` and `astro:page-load` so cold-load and
  View Transitions paths both fire.
- [ADR-0051](0051-session-service-detail-page-launch-gate.md) — Configurator →
  Contact URL contract; mentions `hidden`-class shipping in passing without
  naming the pattern.
- [ADR-0054](0054-component-reuse-annotations.md) — Reuse annotations enforce
  the three-surface symmetry: each surface's JSDoc carries `@relatedTo`
  cross-references to the other prefill surfaces and to the controller / reader
  that owns the init.
- [CONVENTIONS.md § Client-Side Scripts → § Hidden-by-Default Render-then-Init for Prefill Surfaces](../CONVENTIONS.md#hidden-by-default-render-then-init-for-prefill-surfaces)
  — the convention cross-reference.
- `src/scripts/contactFormController.ts` — controller for the contact-page
  surfaces (`ConfiguratorContextBox`, `ServiceLockedLine`, headline pair).
- `src/scripts/thanksSelectionReader.ts` — reader for the thanks-page surface
  (`ThanksSelectionSummary`).
