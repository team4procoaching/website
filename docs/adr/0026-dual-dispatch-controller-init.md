# Dual-Dispatch Controller Init

Date: 2026-04-18

## Status

Accepted

## Context

Module scripts that initialize client-side controllers (`ServicesCatalog`,
`QuizModal`, `SuccessStories`) have historically bound their init functions only
to `astro:page-load`. That event fires reliably under two conditions: on every
navigation when View Transitions are enabled, and on the initial page load when
the ClientRouter is mounted.

This works today because `<ClientRouter />` is in `BaseLayout.astro`. It is
fragile because:

- Disabling View Transitions for any reason (future `prefers-reduced-motion`
  accommodation, testing, rollback) stops the event from firing on cold loads,
  and the controller never initializes.
- Cold-load interactivity matters more now: the mid-page quiz CTA on the
  services page targets the quiz modal, and users arriving via email/social
  links would have a dead CTA until the first in-page navigation.
- `SuccessStories.astro` had already independently adopted a both-events pattern
  (`DOMContentLoaded` + `astro:page-load`), so the project had two competing
  idioms for the same concern.

Code review surfaced this as a cross-cutting issue: the pattern was emerging
implicitly at multiple sites, and reviewers asked for a canonical record so the
inline comment would not turn into a copy-paste virus across every new
controller.

## Decision

Every module script that initializes a controller on a component that must work
on cold loads uses the `bootstrapOnLoad(init)` helper from `~/utils/bootstrap`,
which dispatches on **both** events:

```typescript
import { bootstrapOnLoad } from '~/utils/bootstrap';

bootstrapOnLoad(() => {
  document
    .querySelectorAll<HTMLElement>('[data-component]')
    .forEach(initComponent);
});
```

Three invariants must hold:

1. **The init callback is idempotent.** Consumers must make the init function
   idempotent, typically via a `data-initialized` guard set synchronously at
   function entry. Async init functions must set the guard before their first
   `await` point — dual dispatch means the callback may re-enter while a prior
   invocation is still pending; a guard set after an async boundary would not
   close the re-entrancy window. Every controller in the codebase currently
   satisfies this via either a `dataset.initialized` check on the root element
   or an equivalent per-instance guard.
2. **`DOMContentLoaded` is registered with `{ once: true }`.** The intent is
   single-shot; making it explicit inside `bootstrapOnLoad` prevents accidental
   drift when someone later adds a re-init path on a similar event.
3. **`astro:page-load` is not `{ once: true }`.** It must fire on every View
   Transition navigation, not just the first.

Controllers that register global listeners on `window`, `document`, or observers
must clean up via `astro:before-swap` or an `AbortController` scoped to the
component instance — see `servicesFilterController.ts` for the reference
implementation.

Components that only need to work after a View Transition navigation (not cold
loads) may use `astro:page-load` alone. The dual-dispatch pattern is required
when cold-load interactivity matters, not mandatory for every controller.

## Consequences

### Positive

- Cold-load interactivity is robust against `<ClientRouter />` being disabled
  for any reason, including future accessibility accommodations.
- New controllers have a single documented pattern to copy, and the helper
  (`bootstrapOnLoad`) collapses the three-line boilerplate to a single call.
- Idempotency, `{ once: true }`, and the event-pair invariants all live in one
  place (`src/utils/bootstrap.ts`) rather than being duplicated across every
  consumer.

### Negative

- Idempotency becomes load-bearing. A future refactor that removes a
  `data-initialized` guard in a controller would silently reintroduce
  double-init; the helper itself cannot detect or enforce this at the consumer's
  call-site.
- The helper hides the event-pair mechanism from the call-site. New contributors
  may not realize that `bootstrapOnLoad` binds two events until they read the
  helper source.

## Scope at the time of writing

Components divide into three categories:

1. **Conforming and using the helper** (`bootstrapOnLoad` from
   `src/utils/bootstrap.ts`):
   - `ServicesCatalog.astro`
   - `QuizModal.astro`

2. **Conforming to the pattern invariants, helper migration pending** (manual
   both-events registration, pre-existing; a follow-up can move it to
   `bootstrapOnLoad` for consistency but the runtime behavior already matches
   this ADR):
   - `SuccessStories.astro`

3. **Not yet conforming** (`astro:page-load`-only): cold-load init currently
   works because `<ClientRouter />` is mounted in `BaseLayout.astro`, so
   `astro:page-load` fires on cold loads too. Migration to `bootstrapOnLoad` is
   deferred; the trigger is either (a) the next non-trivial change touching one
   of these components, or (b) any step toward disabling View Transitions on
   cold loads (e.g., a `prefers-reduced-motion` accommodation), whichever comes
   first.
   - `ScrollAnimations.astro`
   - `CoachDetailModal.astro`
   - `ContactForm.astro`

## Related ADRs

- [ADR-0012](0012-client-side-script-strategy.md) — original script strategy
- [ADR-0020](0020-client-side-script-strategy-revised.md) — revised script
  strategy, which this ADR builds on by specifying the bootstrap lifecycle
- [ADR-0027](0027-invokers-api-modal-trigger-standard.md) — Invokers API as
  modal-trigger standard; the two ADRs were originally drafted together because
  both patterns emerged from the same review, but they apply to orthogonal
  concerns and were split to keep superseding decisions independent.
- [ADR-0031](0031-migration-to-native-view-transitions.md) (deferred) —
  evaluates removing `<ClientRouter />` in favor of browser-native view
  transitions. If accepted, this ADR would be superseded: the dual-dispatch
  problem it addresses only exists while ClientRouter intercepts navigation.
