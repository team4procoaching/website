# ServiceCard Interim Contact-Routing During Pre-Stripe Phase

Date: 2026-05-01

## Status

Accepted

## Context

`/services/[slug]` shipped under
[ADR-0038](0038-dynamic-detail-route-pattern.md) as the project's second dynamic
detail route. The route exists, but the catalog cards on `/services` and the
homepage do not link to it — the only visitors who reach the detail page are
those who type the URL. The first card-side adopter task ("services-card-link",
2026-04-28) closes that gap.

Two design candidates surfaced for "what does the eligible-card surface link
target":

1. **Surface flips to detail.** The card's stretched `<a>` points at
   `serviceDetailHref(service.id)` for eligible services, the contact route for
   non-eligible services. This is the precedent set by
   `SuccessStoryGridCard.astro:39` for `/success-stories`. The footer CTA button
   typically goes away or duplicates the detail destination.
2. **Surface stays on contact.** The card's stretched `<a>` continues to target
   `service.contactHref` for every card. Eligible cards gain an _additional_
   textual `Read details →` affordance link that escapes the stretched-link via
   `relative z-10`. The footer CTA button stays `Get Started → contactHref` on
   every card.

Independent UX-HIGH and CRO-HIGH critiques on (1) returned blocking findings:

- **UX:** routing the dominant surface click to the detail page while the footer
  button routes to contact creates two destinations within a single card. That
  contradicts the "card surface = info, button = action" mental model and breaks
  parity with the `SuccessStoryGridCard` precedent (which has no competing CTA
  in its detail-eligible state).
- **CRO:** surface clicks dominate footer-button clicks by roughly 3–5× on
  stretched-link cards. Routing the dominant click target to a pre-Stripe detail
  page (no on-page conversion mechanism currently) cannibalises the contact-form
  funnel that produces leads today, in exchange for a "stronger eligibility
  signal" with no revenue mechanic behind it yet.

The two reviews together selected (2) as the launch contract. The asymmetry
relative to `SuccessStoryGridCard` is deliberate — the success-stories domain
has no purchase mechanic on the horizon, so the surface-link is unambiguous; the
services domain has a planned purchase mechanic blocked on Stripe Business
onboarding (which Stripe gates on the website being live), so the surface-link
must keep producing leads until the detail page gains a conversion mechanism of
its own.

This decision needs to be documented somewhere durable. The Phase-2 concept doc
and the requirements doc both record the rationale, but both are worktree-local
and disappear when the PR merges. A future maintainer reading
`ServiceCard.astro` six months from now needs an answer to "why does this card
have two destinations on eligible cards, and why doesn't the surface flip to
detail like `SuccessStoryGridCard` does?" — and the answer must persist past the
worktree's lifetime.

### Decision drivers

- **Continuity (Bus Factor).** The rationale must outlive the worktree-local
  task documents that produced it. A new maintainer reading the card source must
  find the answer in a persistent artefact, not by archaeology through a merged
  PR's worktree.
- **AI-first workflow** (per `user_ai_first_workflow.md`). The interim shape
  must be enforceable by typed boundaries and grep-visible rationale, not by
  reviewer discipline. A future AI-generated edit that "tidies up" the
  asymmetric routing into the symmetric `SuccessStoryGridCard` shape is a
  documented regression mode this ADR is meant to prevent.
- **Reversibility.** The chosen contract is interim by design. Post-Stripe, the
  surface-link of eligible cards becomes a CRO-positive flip rather than a
  CRO-negative one. The ADR must leave room for that flip without pre-committing
  to a specific shape today.

### Evaluated approaches

1. **No documentation beyond the worktree task docs.** Rejected. The asymmetric
   shape is exactly the kind of decision a future contributor would unwind if
   they read only the code.
