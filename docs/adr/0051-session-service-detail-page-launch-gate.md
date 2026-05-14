# Session-Service Detail-Page Launch Gate and Configurator Composition

Date: 2026-05-14

## ADR Warrant Check

- [x] **A — Contract**: Establishes the per-discriminator launch-gate predicate
      that session-mode services satisfy in order to ship a detail page (the
      existing arity gates on `detailedFeatures` / `fitFor` / `faq` are kept
      verbatim on the subscription arm and replaced by configurator-substance
      gates on the session arm), and the contract that session-mode detail pages
      compose `PosingConfigurator` in place of `ServicePricingBlock`. Future
      session-mode services follow this contract.
- [x] **B — Asymmetry**: The detail-page composition is deliberately asymmetric
      between subscription services (long-form with `ServiceWhoIsFor` /
      `ServiceWhatsIncluded` / `ServiceSocialProof` / `Accordion` /
      `ServicePricingBlock`) and session services (configurator-led;
      `ServiceWhoIsFor`, `ServiceWhatsIncluded`, and `Accordion` are not
      composed on the session arm because the arm's narrow does not guarantee
      the underlying arrays). Without this ADR, a future contributor sees the
      asymmetry and "tidies" it back by either bloating session-service data
      shapes with the long-form fields or by re-symmetrising the page route.
- [x] **C — External revisit**: A second session-mode service (e.g., photoshoot
      prep, show-day coaching, diet review) re-opens the structural question:
      does `PosingConfigurator` become `SessionPackageConfigurator`? Does the
      `packages` shape move into a shared schema? Does the launch-gate
      relaxation become more permissive or stricter? This ADR is the place that
      revisit starts.

## Status

Accepted

## Context

ADR-0047 (Session-Based Service Treatment) introduced the
`SubscriptionService | SessionService` discriminated union in `~/data/services`
and shipped the catalog-page treatment for the Posing & Stage Presence service.
ADR-0047 explicitly left the detail-page treatment of session services as
follow-up work — the catalog opt-out shipped (the "from €149 / session" card
copy and the pill), but the detail-page side of the same line of work was
deferred.

This ADR closes that follow-up.

The detail-page route `/services/[slug]` is gated by the predicate
`hasCompleteDetailContent(service)` in `~/data/services`, which today requires
`lead` (non-empty), `detailedFeatures.length >= 3`, `fitFor.length >= 3`,
`faq.length >= 3`, and `pricing.length >= 1`. The predicate was designed for
subscription services, whose catalog content (3-tuple pricing,
`BillingPeriod`-keyed display, single global toggle) maps cleanly to a long-form
detail page (Hero → WhoIsFor → WhatsIncluded → ProcessSteps → SocialProof → FAQ
→ PricingBlock).

For session services, the same long-form composition does not apply with the
same arity load:

- A session service's value proposition is the **package configurator** (six
  prices, three explanations, the duration toggle). The configurator _is_ the
  page's substance.
- The catalog-page side of the session treatment (ADR-0047) already documents
  that the configuration matrix lives on the detail page, not on the card. The
  detail-page expectation is therefore _configurator- led_, not long-form-led.
- Demanding the long-form arity gates as a prerequisite for any session service
  to ship a detail page would either (i) block the configurator shipping (the
  configurator anforderung depends on a separately-scoped explanatory-content
  anforderung) or (ii) force the data shape to carry placeholders that fail the
  spirit of the launch-gate predicate.

The two viable approaches considered:

1. **(R1)** Split the launch-gate predicate by the `pricingModel` discriminator:
   subscription arm keeps the existing gate verbatim; session arm replaces the
   long-form arity gates with configurator- substance gates (`packages`
   populated + `descriptions` × 3 + valid `recommendedPackageSize`). The page
   composition branches and skips the long-form sections on the session arm; the
   configurator replaces `ServicePricingBlock`.
2. **(R2)** Keep the launch-gate predicate uniform and require coach- authored
   long-form content for every detail page; block the configurator until the
   explanatory-content stream lands.

