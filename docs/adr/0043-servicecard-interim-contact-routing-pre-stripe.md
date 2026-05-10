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

The card has three plausible places where a click can route:

- The whole card surface (a stretched `<a>` covering every part of the card).
- The footer primary button (full-width accent fill).
- An optional in-footer text link.

Each can route to either the contact form or the detail page. The combinatorial
space is bounded by two real constraints:

1. **Pre-Stripe lead-funnel preservation.** Stripe Business onboarding gates on
   the website being live, and the detail page has no on-page conversion
   mechanism until that onboarding completes. Until Stripe approval lands, the
   contact form is the only revenue mechanic. Eliminating the one-click contact
   path from any eligible card cuts off lead capture from visitors who already
   know they want to talk.
2. **Detail-page discoverability.** The detail page exists to help undecided
   visitors decide. If the detail page is not discoverable from the catalog at a
   visual weight comparable to the contact path, the visitor's path collapses to
   "click the dominant CTA, hit the contact form, ask basic questions in free
   text" — re-creating manually the triage the detail page is meant to
   short-circuit.

A first-pass shape was implemented and tested on the dev server: surface and
primary button both routed to contact, plus a small textual `Read details →`
affordance for eligible cards. Visual review on the dev server returned a
blocking finding: the small text link is read as incidental compared to the
dominant accent-fill button. Visitors who would benefit from the detail page
bypass it for the dominant CTA. The discoverability constraint failed in
practice — the affordance was present but not load-bearing at the visual
hierarchy level.

The two constraints meet at the question: which path receives the dominant
visual weight on eligible cards, and how does the other path stay reachable in
one click? On non-eligible cards there is no second path — the contact form is
the only destination — so the question only applies to eligible cards.

Independent UX-HIGH and CRO-HIGH critiques on the original surface-and-button-
to-contact shape returned blocking findings on the discoverability constraint.
The same critiques on a detail-primary-with-escape shape (eligible cards:
surface and primary button route to detail; a subordinate text link provides the
one-click contact escape) returned no blockers — the lead-funnel constraint is
satisfied by the explicit escape, and the discoverability constraint is
satisfied by the dominant button leading to the detail page.

The asymmetry relative to `SuccessStoryGridCard` (which has no contact funnel
and no competing CTA on its detail-eligible state) is deliberate. The
success-stories domain has no purchase mechanic on the horizon, so its
surface-link is unambiguous; the services domain has a planned purchase mechanic
blocked on Stripe Business onboarding, so a one-click contact path must remain
on every eligible card until Stripe ships.

This decision needs to be documented somewhere durable. A future maintainer
reading `ServiceCard.astro` six months from now needs an answer to "why does the
eligible card route surface and primary button to the detail page while the
non-eligible card routes everything to contact, and why does the eligible card
carry a subordinate `Skip ahead — contact us` link below the primary button?" —
and the answer must persist past the worktree's lifetime.

### Decision drivers

- **Continuity (Bus Factor).** The rationale must outlive the worktree-local
  task documents that produced it. A new maintainer reading the card source must
  find the answer in a persistent artefact, not by archaeology through a merged
  PR's worktree.
- **AI-first workflow** (per `user_ai_first_workflow.md`). The asymmetric shape
  (eligible cards: detail-primary + contact escape; non-eligible cards: contact
  only) must be enforceable by typed boundaries and grep-visible rationale, not
  by reviewer discipline. A future AI-generated edit that "tidies up" the
  asymmetric routing into the symmetric `SuccessStoryGridCard` shape (no escape)
  is a documented regression mode this ADR is meant to prevent.
- **Reversibility.** The chosen contract is interim by design. Post-Stripe, the
  eligible-card primary button's destination flips from the detail page to a
  checkout URL — a one-line change with no hierarchy reversal. The ADR must
  leave room for that flip without pre-committing to a specific shape today.

### Evaluated approaches

1. **No documentation beyond the worktree task docs.** Rejected. The asymmetric
   eligible-card shape (two destinations split by visual hierarchy) is exactly
   the kind of decision a future contributor would unwind if they read only the
   code.
2. **JSDoc anchor on `Service.contactHref` carrying the rationale, no ADR.**
   Tempting because the field is consumed by both the eligible-card escape link
   and the non-eligible-card primary button. Rejected as the sole anchor: the
   rationale crosses three files (data module, card, the future detail-page card
   variant), and tying the rationale to a single-field JSDoc fragments it across
   the consumer sites.
3. **Thin ADR plus JSDoc cross-reference.** ADR carries the rationale,
   `Service.contactHref` JSDoc cross-references the ADR by number. **Chosen.**

## Decision

The pre-Stripe `ServiceCard` contract is the
**detail-primary-with-contact-escape shape on eligible cards, contact-only on
non-eligible cards**:

- **Eligible cards** (those passing `hasCompleteDetailContent` from
  `~/data/services`):
  - The card surface is a stretched `<a href={serviceDetailHref(service.id)}>`
    carrying `aria-label="Read details about ${service.name}"`.
  - The footer primary button is
    `<Button href={serviceDetailHref(service.id)} variant="primary" aria-label="Read details about ${service.name}">Read Details →</Button>`,
    full-width and accent-fill, with the chevron rendered as a separate
    `<span aria-hidden="true">→</span>` per the codebase's text+arrow
    convention.
  - Below the primary button, a subordinate
    `<a href={service.contactHref} aria-label="Contact us about ${service.name}">Skip ahead — contact us</a>`
    provides the one-click contact escape, styled with muted secondary text
    colour (`text-foreground-500 dark:text-gray-400`), centred, with a
    tap-target wrapper (`inline-block py-2 px-3`) and `relative z-10` to escape
    the surface stretched-link.
- **Non-eligible cards:**
  - The card surface is a stretched `<a href={service.contactHref}>` (no
    aria-label override; the `<h3>` heading inner text serves as the accessible
    name).
  - The footer primary button is
    `<Button href={service.contactHref} variant="primary">Get Started</Button>`,
    full-width and accent-fill.
  - No escape link.

`Service.contactHref` remains the canonical "contact destination" property for
both card branches. On eligible cards it powers the escape link only; on
non-eligible cards it powers the surface and the primary button. The data model
carries no separate "card-action-href" field; introducing one today would invent
indirection ahead of evidence, and the post-Stripe transition (below) does not
require it.

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
  surface-flip-on-eligible shape because it does not face the same lead-funnel
  trade-off (no purchase-mechanic plan on the success-stories detail page, and
  no contact funnel parallel to preserve).

### Scope and non-goals

**In scope:**

- The eligible-card detail-primary-with-escape contract on `ServiceCard`.
- The non-eligible-card contact-only contract on `ServiceCard` (unchanged).
- The interim-routing rationale that explains the asymmetry between eligible and
  non-eligible cards, and the divergence from `SuccessStoryGridCard`.
- The post-Stripe transition path, named so that future maintainers recognise
  the chosen shape as deliberately temporary.

**Out of scope:**

- Buy-Now mechanics, Stripe payment integration, or any detail-page conversion
  mechanism. These are gated on Stripe Business onboarding and unblock together
  once approval lands; the trigger and the follow-ups are described in the
  Post-Stripe transition section below.
- Card-variant types for "buyable" vs. "lead-only" services. None are introduced
  today; whether one is needed post-Stripe is a separate decision under the
  post-Stripe trigger named below.
- The DOM-ID scoping shape for catalog vs. homepage consumers. That is a
  component-internal concern, not load-bearing for the surface-routing contract
  documented here.
- Detail-page CTA quality (sticky / repeated / inline contact CTAs on the detail
  page itself). Once eligible cards route the dominant click target to the
  detail page, the detail page's own CTAs become the next CRO surface. That work
  is a follow-up task, not part of this ADR.

## Consequences

### Positive

- **Lead funnel stays reachable in one click on every card.** On non-eligible
  cards the contact form is the dominant destination; on eligible cards it is
  the subordinate escape directly below the primary button. No card buries the
  contact path more than one click deep.
- **Detail-page discoverability matches the visual weight of the contact path.**
  The dominant accent-fill button on eligible cards leads to the detail page, so
  visitors arriving on the catalog before they have decided land on deeper
  information first.
- **Eligibility signal is touch-friendly.** The split-destination footer is
  visible at rest, not gated on hover or focus. Touch traffic (50–70% of
  marketing visits) sees the same affordance as desktop traffic.
- **Surface-link and primary-button destinations stay aligned on each branch.**
  On eligible cards, both surface and primary button route to the detail page
  (the escape link is the only divergence). On non-eligible cards, both route to
  contact. The "card surface = info / CTA = action" mental model is preserved
  within each branch; the asymmetry is between branches, not within a single
  card's two dominant interactive children.
- **Post-Stripe flip becomes a one-line change.** When Buy-Now ships on the
  detail page, the eligible-card primary button's `href` swaps from
  `serviceDetailHref(id)` to a checkout URL (separate from `contactHref`). No
  hierarchy reversal, no second contract revision; the primary already
  permanently lives on the detail-page route, which is where Buy-Now will live
  too.
- **Persistent rationale.** A maintainer reading the card source finds the
  asymmetric branch shape, follows the JSDoc cross-reference on
  `Service.contactHref` to this ADR, and reads the why before "fixing" the
  asymmetry.

### Negative