2. **JSDoc anchor on `Service.contactHref` carrying the rationale, no ADR.**
   Tempting because the rationale is already partially recorded there ("the name
   is deliberately specific — a generic `href` would be ambiguous once each
   service also gets a detail-page URL"). Rejected as the sole anchor: the
   rationale crosses three files (data module, card, the future detail-page card
   variant), and tying the rationale to a single-field JSDoc fragments it across
   the consumer sites.
3. **Thin ADR plus JSDoc cross-reference.** ADR carries the rationale,
   `Service.contactHref` JSDoc cross-references the ADR by number. **Chosen.**

## Decision

The pre-Stripe `ServiceCard` contract is the **hybrid surface-routing shape**:

- The card surface is a stretched `<a href={service.contactHref}>` for every
  card, eligible or not.
- The footer CTA button is
  `<Button href={service.contactHref} variant="primary">Get Started</Button>` on
  every card.
- Detail-eligible cards (those passing `hasCompleteDetailContent` from
  `~/data/services`) gain an _additional_ visible-at-rest textual
  `Read details →` link pointing at `serviceDetailHref(service.id)`, escaping
  the surface stretched-link via `relative z-10` (mirroring the existing
  CTA-button escape on `ServiceCard.astro:130`).

`Service.contactHref` is the canonical "primary action" property for the card
surface and the CTA button during this phase. The data model carries no separate
"card-action-href" field; introducing one today would invent indirection ahead
of evidence, and the post-Stripe transition (below) does not require it.

### What does NOT change

- The data model. `Service` keeps `contactHref` and the optional detail-page
  fields exactly as today. No new properties, no discriminated-union variant, no
  `actionHref` rename.
- `serviceDetailHref` and `hasCompleteDetailContent`. Both already exist in
  `~/data/services` and stay the single source of truth for "is this service
  detail-eligible?" and "what is the detail-page URL?" — no duplication at the
  card site.
- ADR-0038. The dynamic detail route pattern is unchanged; this ADR describes
  the _consumer_ side of the predicate, not the route side.
- The `SuccessStoryGridCard` precedent. The success-stories domain retains its
  surface-flip-on-eligible shape because it does not face the same CRO trade-off
  (no purchase-mechanic plan on the success-stories detail page).

### Scope and non-goals

**In scope:**

- The asymmetric surface-link / affordance-link contract on `ServiceCard`.
- The interim-routing rationale that explains the divergence from
  `SuccessStoryGridCard`.
- The post-Stripe transition path, named so that future maintainers recognise
  the chosen shape as deliberately temporary.

**Out of scope:**

- Buy-Now mechanics, Stripe payment integration, or any detail-page conversion
  mechanism. These are tracked in `docs/STATUS.md` and gated on Stripe Business
  onboarding.
- Card-variant types for "buyable" vs. "lead-only" services. None are introduced
  today; whether one is needed post-Stripe is a separate decision under the
  post-Stripe trigger named below.
- The DOM-ID scoping shape for catalog vs. homepage consumers. That is a
  component-internal concern handled in the same task as this ADR but not
  load-bearing for the surface-routing contract documented here.

## Consequences

### Positive

- **Lead funnel stays intact during Stripe approval limbo.** The dominant
  surface click on every card continues to produce a contact form submission,
  the only revenue mechanic available today.
- **Eligibility signal is touch-friendly.** The `Read details →` link is visible
  at rest, not gated on hover or focus. Touch traffic (50–70% of marketing
  visits) sees the same affordance as desktop traffic.
- **Surface-link flip becomes a non-architectural follow-up post-Stripe.**
  Flipping eligible-card surfaces to detail is a one-line change inside
  `ServiceCard.astro`. No new types, no new branches, no propagated rename.
- **Persistent rationale.** A maintainer reading the card source finds the
  asymmetric shape, follows the JSDoc cross-reference on `Service.contactHref`
  to this ADR, and reads the why before "fixing" the asymmetry.

### Negative

- **Two destinations on eligible cards.** Visitors on eligible cards see a
  `Read details →` link (→ detail page) and a `Get Started` button (→ contact
  form). The two-destination friction is real but bounded — both are sub-CTAs to
  the dominant surface click, which still routes to contact.
- **Asymmetry vs. `SuccessStoryGridCard`.** A reader comparing the two cards
  sees two different shapes for "predicate-conditional detail link". The
  asymmetry is intentional and documented, but it does cost a moment of "wait,
  why are these different?" friction on first read.
- **Soft inconsistency with future card variants.** If a third domain (e.g.,
  `/coaches/[slug]` cards) ships before Stripe, that domain has to decide
  between this hybrid shape and the `SuccessStoryGridCard` flip shape. The ADR
  does not pre-decide for third domains; the choice depends on whether the
  domain has a Stripe-blocked conversion mechanic or not.

### Risk mitigation

- **JSDoc cross-reference on `Service.contactHref`.** The data field's JSDoc
  gains a one-line "see [ADR-0040] for the interim-contact-routing rationale"
  reference, so the rationale is one click from the field declaration.
- **Post-Stripe revisit trigger explicitly named.** When Stripe Business
  onboarding completes, `docs/STATUS.md` → "Stripe-Approval triggers —
  post-launch follow-ups" lists the eligible-card surface-link re-evaluation.
  The trigger is the contract; this ADR does not need a successor unless the
  post-Stripe decision changes the data model.

## Notes

### Post-Stripe transition

When Stripe Business onboarding completes, two things unblock:

1. The detail page gains a Buy-Now CTA in `src/pages/services/[slug].astro`. Out
   of scope here.
2. The eligible-card surface-link contract becomes re-evaluatable. The
   surface-flip-to-detail picks (the rejected alternative above) hinge on the
   absence of a detail-page conversion mechanic; once a Buy-Now CTA exists on
   the detail page, the CRO trade-off inverts and the flip becomes a
   non-architectural follow-up.

This ADR is not deprecated by the post-Stripe transition. It documents the
_interim_ contract; once Stripe ships, a successor ADR (or a thin amendment
block on this one) records the new contract. The interim rationale stays
readable as the source-of-truth for "why was the card shaped this way during the
pre-Stripe phase?".

## References

- [ADR-0017](0017-domain-data-integrity-pattern.md) —
  `as const satisfies Record<>` pattern; underpins the `Service` type that
  carries `contactHref` and the optional detail-page fields.
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) — extract-first
  composition; the `ServiceCard` is the extracted typed surface where this ADR's
  contract is enforced.
