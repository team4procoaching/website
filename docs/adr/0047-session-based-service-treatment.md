# Session-Based Service Treatment in the Service Grid

Date: 2026-05-10

## ADR Warrant Check

- [x] **A — Contract**: Establishes a reusable pattern (badge, toggle exemption,
      card-level pricing copy) that future session-based services must follow.
- [x] **B — Asymmetry**: Sets a deliberate visual and behavioural asymmetry
      between the Posing card and the surrounding subscription cards. Without
      this ADR, the asymmetry reads as inconsistency and is likely to be "tidied
      back to symmetry" by a future contributor or AI-assisted edit.
- [x] **C — External revisit**: A second session-based service (e.g., photoshoot
      prep, show-day coaching, diet review) triggers reevaluation of whether
      session-based pricing should be promoted from a per-card exception to a
      structural axis.

## Status

Accepted

## Context

The Services overview page presents nine service cards across three discipline
categories (Bodybuilding, Athletic, Wellness). A sticky pricing toggle at the
top of the Services section lets visitors switch the displayed prices between
Monthly, 6-month, and 12-month plan length. Eight of the nine cards are
subscription-based and respond to this toggle. One card — Posing & Stage
Presence — is session-based: it is booked as a package of 1, 5, or 10 sessions,
with each session being either 30 or 60 minutes long.

This produces a structural mismatch. The pricing toggle implicitly contracts
with the visitor that all cards on the page share the same pricing logic. The
Posing card breaks that contract: its price suffix is `/session` instead of
`/month`, and the toggle has no meaningful action on it. A visitor who toggles
between Monthly and 12 Months sees eight cards animate while the ninth stays
static, with no explanation for the difference.

Two secondary problems compound the primary one. First, the price treatment
"€149 /session" sits next to "€299 /month" and "€249 /month", producing a
descending price ladder (299 → 249 → 149) that anchors Posing as the cheapest
option on the page even though it is a different product category. Second, the
configuration space (1/5/10 sessions × 30/60 minutes = up to six price points)
cannot be displayed on an overview card without overloading the visual hierarchy
of the grid.

A consultation with multiple LLMs in UI/UX-designer and conversion-optimization
roles converged on the same conclusion: Posing should remain a visible,
standalone card inside the Bodybuilding section (its thematic home), but it must
be visually and behaviourally differentiated from the surrounding subscription
cards in a way that is honest about the pricing-model difference without
overstructuring the page.

### Decision drivers

- **Premium positioning**: The site represents three IFBB Pro coaches. Visual
  consistency matters, but not at the cost of bait-and-switch effects or
  discount-tier optics that undermine the premium feel.
- **Visitor trust over short-term clicks**: Honest communication of the
  pricing-model difference is more valuable than maximizing click-through on the
  overview card.
- **Architectural restraint**: The 8:1 ratio between subscription-based and
  session-based services does not justify a structural axis (separate section,
  second filter row, restructured top-level navigation). The smallest honest
  solution wins.
- **Forward-compatibility**: If a second session-based service appears later,
  the chosen pattern must scale to two cards without rework.
- **Configuration belongs on detail pages**: Six price points in an overview
  card overload the grid and force the visitor to compute before they have
  decided to engage.

### Evaluated approaches

1. **Status quo (Posing card behaves identically, just shows `/session`)** —
   Rejected. The pricing-model difference is communicated only by a single
   suffix, which is too quiet to prevent the toggle-bruch confusion. The
   descending price ladder also distorts the perceived value of the subscription
   cards.

2. **Move Posing into a dedicated "Specialty Services" section** — Rejected. A
   dedicated section for a single card is overengineering, and it weakens the
   Bodybuilding section visually (only two cards remain, against four in
   Wellness). Reconsider when a second session-based service exists.