- **Two destinations on eligible cards.** The dominant primary button and the
  subordinate escape link route to two different pages (detail vs. contact). The
  split is deliberate — both constraints (lead funnel + discoverability) require
  both paths to remain reachable — but it does cost a moment of "where does each
  go" friction for first-time visitors. The visible labels on both surfaces
  (`Read Details` on the button, `Skip ahead — contact us` on the escape) carry
  the destination in plain language to mitigate.
- **Same-destination redundancy on eligible cards.** The surface stretched-link
  and the primary button both route to the detail page, with identical
  `aria-label` values. Two interactive children with the same destination is an
  accepted cost of the stretched-link pattern; identical accessible names are a
  clearer screen-reader pattern than two distinct names that both lead to the
  same page.
- **Asymmetry vs. `SuccessStoryGridCard`.** A reader comparing the two cards
  sees two different shapes for "predicate-conditional detail link": the
  success-stories card has no escape (single destination), the services card has
  a contact escape on eligible cards. The asymmetry is intentional and
  documented, but it does cost a moment of "wait, why are these different?"
  friction on first read.
- **Detail-page CTA quality is now load-bearing.** When the dominant click
  target on eligible cards routed to the contact form, the detail page's own
  CTAs were a secondary concern. Now that the dominant target routes to the
  detail page, the detail page's own CTAs (currently a single primary CTA in
  `ServicePricingBlock.astro`) become the next CRO surface. Sticky / repeated /
  inline contact CTAs on the detail page are a follow-up task, not part of this
  ADR.
- **Soft inconsistency with future card variants.** If a third domain (e.g.,
  `/coaches/[slug]` cards) ships before Stripe, that domain has to decide
  between this asymmetric shape and the `SuccessStoryGridCard` flip shape. The
  ADR does not pre-decide for third domains; the choice depends on whether the
  domain has a Stripe-blocked conversion mechanic and a contact funnel parallel.

### Risk mitigation

- **JSDoc cross-reference on `Service.contactHref`.** The data field's JSDoc
  carries a "see [ADR-0043] for the interim-contact-routing rationale"
  reference, so the rationale is one click from the field declaration.
- **Post-Stripe revisit trigger explicitly named.** The Post-Stripe transition
  section below describes the external event that unblocks the revisit and lists
  the eligible-card primary-button re-evaluation as one of the follow-ups. The
  trigger is the contract; this ADR does not need a successor unless the
  post-Stripe decision changes the data model or the card's branch shape.

## Notes

### Post-Stripe transition

Stripe Business onboarding requires the website to be live before approval.
Until that approval lands, all service-action CTAs route to the contact form by
deliberate interim design — eligible cards via the subordinate escape link,
non-eligible cards via the surface and the primary button. This is the contract
documented in the Decision section above.

When Stripe approval is granted, two follow-ups unblock together:

1. **Detail-page Buy-Now CTA.** `src/pages/services/[slug].astro` (and the
   pricing block it composes) gains a Buy-Now CTA backed by a Stripe checkout
   URL. The eligible-card primary button's `href` then swaps from
   `serviceDetailHref(id)` to that checkout URL — a one-line change in the card,
   no hierarchy reversal.
2. **`ServiceCard` surface-link re-evaluation.** Once the detail page carries
   its own conversion mechanic, the eligible-card surface link can legitimately
   flip away from the contact-escape pattern toward persistent contact-CTAs on
   the detail page itself. Worth a fresh CRO check at that point if traffic data
   is available; absent data, the default is "leave the surface routing as-is
   until evidence appears".

The trigger is external (Stripe Business Account approval lands) and is not
detectable from the codebase. The owner opens this work when the approval
arrives.

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
- [ADR-0035](0035-adopt-subagent-architecture.md) — the agent architecture in
  which the interim-routing rationale was developed through iterative design
  review.
- [ADR-0038](0038-dynamic-detail-route-pattern.md) — the dynamic detail route
  pattern. This ADR documents the _consumer_ side of the pattern's launch-gate
  predicate (`hasCompleteDetailContent`); ADR-0038 documents the _producer_ side
  (the route, the predicate, the co-located route helper).
- [ADR-0047](0047-session-based-service-treatment.md) — layers a session-based
  pill, `from €X / session` price copy, and a global-toggle exemption onto the
  Posing `ServiceCard`; complements the routing contract documented here.
- `src/data/services.ts:138-163` — the `Service.contactHref` field declaration
  whose JSDoc cross-references this ADR.
- `src/data/services.ts:729-739` — `hasCompleteDetailContent`, the launch-gate
  predicate consumed by the eligible-card affordance.
- `src/data/services.ts:695-697` — `serviceDetailHref`, the co-located route
  helper consumed by the eligible-card affordance.
- `src/components/sections/services/ServiceCard.astro` — the consumer whose
  contract this ADR documents.
- `src/components/sections/successStories/SuccessStoryGridCard.astro:39-117` —
  the `SuccessStoryGridCard` precedent this ADR deliberately diverges from, and
  the rationale.
