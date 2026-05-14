# Mission-Driven Coach Presentation on the Services Page

Date: 2026-05-14

## ADR Warrant Check

- [x] **A — Contract**: Establishes how coaches are presented on the Services
      overview page (mission-driven framing, no specialisation labels, photos
      over abstract representations, no per-coach metrics). Future coach
      additions and page changes must honour this framing.
- [x] **B — Asymmetry**: Sets a deliberate asymmetry against the conventional
      coach-card pattern used elsewhere in the project (credential lines,
      achievement lists, specialisation labels). A future contributor or
      AI-assisted edit would likely "tidy" the Services-page coach trio back to
      a credential-display strip without this ADR explaining why.
- [x] **C — External revisit**: A change in the brand's mission statement, a
      fourth coach joining the team, or a shift in the brand's target audience
      (for example, opening to male clients) reopens this decision.

## Status

Accepted

## Context

The Services overview page (`/services`) currently introduces the three coaches
through three separate elements sitting between the page hero and the category
filter:

1. A long-form intro paragraph passed via the `intro-primary` slot on
   `ServicesCatalog.astro`, naming Team 4 Pro as a team of three IFBB Pro
   coaches and gesturing at hormonal cycles, recovery, and the realities of
   training in a female body.
2. A horizontal coach strip rendering each coach as a `SmartImage` (currently
   pointing at a `placehold.co` photo placeholder), their `firstName`, and a
   compact `credentialLine` ("IFBB Pro · Prep & Peak Week" / "IFBB Pro ·
   Physique & Lifestyle" / "IFBB Pro · Longevity & Masters").
3. A `<StatsGrid>` tile rendering "47+ Years Coaching / 57 Years Competing" with
   count-up animation and scale-up reveal.

A short transition line ("Find the service that fits where you are right now.")
is passed via the `intro-secondary` slot and sits between the stats tile and the
filter bar.

This presentation has several problems that have surfaced through review and
internal discussion.

The `credentialLine` specialisation labels do not function as a coach-selection
tool. Visitors do not pick their coach — the team matches clients to coaches
itself. The labels therefore communicate authority through credentials at a
level of specificity that is cryptic to visitors outside the IFBB ecosystem and
not differentiating to those inside it. They occupy visual real estate without
serving the visitor's decision-making, and they restate the credentials the hero
immediately above already claims ("Three IFBB Pros. One team. Coaching for every
goal.").

The current photo placeholders (`placehold.co` URLs producing a teal-filled
image with the coach's first name as white text) read as not-yet-real photos.
For a coaching brand built on personal trust and lived experience, a labelled
stand-in undercuts the very connection the page is trying to build. The eventual
swap to final coach photographs is a separate content task; the structural
framing established here has to anticipate that swap.

Most importantly, the current presentation does not communicate the actual
mission of Team 4 Pro. The team exists because the three coaches have direct,
lived experience — both as athletes and as women — with what happens when women
receive coaching designed for men's bodies. This includes both positive
experiences (decades on competitive stages, mentoring athletes through long
careers) and negative ones (lasting health consequences from male-coach
recommendations, losses in the community). The brand position "Coaching for
women, by women" emerges from this experience, not from a marketing calculation.
The current page treats the coaches as a credential block and the mission as an
unspoken assumption buried in the intro paragraph. The opposite is closer to the
truth: the mission is the foundation, and the coaches are the people who carry
it.

A secondary problem is coach-experience asymmetry. Helle has decades of
experience including Olympia-level coaching. Gina brings deep structural
expertise informed in part by personal experience with poor coaching. Irene is
earlier in her coaching career. A presentation that emphasised individual
performance metrics or coaching achievements would expose this asymmetry as a
visible hierarchy, which would (a) be unfair to Irene, (b) undermine the
coach-matching model by encouraging visitors to develop preferences, and (c)
fragment what should be a team identity. A mission-driven framing dissolves this
problem: the three coaches represent different paths to the same mission, not
different tiers of capability.

A prior attempt (the paused stream `coach-strip-team-trust-line`, worktree
dropped) tried to layer a "Coaching for women, by women" trust line _above_ the
existing coach strip and drop the `credentialLine` from the call site at the
coach level. The owner judged the result "wirkt nicht gut" — the trust line sat
adjacent to the long intro paragraph and competed with it instead of subsuming
it. This ADR is the architectural answer to that observation: consolidate the
intro paragraph, the coach strip, and the stats into one coherent mission block,
rather than juxtapose a trust line against the existing structure.

### Decision drivers

- **Mission over credentials.** The mission ("Coaching for women, by women") is
  the strongest differentiating claim the brand has. It should anchor the page,
  not be implied.
- **Team identity over individual hierarchy.** The three coaches are presented
  as complementary, not comparable. No individual metrics, no implicit ranking.
- **Lived experience as authority.** The coaches' authority comes from what they
  have lived through as athletes and as women, not solely from formal IFBB Pro
  credentials (which the hero already establishes).
- **Positive framing.** The mission is communicated through what the coaches
  bring, not through criticism of male coaches. The coaches prefer this tone,
  and it is more inviting to the visitor.
- **Mobile-aware structural choices.** The block sits in the scroll path before
  the service cards. Detailed mobile-layout decisions belong to a future
  layout-refinements work item, but the structural choices made here (photo
  layout, mission-statement length, stats integration) are made with mobile
  presentation in mind.

### Evaluated approaches

1. **Status quo (intro paragraph + coach strip with `credentialLine` +
   `StatsGrid` tile).** Rejected. Communicates credentials redundantly with the
   hero, occupies significant scroll space, fails to carry the mission, and
   treats the coaches as interchangeable credential tiles rather than as people.
2. **Authority via credentials.** Keep the credential framing but improve it
   with stronger styling and clearer specialisation copy. Rejected. "Three IFBB
   Pros" is already in the hero; restating credentials in the coach block is
   volume without value. Does not address the mission problem.
3. **Authority via results.** Lead with coaching achievements, placements, named
   athletes. Rejected. Exposes the coach-experience asymmetry as a visible
   hierarchy. Fragile to the realities of a small team where not all coaches
   have equivalent metrics. Treats the page as a sales sheet rather than a brand
   statement.
4. **Authority via mission and story (mission block).** **Chosen.** Consolidate
   the intro paragraph, the coach strip, and the stats tile into a single
   mission-driven block. Lead with a mission statement, present the three
   coaches as carriers of that mission with photos and a single
   mission-connected sentence each, integrate the stats as a quiet supporting
   beat, and keep the existing transition line as the bridge to the filter.
   Resolves the credential-redundancy issue, the coach-asymmetry issue, and the
   mission-visibility issue simultaneously.

## Decision

The Services page introduces a consolidated **mission block** that replaces the
current sequence of (intro paragraph) + (coach strip with `credentialLine`) +
(stats tile). The block sits in the same vertical position as the existing three
elements but reads as one coherent section.

The block contains four elements, in this order.

**Element 1 — Mission statement.** A heading and a short paragraph (two to three
sentences) that name the mission directly. The heading ships as the working
placeholder "Coaching for women, by women." The paragraph communicates (a) that
women's bodies have different needs than men's (hormonal cycles, recovery
patterns, life phases), (b) that the three coaches have lived this themselves as
athletes and as women, and (c) that this is why Team 4 Pro works exclusively
with women. The tone is warm and confident, not adversarial toward male coaches.
Specific incidents (for example, health damage from poor coaching) are not named
on the overview page; they may surface on coach detail pages if the coach
chooses to share them.

**Element 2 — The three coaches as carriers of the mission.** Three coaches
presented side-by-side on desktop, each with a photograph (currently a
`placehold.co` placeholder rendered via `SmartImage` — final coach photos are a
separate content task), the coach's first name, and a single sentence that
connects the coach to the mission. No `credentialLine` rendering, no
specialisation labels, no IFBB Pro restatement, no individual achievements or
metrics.

The mini-sentence direction per coach:

- **Helle** — long experience as athlete and coach; what she has seen and
  learned across decades.
- **Gina** — the structural perspective; care informed by knowing what wrong
  coaching can cost.
- **Irene** — the closer-to-current-experience perspective; what she brings to
  women earlier in their journey.

Exact mini-sentence copy ships as `[PLACEHOLDER]`-prefixed strings until the
coaches review and finalise. The placeholder prefix is visible in the rendered
DOM by design — a forgotten placeholder in production is a publicly visible
failure rather than a silent one.

**Element 3 — Stats as supporting beat.** The existing "47+ Years Coaching / 57
Years Competing" remains as quantitative support for the qualitative mission
claim, but it is rendered as **inline body text** integrated into the block's
narrative arc, not as a framed `StatsGrid` tile. The two stat values continue to
read from `~/data/stats` (`statsSection.stats.yearsCoaching.target` and
`yearsCompeting.target`), preserving the single-source-of-truth chain to
`~/data/coaches.ts` per ADR-0017. The count-up animation and the scale-up reveal
that `StatsGrid` provides are deliberately dropped on this surface; the
trade-off is documented under "Consequences → Negative" and "Risk mitigation".

The `StatsGrid` component itself stays in the codebase — it has four other
consumers (homepage, `/coaches` hero, success-story hero, success-story results
grid). Only the Services-page call site is removed.

**Element 4 — Transition to filter.** The existing line "Find the service that
fits where you are right now." is **kept verbatim**. The filter pills ("All /
Bodybuilding / Athletic / Wellness") are the only visible cue between the
mission block and the category grids otherwise; the filter bar carries an
`aria-label="Filter services by goal"` for screen readers, but that is invisible
to sighted visitors. The transition line therefore continues to do real bridge
work that the pills alone do not — it confirms the visitor's next step in
visible body text.

The physical home of the line moves from the page's `intro-secondary` slot into
the new mission block component as an internal string constant. The
`intro-secondary` slot contract on `ServicesCatalog.astro` is dropped along with
`intro-primary` — both slots lose their consumer once the mission block owns its
own copy.

### Implementation shape

The mission block is implemented as a new typed Astro section component
`src/components/sections/services/MissionBlock.astro` under the existing
`sections/services/` folder, following the extract-first default of ADR-0034.
The component owns its copy (mission heading, mission paragraph, three coach
mini-sentences keyed by `CoachId` via
`as const satisfies Record<CoachId, string>` per ADR-0017, inline stats
sentence, transition line). It has no slot surface — all copy is internal — so
the render-and-trim rule of ADR-0036 is inapplicable to this component.

`ServicesCatalog.astro` is edited to render `<MissionBlock />` at the position
formerly occupied by the intro slots, the coach `<ul>`, and the `<StatsGrid>`
call. The two slot contracts (`intro-primary`, `intro-secondary`) on
`ServicesCatalog` are dropped — they have no remaining consumers.
`src/pages/services/index.astro` stops passing slot children to
`<ServicesCatalog>`.

The component renders inside the existing `<Section background="default">`
boundary in `ServicesCatalog.astro` — it is content inside a section, not a
section landmark of its own, per ADR-0039 Shape 2.

### What does NOT change

- The hero section ("Three IFBB Pros. One team. Coaching for every goal.") is
  unchanged. The relationship between hero positioning and the mission framing
  established here is tracked by the paused stream `service-hero-cta-revision`
  (no merged ADR exists yet for the hero — verified at the time of this ADR's
  authoring).
- The filter bar (All / Bodybuilding / Athletic / Wellness), its labelling, and
  its scroll behaviour are unchanged.
- The pricing toggle and its scope caption, governed by
  [ADR-0047](0047-session-based-service-treatment.md) (session-based service
  treatment), are unchanged. The toggle's caption and the visual separation
  between filter and toggle remain as ADR-0047 defines them. A separate paused
  stream (`services-pricing-axis-concept`) explores deeper pricing-axis
  revisions; it is not a dependency of this ADR.
- The service cards in each category, the session-based Posing card treatment
  (ADR-0047), and the contact-routing of card CTAs (ADR-0043) are unchanged.
- The `credentialLine` field stays on the `CoachExpanded` type in
  `~/data/coaches.ts` because two other consumers
  (`SuccessStoryCoachCard.astro`, `SuccessStoryHero.astro`) still render it.
  Only the Services-overview rendering of `credentialLine` is removed.
- The transition line copy ("Find the service that fits where you are right
  now.") is unchanged in wording; only its physical home moves from the
  page-level `intro-secondary` slot into `MissionBlock.astro` as an internal
  string constant.
- The `StatsGrid` component is not removed. Four other consumers exist and are
  out of scope here.
- Coach detail pages and any individual achievements that may live there are out
  of scope. Olympia-level coaching credit and similar individual achievements
  stay off the overview-page mission block; they may surface elsewhere if and
  when coach detail pages are designed.

### Scope and non-goals

**In scope:**

- Consolidation of the intro paragraph, coach strip, and stats tile into one
  mission block on the Services overview page.
- Mission-statement placement, structure, and placeholder copy.
- Coach presentation format (photo, first name, single mission-connected
  sentence; no specialisation labels).
- Integration of the stats element as inline body text within the block,
  dropping the `StatsGrid` call at this site.
- Retention of the transition line ("Find the service that fits where you are
  right now.") in the mission block as Element 4, with its physical home moved
  into `MissionBlock.astro`.
- Drop of the `intro-primary` and `intro-secondary` slot contracts on
  `ServicesCatalog.astro`.

**Out of scope:**

- Hero-section copy or positioning — paused stream `service-hero-cta-revision`.
- Pricing-toggle revisions and pricing-axis rework — paused stream
  `services-pricing-axis-concept`.
- Mobile-specific pixel-level layout optimisations beyond the structural choices
  made here (a future layout-refinements work item).
- Coach detail pages and any individual achievements that may live there.
- Wellness-section copy revisions (related but separate; see Open Items below).
- An "Athletes we've coached" or social-proof block elsewhere on the site
  (separate future decision).
- The photo-replacement workflow (final coach photos are coach-supplied content
  not yet available; the structural framing here anticipates the swap).
- Final coach-reviewed mission and mini-sentence copy. The PR ships with
  `[PLACEHOLDER]`-prefixed strings; the final-copy commit is a decoupled
  follow-up.

## Consequences

### Positive

- The mission becomes visible as the brand's foundation, not buried in an intro
  paragraph.
- The coach-experience asymmetry stops being a structural problem. The three
  coaches are presented as complementary carriers of the mission, not as ranked
  credential tiers.
- The page communicates personal trust and lived experience more strongly
  through photos and mission-connected sentences than through generic
  credentials.
- The block consolidates three currently-separate elements into one coherent
  reading unit, which on most layouts uses scroll space more effectively.
- The pattern is extensible. A fourth coach joining the team is accommodated by
  adding one entry to `coachesById` and one entry to the mission-sentences
  record inside `MissionBlock.astro`; the compile-time
  `as const satisfies Record<CoachId, string>` guard catches a forgotten entry.
- The extracted `MissionBlock.astro` component is its own typed test surface,
  separate from `servicesCatalog.test.ts`, so regressions in the coach trio are
  caught in `missionBlock.test.ts`.

### Negative

- The mission block depends entirely on copy quality. A weak mission statement
  or weak coach mini-sentences will collapse the block's effect. The current
  intro-paragraph-plus-credential-strip is uninspired but at least neutral; the
  new block fails harder if the copy fails.
- Coach photos must be available at consistent quality. Inconsistent or
  low-quality photos will weaken the block more visibly than the current
  `placehold.co` placeholders do — the placeholders are visibly placeholders,
  whereas weak final photos look intentional.
- Removing the `credentialLine` specialisation labels removes a small piece of
  information that a visitor familiar with IFBB categories might have used to
  orient. This is judged a fair trade given the labels were not functioning as a
  selection tool, but the loss is real.
- The mission framing implicitly defines the brand's audience as women. This is
  intentional and aligns with the actual brand position, but it is an explicit
  choice this ADR makes load-bearing.
- The decision to render stats as inline body text drops the count-up animation
  and the scale-up reveal that `StatsGrid` provides. The mission block loses the
  only kinetic beat the intro area currently carries. The trade is deliberate
  (see "Mission over credentials" and "Team identity" decision drivers — the
  stats are supporting beat, not the headline), but a real visual energy is
  lost.
- The PR ships with placeholder copy. The `[PLACEHOLDER]` prefix is visible in
  the production DOM until the final-copy commit lands. This is a deliberate
  choice (a publicly visible placeholder fails loud, whereas a silent
  placeholder ships unnoticed), but it does mean any production-visible state
  between the structural PR's merge and the final-copy commit's merge carries
  the prefix.

### Risk mitigation

- Placeholder copy is shipped with a JSDoc content brief on `MissionBlock.astro`
  so the coaches and the owner have a working starting point rather than a blank
  page. Final copy must still be coach-reviewed; the cadence is decoupled from
  this PR's lifecycle (a separate commit/PR carries final copy).
- Photos remain `placehold.co` placeholders for now; the swap-in for final
  photos is a one-line edit per coach in `~/data/coaches.ts`. The structural
  framing of the mission block anticipates this swap without further
  architectural change.
- The block structure is reversible. If the mission framing proves ineffective
  in practice, returning to a credential-driven layout is a
  copy-and-component-level change, not a structural rebuild. The
  `credentialLine` field stays on the type.
- The drop of the count-up animation is reversible. If the loss of kinetic beat
  is judged unacceptable post-launch, restoring a visually muted `<StatsGrid>`
  call inside `MissionBlock.astro` is a localised edit. The component is still
  in the codebase.
- The placeholder-copy lifecycle is protected by two layers, not three: (1) the
  `[PLACEHOLDER]` prefix is literally visible in the rendered DOM, so a
  forgotten placeholder is a publicly visible failure rather than a silent one;
  (2) the owner's promote-to-production workflow inspects the Netlify Deploy
  Preview and a production-build smoke check before merge. No component-level
  test asserts placeholder presence — encoding a lifecycle phase into a
  permanent test surface produces an inversion-coupled assertion future
  contributors will silently remove. A pre-push `check:placeholder-strings`
  sensor script (ADR-0050 `check-*` prefix pattern) is a viable future
  alternative if the placeholder lifecycle proves error-prone in practice; it is
  captured in Open Items rather than implemented pre-emptively.

## Success criteria

This is a brand-positioning change, not a measurable performance optimisation.
There are no numeric thresholds that define success. The qualitative criteria:

- The mission ("Coaching for women, by women") is visible to a visitor scrolling
  past the hero, without requiring them to read a paragraph to decode it.
- The three coaches read as complementary team members, not as ranked options.
- The block reads as one coherent section, not as three stacked widgets.
- Coach review of the mission statement and mini-sentences produces refinements
  but not structural objections.

## Open Items

- **Wellness-section framing follow-up.** The mission framing on the overview
  page raises the question of how the Wellness section is positioned to women
  who do not compete. This is a related but separate decision that this ADR does
  not pre-empt. The Orchestrator is tracking it as a follow-up in project
  memory; a future ADR or scope may revisit Wellness framing once the mission
  block is in production and reading-experience evidence accumulates.
- **Conversion-specialist consult against the live preview.** The Phase-1 +
  Phase-2 consultation that produced this ADR and its concept was UX-focused; a
  conversion-specialist consultation against the Netlify Deploy Preview is
  allowed as an optional post-Phase-3 step but is not gated on this PR.
- **Final coach-reviewed copy.** The PR carries `[PLACEHOLDER]`-prefixed strings
  for the mission heading, the mission paragraph, and the three coach
  mini-sentences. Final copy lands in a decoupled follow-up commit / PR; the
  cadence is owner-driven and not tied to this PR's lifecycle.
- **Pre-push `check:placeholder-strings` sensor (deferred alternative).** A
  sensor script following the ADR-0050 `check-*` prefix pattern could grep
  `src/**/*.astro` for the substring `[PLACEHOLDER]` and fail in the pre-push
  hook if any match exists. This was considered during concept review as an
  alternative to a component-level test assertion. The owner picked
  drop-the-test-assertion-entirely over substitute-with-a- sensor; the sensor
  remains a viable future option if the placeholder lifecycle proves error-prone
  in practice. Captured here so the option is discoverable the next time a
  placeholder-lifecycle question arises.

## Documentation Updates

**Updates required by this ADR:**

- [`docs/ARCHITECTURE.md#adr-quick-reference`](../ARCHITECTURE.md#adr-quick-reference)
  — add a row for ADR-0051 between rows 0050 and the closing horizontal rule.
  - **Merge-order robustness note.** The paused `observations-harness` stream
    has commits 2-4 pending, one of which inserts an ADR-0049 row at a different
    position in the same table. If `observations-harness` merges first, the
    ADR-0049 row already exists when this ADR's row is added; this ADR's row
    still goes below ADR-0050 with no positional change. If this stream merges
    first, `observations-harness` will see a non-conflicting addition at a
    different table position. Either merge order produces an additive,
    non-overlapping diff on the Quick Reference table.

**Verified not required:**

- `docs/CONVENTIONS.md` — coach presentation is not a current convention domain.
  The mission-driven framing is a page-specific brand decision captured fully
  here; it does not create a recurring code-writing surface that contributors
  need to discover task-first.
- `docs/CONVENTIONS.md#topic-hub-index` — no new task surface.
- `CLAUDE.md` — no Critical Rule change, no Quick Reference rule change.
- `docs/AGENTS.md` — no phase-flow or agent-responsibility change.
- `CONTRIBUTING.md` — no commit/branch/PR workflow change.
- ADRs cross-referenced from this one
  ([ADR-0010](0010-smart-image-image-source.md),
  [ADR-0017](0017-domain-data-integrity-pattern.md),
  [ADR-0034](0034-extract-first-for-ai-assisted-development.md),
  [ADR-0036](0036-content-aware-slot-detection-in-forwarded-slots.md),
  [ADR-0039](0039-section-wrapper-as-adr-0014-adoption-boundary.md),
  [ADR-0047](0047-session-based-service-treatment.md)) — their bodies and Status
  lines are unchanged. This ADR is a new contract for a new surface; it does not
  supersede any prior ADR.

## References

- [ADR-0010 — SmartImage and ImageSource discriminated union](0010-smart-image-image-source.md)
  — the coach photos render via `SmartImage`.
- [ADR-0017 — Domain data integrity pattern](0017-domain-data-integrity-pattern.md)
  — `as const satisfies Record<CoachId, string>` for the coach mini-sentences
  inside `MissionBlock.astro`.
- [ADR-0034 — Extract-first for AI-assisted development](0034-extract-first-for-ai-assisted-development.md)
  — the rationale for extracting `MissionBlock.astro` rather than inlining the
  markup inside `ServicesCatalog.astro`.
- [ADR-0036 — Content-aware slot detection in forwarded slots](0036-content-aware-slot-detection-in-forwarded-slots.md)
  — inapplicable to `MissionBlock.astro` (no slots) but referenced to make the
  inapplicability explicit; the drop of the `intro-primary` / `intro-secondary`
  slot contracts on `ServicesCatalog.astro` removes the only places these reads
  existed on this surface.
- [ADR-0039 — `<Section>` wrapper as ADR-0014 adoption boundary](0039-section-wrapper-as-adr-0014-adoption-boundary.md)
  — `MissionBlock` renders inside the existing `<Section background="default">`
  in `ServicesCatalog.astro`; it is content inside a section, not a section
  landmark of its own (Shape 2).
- [ADR-0047 — Session-based service treatment](0047-session-based-service-treatment.md)
  — adjacent surface on the same page; the pricing-toggle scope caption it
  introduces sits below this mission block and is unaffected here.