- [ADR-0035](0035-adopt-subagent-architecture.md) — the agent architecture that
  produced this ADR. The interim-routing rationale surfaced through the Phase-2
  design-sparring loop.
- [ADR-0038](0038-dynamic-detail-route-pattern.md) — the dynamic detail route
  pattern. This ADR documents the _consumer_ side of the pattern's launch-gate
  predicate (`hasCompleteDetailContent`); ADR-0038 documents the _producer_ side
  (the route, the predicate, the co-located route helper).
- `src/data/services.ts:138-152` — the `Service.contactHref` field declaration
  whose JSDoc cross-references this ADR.
- `src/data/services.ts:718-728` — `hasCompleteDetailContent`, the launch-gate
  predicate consumed by the eligible-card affordance.
- `src/data/services.ts:684-686` — `serviceDetailHref`, the co-located route
  helper consumed by the eligible-card affordance.
- `src/components/sections/services/ServiceCard.astro` — the consumer whose
  contract this ADR documents.
- `src/components/sections/successStories/SuccessStoryGridCard.astro:39-117` —
  the `SuccessStoryGridCard` precedent this ADR deliberately diverges from, and
  the rationale.
- `docs/STATUS.md` → "Stripe-Approval triggers — post-launch follow-ups" — the
  post-Stripe revisit trigger named in the Notes section above.
