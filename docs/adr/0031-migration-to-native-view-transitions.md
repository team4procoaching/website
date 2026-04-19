# Migration to Native View Transitions

Date: 2026-04-19

## Status

Deferred (Post-Launch)

## Context

The project uses `<ClientRouter />` (Astro's view transitions router) in
`BaseLayout.astro` to animate page navigation and avoid hard page loads.
ClientRouter intercepts navigation, performs in-place DOM replacement, and
dispatches Astro-specific events (`astro:page-load`, `astro:before-swap`,
`astro:after-swap`) that scripts can hook into.

Several observations converge on the question of whether ClientRouter should
continue to be used:

- **Empirical friction.** In reviews across the controller and modal
  infrastructure in the codebase, ClientRouter edge cases have produced at
  minimum: script re-execution timing issues, listener cleanup requirements via
  `astro:before-swap`, `DOMContentLoaded` not firing on in-app navigation, and
  ADR-0026 itself as compensating infrastructure. The cumulative pattern is that
  the component adds a lifecycle layer that requires dedicated compensating code
  rather than composing with platform defaults.

- **Framework direction.** Astro 6 introduces stable native CSP support but
  explicitly does not support ClientRouter under CSP. The Astro team's own
  documentation recommends migrating to browser-native view transitions
  (`@view-transition { navigation: auto }` in CSS, plus `view-transition-name`
  for element continuity) when CSP is required. An open docs issue
  (`withastro/docs#10902`) asks for the docs to position ClientRouter as a
  transitional approach rather than a routing must-have.

- **CSP consequence (immediate trigger).** The flash-mitigation inline script in
  `src/pages/services/index.astro` is blocked by the baseline production CSP
  (`script-src 'self'`). ADR-0030 documents the hash-based workaround currently
  in use, which avoids the ClientRouter- incompatibility of Astro's native CSP
  feature. If ClientRouter were removed, Astro's native CSP
  (`security.csp: true`) would become viable and the post-build hash-generation
  script could be retired.

- **Browser support.** Native cross-document view transitions are supported in
  current Chrome, Edge, and Safari. Firefox has Level 1 in active development
  but not yet released as of April 2026. Fallback for Firefox users is graceful
  (no animation, instant navigation), which is an acceptable degradation for
  this project's audience.

- **Dependency impact.** Removing ClientRouter would supersede ADR-0026
  (dual-dispatch becomes unnecessary because `DOMContentLoaded` fires on every
  page load when ClientRouter does not intercept). The `bootstrapOnLoad` helper
  would be obsolete. Controllers that rely on `astro:before-swap` for listener
  cleanup (`servicesFilterController.ts`) would no longer need explicit cleanup,
  because full page navigation discards the DOM anyway.

## Decision

**Deferred.** A migration from `<ClientRouter />` to browser-native view
transitions is a valid and likely future direction for this project, but is not
scheduled for execution at this time.

The deferral is not a rejection. The analysis in the Context section establishes
that the migration would:

- Simplify the codebase (remove ADR-0026, remove `bootstrapOnLoad`, remove
  `astro:before-swap`-based cleanup).
- Unlock Astro-native CSP (`security.csp: true`) and retire the post-build
  hash-generation script from ADR-0030.
- Align the project with the framework's recommended direction for CSP-enabled
  static sites.

The deferral is motivated by scope discipline: the current round of pre-launch
work is a polish pass, not an architectural restructuring. Performing the
ClientRouter migration at this stage would:

- Invalidate significant work done across multiple review rounds (ADR-0026 and
  associated pattern documentation would be superseded).
- Expand scope to a level where review atomicity becomes difficult.
- Delay project completion in a context where the goal is to finish cleanly.

## When to Reconsider

This ADR should be revisited when any of the following occur:

1. A second consumer of the flash-mitigation pattern emerges (e.g., Success
   Stories by tag with deep-link support), making the post-build hash-
   generation script maintenance overhead more visible.
2. Firefox ships Level 1 view transitions, closing the browser-support gap and
   making the migration risk negligible.
3. An unrelated architectural change requires touching the script lifecycle
   (e.g., a different bundling strategy, a switch to Astro's server islands), at
   which point ClientRouter removal becomes a natural companion.
4. Future active maintenance cycle picks up architectural work as a distinct
   concern from feature work. Architectural migrations are best executed outside
   of feature PRs, so this trigger is a capacity condition rather than a
   technical one.

A trigger for reconsideration does not automatically mean acceptance. Each
trigger is an occasion to re-run this ADR's analysis against the project's state
at that time.

## Migration Plan (Outline)

A migration, when executed, would proceed in these stages:

1. **Preparation:** Replace all `astro:page-load` / `astro:before-swap` /
   `astro:after-swap` listeners with equivalents that work under full page
   navigation (`DOMContentLoaded` for init, no cleanup needed since DOM is
   discarded).
2. **Remove ClientRouter:** Delete `<ClientRouter />` from `BaseLayout.astro`.
   Delete or simplify `bootstrapOnLoad` helper (if kept, it reduces to a thin
   `DOMContentLoaded` registration).
3. **Retire ADR-0026:** Mark as superseded by ADR-0031. Update cross-
   references.
4. **Enable native CSP:** Set `security.csp: true` in `astro.config.mjs`. Verify
   `<meta>` CSP element appears in built HTML. Test deep-link and filter
   scenarios in a Deploy Preview.
5. **Retire post-build hash script:** Delete `scripts/generate-csp-hashes.mjs`
   and the corresponding build-hook entry. Supersede ADR-0030 or update to
   reflect the native-CSP path.
6. **Add view transitions (optional):** If page-navigation animation is desired,
   add CSS `@view-transition { navigation: auto }` and per-element
   `view-transition-name` declarations for continuity.
7. **Firefox degradation check:** Verify that navigation works correctly
   (without animation) in Firefox and that no functional regression exists.

## Related ADRs

- [ADR-0026](0026-dual-dispatch-controller-init.md) — would be superseded by
  this ADR's acceptance.
- [ADR-0030](0030-csp-strategy.md) — would be superseded or simplified by this
  ADR's acceptance.
- [ADR-0020](0020-client-side-script-strategy-revised.md) — script strategy
  foundation; unaffected by this migration.

## Notes

The "Deferred" status is distinct from "Proposed" or "Rejected". A proposed ADR
awaits a decision; a rejected ADR has been considered and declined; a deferred
ADR has been considered and accepted in principle but is not scheduled for
execution. Future contributors reading this ADR should understand: the migration
is a question of _when_, not _whether_, given the cumulative signals documented
in the Context section.
