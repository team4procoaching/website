# Invokers API as Modal Trigger Standard

Date: 2026-04-18

## Status

Accepted

## Context

The project opens modal dialogs from several triggers across the services, home,
and coaches sections. All triggers emit the same markup in the built HTML:

```html
<button type="button" command="show-modal" commandfor="quiz-modal">...</button>
```

This is the
[Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)[^1]
paired with a native `<dialog>` element. Browser support:

- Chrome/Edge 135+ (released March 2025)
- Firefox 144+ (released late 2025)
- Safari 26.2+ (released early 2026)

Cross-browser availability across current stable versions of Chromium-based
browsers, Firefox, and Safari was completed in early 2026.

The `Cta` component compiles its `type: 'modal', modalId: '...'` prop shape down
to this attribute pair, which makes the mechanism invisible when reading the
call-site. Code review on a PR repeatedly asked whether the new mid-page CTA
used a different mechanism than the hero/bottom CTAs, because the raw
`command`/`commandfor` attributes were visible in the new CTA's markup but
hidden behind the `Cta` abstraction elsewhere. The answer is no — they all
resolve to the same thing — but the question keeps coming up, indicating the
pattern needs explicit documentation.

## Decision

All modal triggers use the native Invoker Commands API:

```html
<button type="button" command="show-modal" commandfor="some-modal-id">
  ...
</button>
```

The example above shows what the browser receives; in Astro templates the
attribute is authored as `commandfor={MODAL_IDS.xxx}` so the id is type-checked
against the central registry — see the MODAL_IDS section in
`docs/CONVENTIONS.md`.

The target must be a native `<dialog>` element with a matching `id` attribute.
No custom JavaScript event binding, no framework-specific modal helpers, no
threading through a React-style ref system.

The `Cta` component's `type: 'modal'` variant compiles to this shape and remains
the preferred consumer-facing API. Inline triggers (like the mid-page quiz CTA
in `ServicesCatalog`) may write the `command`/`commandfor` attributes directly
when the `Cta` abstraction doesn't fit the surrounding inline copy — for
example, a trigger embedded within a sentence of body text where `Cta`'s
block-level styling would break the inline flow.

Modal IDs are registered centrally in `src/data/ids.ts` as the `MODAL_IDS`
constant with a derived `ModalId` type, so that `commandfor` values and
`ModalCta.modalId` prop values reference a single source of truth rather than
duplicating the ID string across trigger and target.

`el-dialog` from `@tailwindplus/elements` wraps the native `<dialog>` target
with transition, scroll-lock, and focus-management behavior that Invokers
triggers don't provide on their own. Invokers trigger `showModal()` on the
native `<dialog>` element inside the wrapper; the wrapper itself is transparent
to the trigger. The two mechanisms are orthogonal — Invokers decide _what_
opens, `el-dialog` decides _how_ it opens.

## Consequences

### Positive

- Modal-open behavior is uniform across the codebase. Reading any CTA source
  tells you exactly how the modal opens.
- The native layer (`<dialog>` + `showModal()` triggered declaratively) handles
  focus trap, escape-to-close, and backdrop without JavaScript.
- No JavaScript needs to download or execute before a modal trigger is
  interactive; Invokers are declarative.
- The `MODAL_IDS` registry and derived `ModalId` type reject unknown ids at
  compile time when the consuming prop is typed as `ModalId` (for example
  `ModalCta.modalId`). A hardcoded string that happens to match a registered
  value is still accepted — the type enforces _registration_, not _reference via
  the registry constant_. Best practice on both trigger and target sides is to
  reference `MODAL_IDS.*` to close the drift window.

### Negative

- The Invokers API policy forecloses using non-`<dialog>` modal implementations.
  If a future design needs a modal with features the native element cannot
  provide (e.g. nested modals, non-top-layer modals), the standard would need
  revision.
- Baseline cross-browser availability was only completed in early 2026 (Safari
  26.2 release). Users on older Safari versions see the `<button>` do nothing
  when clicked; this is an acceptable degradation for the project's audience and
  usage profile, but teams with significantly different browser-share
  assumptions may need a polyfill.
- The `Cta` abstraction hides the Invokers mechanism from most call-sites. New
  contributors reading a page with only `Cta` components may not realize that
  modals are trigger-driven rather than state-driven until they inspect the
  built HTML or read the component source.

## Scope at the time of writing

Modals registered in `MODAL_IDS` and triggered via Invokers:

- `MODAL_IDS.quiz` (`QuizModal.astro`) — triggered from the services hero,
  bottom CTA, and mid-page CTA, plus the home page CTA
- `MODAL_IDS.coachDetail` (`CoachDetailModal.astro`) — triggered from
  `CoachCardCompact` and `CoachCardExpanded` in the coaches section

No legacy modal-trigger pattern remains in the codebase; all live triggers use
`command`/`commandfor`.

## Related ADRs

- [ADR-0019](0019-use-tailwindplus-elements-for-interactive-ui.md) —
  `@tailwindplus/elements` adoption; `el-dialog` provides the wrapping layer
  (enter/exit transitions, scroll-lock, focus-management) around the native
  `<dialog>` target — orthogonal to the Invokers API, not a fallback for it.
- [ADR-0023](0023-filter-vs-selection-primitives.md) — Filter vs. Selection
  primitives, precedent for using native HTML semantics over JavaScript-driven
  alternatives
- [ADR-0026](0026-dual-dispatch-controller-init.md) — dual-dispatch controller
  init; the two ADRs were originally drafted together because both patterns
  emerged from the same PR review, but they apply to orthogonal concerns and
  were split to keep superseding decisions independent.

[^1]:
    Browser support facts verified against MDN and webstatus.dev as of
    April 2026. See also InfoQ's January 2026 coverage of the cross-browser
    completion: <https://www.infoq.com/news/2026/01/html-invoker-commands/>