3. **Sub-section inside Bodybuilding ("Ongoing Coaching Plans" / "Session-Based
   Coaching")** — Rejected. Introduces a second hierarchy level inside
   Bodybuilding that does not exist in Athletic or Wellness. Trades card-level
   inconsistency for higher-level inconsistency, which is more visually
   prominent.

4. **Two filter rows (discipline + pricing model)** — Rejected. The 8:1 ratio
   between subscription and session-based services makes the second filter axis
   non-functional: filtering to "Session-based" reveals a single card, which
   feels like an empty result rather than a useful filter operation.

5. **Restructure with pricing model as the primary axis ("Coaching Plans" /
   "Session Coaching" tabs at the top, discipline as sub-filter)** — Rejected.
   Most invasive option. Demotes the discipline identity (which is central to
   the brand: three IFBB Pros, three disciplines) to a sub-classification, and
   one of the two top-level tabs would contain a single card, exposing the
   asymmetry at the highest level of the page.

6. **Badge + toggle rename + card position** — **Chosen.** The smallest honest
   solution: a discreet "Session-based" pill on the Posing card, the global
   toggle renamed to make its scope explicit, and Posing positioned as the
   rightmost card in the Bodybuilding section so the reading order
   ("subscription plans first, then specialised session offering") matches the
   conceptual structure.

## Decision

The Posing & Stage Presence card stays inside the Bodybuilding section, in its
current rightmost position (Competition Prep → Off-Season Muscle Building →
Posing & Stage Presence). The card is differentiated from its neighbours through
four coordinated changes.

**Toggle rename and clarification.** The global pricing toggle is no longer
labelled with a bare "Monthly / 6 Months / 12 Months". The labels stay, but the
toggle gains a small caption directly underneath stating that the toggle applies
to ongoing coaching plans and that session-based services are priced separately.
The exact copy belongs to the implementer; the constraint is that the caption is
a quiet sentence, not a prominent banner. It exists as a safety net for visitors
who notice the discrepancy, not as a signpost that interrupts the visual rhythm.

**"Session-based" pill on the Posing card.** A small, neutrally-styled pill sits
at the top of the Posing card, reading "Session-based". The styling is
deliberately understated: no accent orange, no contrast that screams "different
tier". A muted variant of the existing brand palette is appropriate; dark grey
on a light pill is acceptable. The pill describes the pricing model, it does not
market the service.

**Card-level pricing display.** The Posing card displays the price as
`from €149 / session`, followed by a single line of micro-copy describing the
configuration space (e.g., "1, 5 or 10 sessions · 30 or 60 min"). The full 2×3
configuration matrix is not rendered on the overview card. The `from` qualifier
is acceptable here because `/session` makes the per-unit nature self-evident —
unlike the subscription cards, where `from €299 /month` would imply a
month-by-month commitment that is not actually available.

**Toggle exemption.** The Posing card does not respond to the global pricing
toggle. When the toggle is changed, the eight subscription cards animate; the
Posing card stays static. The static-while-others-animate behaviour is itself a
communication mechanism that reinforces the pill: "this card plays by different
rules".

**CTA transition (interim).** The current CTA "Get Started" is a placeholder
because the Posing detail page does not yet exist; clicking it leads to the
Contact page. Once the detail page is implemented, the CTA changes to a
configuration-oriented label such as "Configure Package" or "View Packages".
This transition is mentioned here to make the interim state explicit; the detail
page itself is out of scope for this ADR.

### What does NOT change

- The Posing card stays inside the Bodybuilding section. It is not promoted to
  its own section, not demoted to an add-on on other detail pages.
- The category filter (All / Bodybuilding / Athletic / Wellness) is unchanged.
- The other two Bodybuilding cards (Competition Prep, Off-Season Muscle
  Building) and all cards in Athletic and Wellness are unchanged in layout,
  pricing display, toggle behaviour, and CTA.
- The pricing toggle's three values (Monthly / 6 Months / 12 Months) are
  unchanged. Only the surrounding clarification copy is added.
- The default toggle state remains Monthly. The toggle continues to display the
  upfront-payment total when 12 Months is active (existing behaviour).

### Scope and non-goals

**In scope:**

- Visual and behavioural treatment of the Posing card on the Services overview
  page.
- Toggle relabel/caption copy.
- Pill styling and placement.
- Card position and ordering inside the Bodybuilding section (confirmation of
  current order, not a change).

**Out of scope:**

- The Posing detail page (1/5/10 × 30/60 configurator, package descriptions,
  pricing matrix). This is its own implementation task, tracked separately.
- Cross-sell blocks on the Competition Prep and Off-Season Muscle Building
  detail pages that surface Posing as a complementary service. This is a
  separate decision and gets its own ADR once the detail pages mature.
- Life Coaching as a service offered by Helle. Deferred; reconsider once a
  second non-discipline-specific service emerges or once the offering needs
  dedicated visibility.
- Any A/B testing framework for the toggle default or the price-anchor
  treatment. The ADR commits to a position; measurement is a future concern.

## Consequences

### Positive

- The pricing-model difference is communicated honestly without restructuring
  the page or introducing axes the data does not support.
- The descending price ladder (299 → 249 → 149) is reframed: the pill and the
  `/session` suffix tell the visitor that Posing is not a cheaper alternative to
  the subscription plans but a different product.
- The toggle becomes semantically honest: its scope is explicit, and the Posing
  card's static behaviour is no longer a confusing edge case but a documented
  exception.
- The pattern is reusable: a second session-based service can adopt the same
  pill and exemption without further architectural decisions.
- Card-level configuration complexity is kept off the overview, preserving the
  visual rhythm of the grid.

### Negative

- The pill introduces a new UI vocabulary that exists for exactly one card.
  Until a second session-based service appears, this is a pattern with a
  population of one — defensible, but it carries an architectural debt that
  should be acknowledged.
- The toggle caption adds copy density to a part of the page that was previously
  clean. Risk of visual noise if the caption is styled too prominently.
- The asymmetry between the Posing card and the subscription cards is now
  _deliberate and documented_, but it remains an asymmetry. Future contributors
  or AI-assisted edits may attempt to "fix" it without reading this ADR.
- The decision implicitly bets that visitors will understand the pill +
  exemption combination intuitively. If they do not, the next iteration may need
  stronger differentiation (e.g., visibly different card typography or a short
  inline explanation).

### Risk mitigation

- The chosen pattern (pill + toggle exemption + position) is small enough to
  reverse if user feedback indicates confusion. The fallback option would be
  Approach 3 (sub-section inside Bodybuilding), which is a strictly larger
  intervention.
- The "Session-based" pill copy is deliberately neutral-descriptive. Wording
  like "Add-on", "Optional", or "Specialty" was rejected because it reads as
  evaluative and risks devaluing the service.
- The pill's visual styling guidance (muted, no accent colour) is recorded here
  so future polish passes do not unintentionally promote it into a louder
  marketing element.
- A revisit trigger is built into the External Revisit warrant: when a second
  session-based service is introduced, the structural axis question is reopened.
  The pill becomes a load-bearing pattern at that point and may justify a
  sub-section or filter promotion.

## Documentation Updates

Implementer should review each item below for relevance and update as needed.
The list reflects the documents most likely affected; the implementer is
expected to discover additional updates during the introduction commit.

**Updates required by this ADR:**

- `docs/ARCHITECTURE.md` → ADR Quick Reference entry for ADR-0047.
- `docs/ARCHITECTURE.md` → if there is a Services-page or design-system section
  that documents card patterns, add a note about the session-based pill pattern
  and the toggle-exemption rule.
- `docs/CONVENTIONS.md` → if conventions cover service-card structure or pricing
  display, document the pill, the `from €X / session` pattern, and the rule that
  cards may opt out of the global pricing toggle.
- Other ADRs → check whether prior ADRs related to the Services page, FilterBar,
  or service-card structure (e.g., the FilterBar / toolbar pattern) should
  cross-reference this one.
- `CLAUDE.md` → no expected change unless an existing rule about service-card
  consistency would be violated by the asymmetry introduced here; in that case,
  add a clarifying note.

If an expected location does not exist, the implementer documents that and
proceeds; do not invent sections to satisfy this list.

## References

- Conversation log establishing the decision (UX/UI and conversion consultation
  across multiple LLMs, May 2026).
- [ADR-0029](0029-services-toolbar-filter-paradigm.md) — services toolbar-filter
  paradigm; carries the reciprocal back-reference for the per-card
  pricing-toggle opt-out this ADR introduces.
- [ADR-0043](0043-servicecard-interim-contact-routing-pre-stripe.md) —
  ServiceCard interim contact-routing during the pre-Stripe phase; carries the
  reciprocal back-reference, and the Posing card's `Get Started` interim CTA
  follows that routing contract.
- [ADR-0051](0051-session-service-detail-page-launch-gate.md) — Detail-page
  treatment of session services; refines the launch-gate predicate and
  composition rules introduced here.