This ADR records the choice of R1 (specifically, the predicate-modify minimal
variant: only `lead` ships as a placeholder on Posing; the `detailedFeatures` /
`fitFor` / `faq` arrays are not populated on Posing at all) and the contract
that follows.

### Decision drivers

- **Substance follows surface.** The configurator is the substantive expression
  of a session service's detail page. Demanding additional long-form prose to
  gate the configurator inverts the priority — the page's reason for existing is
  the configurator, not the surrounding prose.
- **Forward-compatibility.** A second session-mode service may not have the same
  long-form copy depth available at launch. The launch-gate should accommodate
  the substance the service ships with.
- **Avoid placeholder discipline drift.** R2 would either delay the configurator
  (blocking on a separate stream that may not be ready) or invite a placeholder
  pattern that masquerades as coach-authored content. R1's placeholder shape is
  openly placeholder (the new `lead` carries a `Placeholder` prefix matching the
  convention competition-prep already ships) and is removed during the
  explanatory-content stream.
- **Asymmetry is honest.** The detail-page composition for session services
  _should_ look different from subscription services — the pricing model is
  different, the configuration surface is different, the booking flow is
  different. Documenting the asymmetry is more honest than papering over it.
- **Predicate-modify over data-populate.** R1 has two viable variants: (a)
  modify the predicate so only `lead` is required on the session arm, leave
  `detailedFeatures` / `fitFor` / `faq` empty; (b) populate all four fields on
  Posing with placeholders. Variant (a) keeps the placeholder smuggling to one
  paragraph; variant (b) ships four arrays of placeholder prose to production.
  (a) is the closer match to the handover's "Erklär-Inhalt is separate
  Anforderung" intent and is the variant adopted here.

## Decision

### Launch-gate split

Refactor `hasCompleteDetailContent` into a discriminator-aware predicate. Both
arms are spelled out so subscription parity is explicit:

- **Subscription arm** — unchanged from today's predicate:
  - `lead` is a non-empty string,
  - `detailedFeatures.length >= 3`,
  - `fitFor.length >= 3`,
  - `faq.length >= 3`,
  - `pricing.length >= 1`.

  No clause is dropped. Every subscription service currently in the catalog
  satisfies the same predicate it satisfies today.

- **Session arm** — new contract:
  - `lead` is a non-empty string,
  - `packages.length === 6` (the 3 sizes × 2 durations matrix is fully
    populated),
  - `descriptions.length === 3` (one description per package size,
    duration-independent),
  - `recommendedPackageSize` is a member of
    `service.configuration.sessionCounts`.

  The session arm does **not** require `detailedFeatures` / `fitFor` / `faq`.
  The session arm does **not** require `pricing.length >= 1` in the launch-gate
  sense, because the configurator's `packages` carries the price data. The
  legacy single-tuple `pricing` field on `SessionService` remains on the data
  type (it backs the catalog card's "from €149 / session" copy per ADR-0047),
  but it is no longer a launch-gate input on the session arm.

The `ServiceWithCompleteDetailContent` narrowed type becomes a **discriminated
union** of arm-specific narrows:

```typescript
type ServiceWithCompleteDetailContent =
  | SubscriptionServiceWithCompleteDetailContent
  | SessionServiceWithCompleteDetailContent;
```

The subscription-arm narrow guarantees the four long-form fields (`lead`,
`detailedFeatures`, `fitFor`, `faq`) plus the existing `pricing` 3-tuple. The
session-arm narrow guarantees `lead`, `packages`, `descriptions`, and
`recommendedPackageSize`. Consumers branch on `pricingModel` to access
arm-specific fields; the type system enforces that a subscription-arm consumer
cannot accidentally read `service.packages`, and a session-arm consumer cannot
accidentally read `service.faq`.

### Detail-page composition split

The `/services/[slug]` route branches on `service.pricingModel`:

- **Subscription arm**: existing composition — Breadcrumb → Hero →
  `ServiceWhoIsFor` → `ServiceWhatsIncluded` → `ProcessSteps` →
  `ServiceSocialProof` → `Accordion` → `ServicePricingBlock`. No change from
  today.
- **Session arm**: Breadcrumb → Hero → `ProcessSteps` → `ServiceSocialProof`
  (renders null on empty `testimonialIds`) → `PosingConfigurator`. The
  composition omits `ServiceWhoIsFor` (requires `fitFor`),
  `ServiceWhatsIncluded` (requires `detailedFeatures`), and `Accordion`
  (requires `faq`) because the session-arm narrow does not guarantee those
  fields. The graceful- empty-state behaviour the existing components already
  have (`ServiceSocialProof` renders null on empty `testimonialIds`) is
  preserved.

The composition split is encapsulated in the page route, not pushed down into
the section components. Each section component continues to demand the narrowed
type it requires (the long-form section components tighten their `Props` types
to `SubscriptionServiceWithCompleteDetailContent` so the page can no longer
accidentally route a session-arm service into them); the page is the only place
that knows about the discriminator.

### Configurator-replaces-pricing-block contract

For session-mode services, the configurator block replaces `ServicePricingBlock`
1:1. The configurator owns its own section header (`Choose your package`), its
own section background (`sectionBackground.default`, matching
`ServicePricingBlock`), its own heading-id contract
(`posing-configurator-${service.id}`), and its own CTA strategy (per-card CTAs
emitting `?service=…&duration=…&package=…` URL params, not a single embedded
primary CTA + inline quiz trigger).

The contract is **owner-replacement**, not **wrapper-extension**:
`PosingConfigurator` is not a special render-mode of `ServicePricingBlock`; the
two are sibling section components with disjoint responsibilities.

### Configurator → contact-form URL contract and ADR-0021 carve-out

The configurator's per-card CTA emits
`?service=posing&duration=<30|60>&package=<1|5|10>`. The contact form's existing
script reads these parameters in a new branch that runs **outside**
`resolveQuizAnswers` — the configurator branch writes the prefill text directly
to the message textarea and injects three hidden inputs (`config-duration`,
`config-package`, `config-price`) using the same
`document.createElement('input')`

- `form.appendChild` pattern the existing `quiz-*` injection uses (empirically
  validated in production per the catalog → contact flow since the quiz feature
  merged).

ADR-0021's documented priority — sessionStorage wins over URL parameters — is
**preserved unchanged**. The configurator branch does not modify the
`resolveQuizAnswers` merge logic. The owner-decided "configurator silently
overrides quiz" behaviour (Q10) is implemented as a UI-side suppression: when
configurator-shaped URL parameters are present, the existing quiz-summary card
render gate (`isFromQuiz` at `ContactForm.astro:250`) is extended to also
short-circuit on a `data-from-configurator` form attribute the configurator
branch sets. The merge priority is invariant; the visible summary surface
chooses one of the two contexts to display. See ADR-0021 under § References.

### What does NOT change

- The catalog-page treatment (ADR-0047) is unchanged. Posing's card still shows
  the pill, the from-price, the micro-copy line.
- The discriminated union itself is unchanged in shape. `SessionService` gains
  optional `packages`, `descriptions`, and `recommendedPackageSize` fields; the
  session-arm narrow tightens them. No existing field is removed or renamed.
  `configuration.sessionCounts` and `configuration.durations` are tightened from
  `readonly number[]` to `readonly PackageSize[]` / `readonly DurationMinutes[]`
  so the catalog's existing reader and the configurator's new reader share the
  same literal-type source.
- `ServicePricingBlock` is unchanged. It continues to render for subscription
  services exactly as today.
- The contact form's URL-param reader for `?service=` is extended additively.
  The existing reader keeps working; new `?duration=` and `?package=` params are
  read only when `?service=posing` (or a future session service) is also
  present.

### Scope and non-goals

**In scope:**

- The `hasCompleteDetailContent` predicate split and the
  `ServiceWithCompleteDetailContent` union narrow.
- The page-route composition branch.
- The configurator section components (`PosingConfigurator`, `PackageCard`) and
  helper module (`posingPricing`).
- The contact-form-script extension for URL-param surfacing and hidden Netlify
  fields.
- The tightening of `configuration.sessionCounts` / `configuration.durations` to
  literal-typed arrays so the configurator's emit site and the contact form's
  read site share one source of literal truth.
- The Props-type tightening on `ServiceWhoIsFor`, `ServiceWhatsIncluded`, and
  `Accordion`-consuming sites from `ServiceWithCompleteDetailContent` to
  `SubscriptionServiceWithCompleteDetailContent`, matching the composition-split
  reality.

**Out of scope:**

- The explanatory content above the configurator (a Posing service detail-page
  anforderung not yet scoped — the single `Placeholder lead — …` paragraph ships
  with the configurator PR and gets replaced by the coach-authored stream).
- Cross-sell to Competition Prep below the configurator (separate anforderung).
- A `SessionPackageConfigurator` generalisation. The configurator ships as
  `PosingConfigurator` against the present concrete instance.
- Stripe direct-checkout (ADR-0043's interim contact-routing remains in force).

## Consequences

### Positive

- The configurator can ship without waiting for the explanatory- content stream.
- The detail-page composition stays substance-led for both service variants —
  long-form prose for subscription services, configurator for session services.
- Future session services adopt a documented contract: extend `packages`,
  populate `lead` (placeholder or final), replace `ServicePricingBlock` with the
  configurator.
- The launch-gate split is type-safe at the boundary. The discriminated union
  narrow keeps subscription-arm consumers' guarantees on `detailedFeatures` /
  `fitFor` / `faq`, and the new session-arm consumers (configurator + card) get
  their own arity guarantees on `packages` / `descriptions` /
  `recommendedPackageSize`. A subscription-arm consumer accidentally reading
  `service.packages` fails to compile; a session-arm consumer accidentally
  reading `service.faq` fails to compile.

### Negative

- The predicate split adds branching to `hasCompleteDetailContent` and to the
  page route. The branching is small but real, and future contributors must
  understand both arms.
- The detail-page composition for session services is _shorter_ than for
  subscription services. Without explanatory content, the Posing page reads as
  "Hero + configurator + supporting sections" until the explanatory-content
  stream lands. The placeholder `lead` paragraph is grep-discoverable and
  Pending-Work-tracked so the gap is openly visible rather than silently
  shipped.
- The "configurator-replaces-pricing-block" rule means a future change to the
  pricing-block surface (e.g., a third pricing model) requires visiting both the
  configurator and the pricing block. Mitigated by the fact that both are
  sibling components — no shared base class means the changes can't accidentally
  couple.
- The Props-type tightening on the long-form section components shifts a type
  contract that has been stable. The shift matches the composition split's
  reality (the page route only routes session services to the configurator,
  never to `ServiceWhoIsFor`); the cost is a one-line type annotation per
  component, with no runtime change.

### Risk mitigation

- The placeholder copy for `lead` ships with a `Placeholder ` prefix matching
  the convention `src/data/services.ts` already uses on the `competition-prep`
  entry (lines 371, 374, 379, 384, 389–408). The prefix is unbracketed because
  that is the file-local convention; the bracketed `[PLACEHOLDER]` convention
  lives in `src/data/servicesMission.ts` (per `MissionBlock.astro:22-26` JSDoc)
  and is not used in `services.ts`. The within-file consistency rule keeps new
  placeholders aligned with their surroundings; CONVENTIONS.md documents the
  file-local nature so the cross-file inconsistency is intentional and visible
  to future maintainers. The Pending Work section in `docs/ARCHITECTURE.md` adds
  a launch-blocker note. A forgotten placeholder is a publicly visible failure,
  not a silent one.
- The configurator's reduce-on-symmetry temptation (re-introducing
  `ServiceWhoIsFor` to make the detail page "look more complete") is pre-empted
  in this ADR. Future contributors find this ADR via the configurator's JSDoc
  cross-reference.
- The launch-gate predicate split lives in a single place
  (`~/data/services.ts`). Drift between the page route's branching logic and the
  predicate's branching logic is type-error-detectable: the narrowed union only
  carries the arm-specific guarantees, so a consumer accessing
  `service.packages` on a subscription service fails to compile.

## Documentation Updates

Implementer should review each item below for relevance and update as needed.

**Updates required by this ADR:**

- `docs/ARCHITECTURE.md` → ADR Quick Reference entry for ADR-0051.
- `docs/ARCHITECTURE.md` → Page and Component Map: amend the `/services/[slug]`
  row's Key Components to include `PosingConfigurator` and `PackageCard`.
- `docs/ARCHITECTURE.md` → Data Flows: add the Configurator → Contact data flow
  alongside the existing Quiz → Contact flow (the configurator emits URL params;
  the contact form's new branch consumes them outside the `resolveQuizAnswers`
  merge).
- `docs/ARCHITECTURE.md` → Pending Work § Technical Debt: add a launch-blocker
  note for the Posing placeholder content (the `Placeholder lead — …`
  paragraph + the six placeholder prices) that must be replaced before launch.
- `docs/CONVENTIONS.md` → § Component Composition: one paragraph documenting
  that session-service detail pages compose `PosingConfigurator` in place of
  `ServicePricingBlock`, with a back-reference to this ADR.
- `docs/CONVENTIONS.md` → § Domain data (or the closest existing section on
  data-module conventions): one paragraph documenting the file-local nature of
  the `Placeholder` / `[PLACEHOLDER]` prefix conventions: `src/data/services.ts`
  uses unbracketed `Placeholder` (competition-prep precedent),
  `src/data/servicesMission.ts` uses bracketed `[PLACEHOLDER]`
  (`MissionBlock.astro` JSDoc); new placeholder strings in either file match
  that file's existing convention.
- `docs/adr/0047-session-based-service-treatment.md` → append a one- line
  forward reference under § References: "Detail-page treatment is documented in
  ADR-0051." Status stays `Accepted`; this ADR refines, not supersedes.
- JSDoc on `hasCompleteDetailContent` (the function itself, `services.ts:801`) —
  expanded to document the per-discriminator arms; each arm's clauses listed.
- JSDoc on the new components (`PosingConfigurator.astro`, `PackageCard.astro`)
  — cross-reference this ADR in the existing-component-pattern style.
- `CLAUDE.md` → no expected change. No Critical Rules amended.

If an expected location does not exist, the implementer documents that and
proceeds; do not invent sections to satisfy this list.

## References

- [ADR-0047](0047-session-based-service-treatment.md) — Session-Based Service
  Treatment (catalog-page side); this ADR documents the detail-page side of the
  same line of work.
- [ADR-0017](0017-domain-data-integrity-pattern.md) —
  `as const satisfies Record<>` invariant the `packages` extension preserves.
- [ADR-0020](0020-client-side-script-strategy-revised.md) — Module `<script>` is
  the default. The contact-form-script extension is an additive branch inside
  the existing module script; no new script files added.
- [ADR-0021](0021-session-storage-quiz-persistence.md) — sessionStorage
  > URL params priority. The configurator branch runs _outside_
  > `resolveQuizAnswers` so this priority is preserved; the Q10 silent- override
  > (configurator > quiz for the visible summary surface) is implemented as a
  > UI-side suppression of the quiz-summary card, not as a change to the merge
  > logic.
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) — Extract-first
  composition; justifies `PosingConfigurator` and `PackageCard` as separate
  components.
- [ADR-0037](0037-adopt-astro-container-api-for-component-tests.md) — Astro
  Container API testing pattern; the configurator's tests follow it verbatim.
- [ADR-0038](0038-dynamic-detail-route-pattern.md) — Dynamic detail route
  pattern; the launch-gate split refines the helper-and-re- export shape this
  ADR established for `/services/[slug]`.
- [ADR-0043](0043-servicecard-interim-contact-routing-pre-stripe.md) — Interim
  contact-routing; the configurator's per-card CTAs follow this routing
  contract.
- [Concept](../../.claude/work/2026-05-14-posing-configurator/02-concept.md) —
  Phase-2 concept document this ADR ships with (worktree-local, not on main).
