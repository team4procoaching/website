# Requirements: Success-Story Detail Page — Narrative Rhythm Background Cycle

**Task ID:** 2026-04-24-success-story-detail-rhythm **Date:** 2026-04-24
**Type:** Feature **Status:** Approved — 2026-04-24

## Goal

The success-story detail page (`/success-stories/[slug]`) gains a deliberate,
twelve-row background rhythm that follows the story's dramaturgy — neutral
entry, alternating breath/problem phases through the narrative middle with a
`muted` marker at the turning-point, a `charcoal` beat at the final CTA, and a
neutral exit. The result grid stays on `default` per the StatsGrid component's
dark-background constraint (see Amendment 2026-04-24). Every section background
on the page is driven by the `sectionBackground[...]` token map from
`src/styles/sectionStyles.ts`; no hardcoded `bg-background` class strings remain
on the page or on the two sub-components that participate in the rhythm. This
brings the detail page into structural conformance with ADR-0014 and gives it
visual parity with the homepage's use of the six-variant section-background
system, without cloning the homepage rhythm.

## Motivation

1. **Narrative pacing.** The detail page is a 2000+-word long-form story. Ten of
   its twelve blocks currently share the same `default` background, so the
   natural dramaturgical beats read flat. The decided rhythm (Option B as
   amended after concept-review — "narrative crescendo, constraint-aware") gives
   the story a visible light-mode rhythm with a `muted` marker at the narrative
   turning-point and a `charcoal` beat at the final CTA. The result grid stays
   on `default` in deference to the StatsGrid component's documented
   dark-background constraint.
2. **Pattern conformance with ADR-0014.** Four blocks on the page and one
   sub-component hero hardcode `bg-background dark:bg-background-dark` instead
   of going through `sectionBackground[...]`. This is debt against ADR-0014 and
   blocks any future background changes on those blocks from being made through
   the token system.
3. **Hero token-conformance for ADR-0014.** `SuccessStoryHero` currently
   hardcodes `bg-background dark:bg-background-dark` on its outer `<section>` —
   ADR-0014 debt that should be resolved through the token map rather than
   another hardcoded class pair. Adding an optional
   `background?: SectionBackground` prop (default `'default'`) aligns the hero
   with every other section component on the site; the current call site passes
   no prop and renders identically. `SuccessStoryResultsGrid` is left
   structurally unchanged — it is a thin wrapper around `Content` and inherits
   Content's `default` background automatically, so row 7 on `default` needs no
   plumbing (see Amendment 2026-04-24). A JSDoc tripwire on the inner
   `<Content>` invocation makes that implicit contract explicit (see Amendment
   2).

The design decision (Option B, the rhythm below) was closed in Stage-A
design-sparring with the project owner. This phase scopes the implementation
surface, not the design.

## Scope

### Decided rhythm (Option B — "narrative crescendo")

Every row corresponds to an existing block on
`src/pages/success-stories/[slug].astro`. Numbering matches the frontmatter
comment block in that file.

| #   | Block (source)                                     | Background | Rationale                                                                                                               |
| --- | -------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | `SuccessStoryHero`                                 | `default`  | Neutral entry — Before/After images are the star                                                                        |
| 2   | `Content` "Where I started"                        | `muted`    | Problem phase sets itself apart                                                                                         |
| 3   | `<aside>` mid pull-quote                           | `default`  | Breath before the search movement                                                                                       |
| 4   | `Content` "What I was looking for"                 | `muted`    | Search movement paired visually with (2)                                                                                |
| 5   | `Content` "How we worked"                          | `default`  | Breath                                                                                                                  |
| 6   | `Content` "The moment it clicked" + progress image | `muted`    | Narrative climax — restrained                                                                                           |
| 7   | `SuccessStoryResultsGrid`                          | `default`  | Proof point on `default` — honours StatsGrid's documented dark-background constraint; renders via Content's own default |
| 8   | `<section>` reader pickup                          | `muted`    | Soft pause before the trust zone; relocates the unavoidable dead-transition to the CoachCard seam (8→9 `muted`→`muted`) |
| 9   | `SuccessStoryCoachCard`                            | `muted`    | Unchanged — component constraint (semi-transparent inner card)                                                          |
| 10  | `<aside>` final pull-quote (pastSelfMessage)       | `default`  | Deliberate calm before the finale                                                                                       |
| 11  | CTA band `<div>`                                   | `charcoal` | **Beat 2** — maximum contrast for the call                                                                              |
| 12  | `<section>` related stories                        | `default`  | Neutral exit                                                                                                            |

### Files in scope

All three files sit in `src/`. The Orchestrator will select corresponding paths
inside the worktree when implementing.

- `src/pages/success-stories/[slug].astro` — twelve-block composition; all
  hardcoded backgrounds converted to token-driven usage; the two affected
  sub-components receive the `background` prop per the table above.
- `src/components/sections/successStories/SuccessStoryHero.astro` — gains an
  optional `background?: SectionBackground` prop (default `'default'`), wired to
  the outer `<section>` through `sectionBackground[background]`; replaces the
  hardcoded `bg-background dark:bg-background-dark` class pair on that element.
  No other markup changes. The current call site passes no `background` and
  renders identically.
- `src/components/sections/successStories/SuccessStoryResultsGrid.astro` —
  **touched: JSDoc comment addition only (see Amendment 2).** The component's
  API, props, slots, and rendered markup are identical to today. Row 7 continues
  to render on `default` automatically via the inner `<Content>` invocation's
  existing default; no prop addition or forwarding is required (see Amendment
  2026-04-24). Amendment 2 adds a single JSDoc comment immediately above the
  inner `<Content>` invocation to pin that implicit default-propagation contract
  in place — a structural tripwire, not a behavioural change.

### Required conversions from hardcoded classes to tokens

Every hardcoded `bg-background dark:bg-background-dark` occurrence on or beneath
the detail page must be replaced with `sectionBackground[...]` — even the ones
that stay on `default`. This is ADR-0014 conformance, not a rhythm question;
otherwise the debt silently remains on anything that the rhythm does not move.

Currently there are five such occurrences (verified by grep):

- `src/pages/success-stories/[slug].astro` lines 98, 142, 166, 196 (pull-quote
  aside, reader-pickup section, final pull-quote aside, related-stories
  section).
- `src/components/sections/successStories/SuccessStoryHero.astro` line 52 (outer
  hero `<section>`).

The CTA band at `[slug].astro` line 181 already uses `sectionBackground.muted`
and will change to `sectionBackground.charcoal` per row 11 of the rhythm.

### Out-of-scope sub-components that the change does touch indirectly

- `src/components/sections/Content.astro` — already accepts `background`. No
  change.
- `src/components/sections/successStories/SuccessStoryCoachCard.astro` —
  **unchanged.** The inner aside uses `bg-foreground-950/5` (semi-transparent
  neutral) which does not render correctly on dark section backgrounds; the
  component's doc comment records this constraint. It stays on `muted` (row 9),
  so the constraint is not violated.

### Acceptance criteria

These are the sign-off conditions. Each is verifiable in review.

1. **Rhythm conformance.** On every detail-page slug that resolves via
   `getStaticPaths`, the twelve-row sequence above renders in order: rows 1, 3,
   5, 7, 10, 12 render on `default`; rows 2, 4, 6, 8, 9 render on `muted`; row
   11 renders on `charcoal`.
2. **No hardcoded `bg-background` class strings remain** on
   `src/pages/success-stories/[slug].astro`, `SuccessStoryHero.astro`, or
   `SuccessStoryResultsGrid.astro`. All section backgrounds resolve through
   `sectionBackground[...]`. (Verify via `grep -n 'bg-background'` on those
   three files after the change. The current count on these files is 5; the
   expected count after the change is 0.)
3. **Hero `background` prop wired and defaulted.** `SuccessStoryHero.astro`
   accepts `background?: SectionBackground` with `default = 'default'`. The
   detail page omits the prop at the call site; the hero renders identically to
   today.
4. **Results-grid renders on `default` via existing Content default.**
   `SuccessStoryResultsGrid.astro` is unchanged in behaviour by this task. Row 7
   renders on `default` because the component's inner `<Content>` invocation has
   no `background` prop and Content's own default is `'default'`. No prop
   addition, no forwarding. A JSDoc comment is added immediately above the inner
   `<Content>` invocation to pin this implicit default-propagation contract (see
   Amendment 2).
5. **Dark-mode: rhythm is a light-mode-only feature.** In dark mode, row 11
   (`charcoal`) falls back to `background-dark` per the existing variant map in
   `sectionStyles.ts`, rendering identically to the adjacent `default` rows. The
   rhythm itself is therefore a light-mode feature; dark mode reads as it does
   today. Accepted per the homepage pattern — the homepage treats dark-mode
   fallback as existing behaviour (see Amendment 2026-04-24 for the explicit
   owner decision).
6. **`prefers-reduced-motion` parity.** Every existing `data-animate` attribute
   on the page is preserved verbatim. No new motion is introduced by this change
   (backgrounds are static). The `ScrollAnimations`-mediated behaviour is
   unchanged.
7. **Accessibility semantics intact.** `aria-labelledby` targets, `aria-label`
   strings, and landmark structure (`article` / `section` / `aside` / `figure`)
   are unchanged. The only attribute-surface change is `class:list` on five
   elements, `variant="glass"` on one `<Cta>` invocation, new optional props on
   one component, and `background="muted"` props on three `<Content>`
   invocations.
8. **Critical Rules pass.** The change conforms to the CLAUDE.md Critical Rules
   relevant to this surface: routes continue to import from `~/data/routes`; all
   scripts on affected files (none on the page proper, none added) remain
   module-default per ADR-0020; the `SectionBackground` literal union continues
   to drive prop types (no stringly-typed fallbacks); named exports only in any
   utility touched (none touched); `readonly` on array Props where arrays appear
   (no new array Props introduced); `SmartImage` continues to wrap all
   non-decorative images (no image handling touched); render-and-trim per
   ADR-0036 for forwardable slots (no forwardable slot behaviour touched).
9. **Browser check on the existing detail story, both modes, both breakpoints.**
   Render `/success-stories/sarah-m` (the sole `hasDetailPage`-eligible entry in
   the current data module) in light and dark mode, at a desktop viewport and at
   a single-column mobile viewport. The five critical background transitions 2→3
   (muted→default), 6→7 (muted→default), 7→8 (default→muted), 10→11
   (default→charcoal, Beat), and 11→12 (charcoal→default) all read correctly
   without jarring seams. The 8→9 transition is unavoidably flat
   (`muted`→`muted`, imposed by the CoachCard component's dark-background
   constraint) and is expected — not a regression. Dark-mode fallback (row 11
   collapses onto `background-dark`) is acceptable per AC 5.

10. **CTA variant matches the charcoal surface.** On row 11, the inner `<Cta>`
    invocation specifies `variant="glass"` so the panel renders as
    `bg-white/10 ... inset-ring-white/20 backdrop-blur-sm` on the dark
    `charcoal` surface, per the Cta component's JSDoc contract (dark panel for
    light sections, glass panel for dark/coloured sections). No other `<Cta>`
    invocation in the codebase is touched.

## Non-Scope

Explicit exclusions, to keep the diff tight and prevent architect or implementer
scope-creep:

- **Homepage (`src/pages/index.astro`).** Not touched. The homepage's final CTA
  stays on `default`; the detail-page final CTA moves to `charcoal`. This
  cross-page inconsistency is accepted (see Open Questions for the owner's
  already-recorded rationale).
- **Success-stories overview page (`src/pages/success-stories/index.astro`).**
  Not touched. Its rhythm is a separate question.
- **`src/styles/sectionStyles.ts`.** No new variants. No changes to existing
  `sectionBackground` / `sectionHeadline` / `sectionText` entries. No new tokens
  in `@theme`. The existing six-variant system covers every row in the rhythm.
- **`SuccessStoryCoachCard.astro` internals.** Not modified. The component stays
  on its current `sectionBackground.muted` wrapper; its inner aside's
  semi-transparent neutrals are unchanged.
- **`SuccessStoryResultsGrid.astro` prop addition.** Prop addition is still out
  of scope. Only the JSDoc comment at the inner `<Content>` invocation is in
  scope (see Amendment 2). Row 7 on `default` is delivered by Content's existing
  default; no prop is introduced, no forwarding is added. If a future story
  needs a row-7 variation, the prop can be added in its own task (see Amendment
  2026-04-24).
- **Other `Content`-based pages.** No propagation of the rhythm pattern to
  `/coaches`, `/services`, `/how-it-works`, etc.
- **Related-stories grid internals.** `SuccessStoryGridCard.astro` is not
  touched; only the wrapping `<section>` at row 12 is converted from a hardcoded
  `bg-background` to `sectionBackground.default`.
- **New ADR.** Not written. If the architect judges one is needed in Phase 2
  (for example, if the hero-prop-symmetry rationale generalises to a new
  convention), they decide. The default position is "this is an application of
  ADR-0014, not a new decision."
- **CTA component.** `~/components/ui/CTA.astro` is not modified. On the row-11
  invocation only, `variant="glass"` is added (per AC 10) and the outer `<div>`
  wrapper changes its background token from `muted` to `charcoal`.
- **Related debt on background usage elsewhere in the app.** Any other
  `bg-background dark:bg-background-dark` hardcoded strings found by grep
  outside the three scoped files are out of scope for this task and go to the
  debt register if not already tracked.
- **Visual design changes beyond background colour.** Padding, typography,
  max-width, image treatment, button styles, and animation timing are all
  unchanged.
- **Tests.** No new unit tests are required by this change (no domain logic
  added; prop-defaulting is a trivial passthrough). The architect may choose in
  Phase 2 whether a snapshot or DOM-structure test is warranted; the default is
  no new test.

## Readiness Checklist

- [x] **Wording is final.** No user-facing text is changed by this task. The
      rhythm is a visual/structural change only; all copy — breadcrumbs,
      headlines, pull quotes, CTA labels, reader-pickup link text,
      related-stories heading — remains verbatim.
- [x] **Visual approach is decided.** The rhythm (Option B) was closed in
      Stage-A design-sparring with the owner. The existing six-variant
      `SectionBackground` system covers every row; no new variants or tokens are
      needed.
- [x] **All consumers are identified.** `SuccessStoryHero` and
      `SuccessStoryResultsGrid` are each consumed by exactly one file —
      `src/pages/success-stories/[slug].astro` — verified by grep. Adding
      optional, default-preserving `background` props to either component
      affects no other call site. `sectionBackground` from
      `src/styles/sectionStyles.ts` is already imported on the detail page (line
      50); no new imports required at that level.
- [x] **Conventions and patterns are checked.** Relevant references: - ADR-0014
      (Section Background System) — the pattern this task applies. - ADR-0034
      (Extract-First) — satisfied; the rhythm reuses the existing extracted
      components rather than inlining markup. - CONVENTIONS.md —
      `type Props = { ... }` with optional `readonly`-aware fields;
      default-via-destructure idiom; named exports; Biome/Prettier formatting. -
      CLAUDE.md Critical Rules 1–9 — none are newly engaged by this change (see
      acceptance criterion 8). No missing convention identified. The
      hero-prop-symmetry point (optional prop with a safe default) matches the
      established pattern in every other section component that already accepts
      `background`.
- [x] **Data model impact is clear.** No data-module changes. No type additions
      or renames in `~/data/successStories.ts` or elsewhere. The
      `SectionBackground` type is imported where needed. No cross- references
      across modules are renamed or removed.
- [x] **No open questions remain blocking implementation.** The one item in
      "Open Questions for the Project Owner" below is a decision recording, not
      a blocker — the owner has already accepted the trade-off and asked that it
      be documented rather than re-opened. A second, non-blocking item flags a
      test-coverage observation that the architect can resolve without owner
      input.

## Open Questions for the Project Owner

The following items are recorded per the Phase-1 discipline. All three were
resolved by the project owner on 2026-04-24 before Phase 2 kickoff; each item
carries a `Decision (2026-04-24)` entry below.

1. **Cross-page CTA-background inconsistency — already accepted, recording
   only.**
   - Context: The homepage's final CTA (`src/pages/index.astro:122`) sits on
     `default`. With this change, the detail-page CTA sits on `charcoal`. The
     two pages no longer share a CTA-band background.
   - Owner's recorded position (from Stage-A design-sparring): the difference is
     intentional — a 2000+-word long-form story needs more visual separation at
     the finale than a homepage run of cards does.
   - Ask: confirm that this trade-off should be recorded as a design decision
     (noted here) rather than opened as a design question in Phase 2. **Default
     assumption:** recorded, closed.
   - **Decision (2026-04-24):** recorded and closed. Not re-opened in Phase 2.

2. **Single detail-eligible story in the fixture data — acceptance criterion 9
   cannot strictly require "two stories" today.**
   - Context: Acceptance criterion from the task brief reads "test at minimum
     two stories, pick one with and one without `progressImage.caption`". The
     current dataset (`src/data/successStories.ts`) contains exactly one
     `hasDetailPage`-eligible story (`sarah-m`), and its `progressImage` does
     include a caption (line 292). There is no caption-less detail story to test
     against today.
   - Why relevant: the caption-less-vs-captioned rendering path lives in the
     existing `<figure>` at row 6 and is a pure markup toggle
     (`story.detail.progressImage.caption && ...`). This task does not touch
     that figure; it only changes the enclosing `Content` block's `background`
     to `muted`. No interaction between caption presence and the new background.
   - Options:
     - **(a) Relax the criterion** to "render one real story and one
       caption-less fixture story in dev (or Storybook-equivalent)" — i.e. the
       implementer adds a throwaway caption-less fixture locally for the browser
       check, does not commit it.
     - **(b) Defer the second-story browser check** to whenever the second real
       detail story lands in the data module — documented as a follow-up
       acceptance item, not a blocker for this PR.
     - **(c) Add a second detail-eligible story** (placeholder copy, no caption)
       as part of this task's data-module change. This would widen the scope
       beyond the three files named and needs owner approval.
   - **Recommended path (non-blocking):** (a) — the caption toggle is a trivial
     one-line conditional, unrelated to the background rhythm, and does not
     justify real-content effort. The architect may confirm and proceed in Phase
     2 without owner input unless the owner prefers otherwise.
   - **Decision (2026-04-24):** option (b) — defer the second-story browser
     check to whenever the next detail-eligible story lands in the data module.
     Acceptance criterion 9 has been reformulated above to reflect the
     single-story reality. No throwaway fixture is introduced; the
     caption-toggle markup at row 6 is unchanged by this task and does not need
     a dedicated browser check.

3. **Hero `background` prop — ship now, or wait until a second caller exists?**
   - Context: The task context explicitly calls out that the hero stays on
     `default` per the rhythm, and that the prop addition is "for symmetry and
     future flexibility" — marked "Optional — flag as a decision for the owner
     if you think it should wait."
   - Arguments for shipping now (included in Scope above):
     - Row 1's hardcoded `bg-background dark:bg-background-dark` at
       `SuccessStoryHero.astro:52` is ADR-0014 debt regardless of whether any
       caller passes `background` — the prop addition is the mechanism for
       fixing that debt through the token system rather than by adding a second
       hardcoded class pair.
     - Keeping symmetry with every other section component (they all accept
       `background`) reduces the onboarding-cost of this single outlier for any
       future maintainer.
     - The default `'default'` means zero behavioural change at the current call
       site; reviewer effort is minimal.
   - Arguments for waiting:
     - YAGNI: no second caller exists today.
     - The hero's outer `<section>` also owns
       `relative isolate overflow-hidden pt-14` — worth verifying that
       token-swap does not interact with the `isolate` stacking context (it
       should not; the stacking context is governed by `isolate`, not by
       background).
   - **Recommended path:** ship the prop now, because the ADR-0014-debt argument
     stands even without a second caller. The architect's Phase 2 plan should
     explicitly confirm the `isolate` / `overflow-hidden` interaction is a no-op
     after the class-list change.
   - **Decision (2026-04-24):** ship now. Architect to verify the `isolate` /
     `overflow-hidden` interaction as a no-op in the Phase-2 plan.

---

## Amendment 2026-04-24 — post-concept-review delta

After the Phase-2 concept-review flagged 2 Blockers and 3 Majors, the project
owner resolved them in four design decisions plus one mechanical follow-on. The
requirements are amended as follows:

1. **Rhythm rows 6–8 rearranged (Variant W).** The original row-7 on `teal`
   violated the StatsGrid component's documented dark-background constraint —
   StatsGrid's tile fill (`bg-foreground-950/5 dark:bg-white/5`) only reads on
   `default` / `muted`, and its number/label text is hardcoded in
   foreground-dark, which would collapse on a teal surface. The rhythm is
   re-spread so the only unavoidable dead-transition sits at the CoachCard seam
   (8→9 `muted`→`muted`):
   - Row 6 (Turning point): `muted` (unchanged; retains climax marker)
   - Row 7 (Results grid): `teal` → **`default`** (honours StatsGrid; consistent
     with the homepage's `Stats` section sitting on `muted`, not on a brand
     colour)
   - Row 8 (Reader pickup): `default` → **`muted`** (soft pause before the trust
     zone)

2. **CTA variant for the dark surface.** On row 11, the inner `<Cta>` invocation
   receives `variant="glass"` — the component's JSDoc specifies `glass` for
   dark/coloured section backgrounds and `dark` (default) for light sections.
   Without this, the dark-by-default Cta panel would visually collapse into the
   `charcoal` surface.

3. **Dark-mode rhythm explicitly accepted as light-mode-only.** In dark mode,
   row 11's `charcoal` falls back to `background-dark`, and the entire rhythm
   reads identically to today. Owner accepts this per the homepage precedent
   (which exhibits the same collapse).

4. **Commit plan split.** The page-level commit is split into 3a (token-map
   conversion of the four hardcoded `bg-background` sites on `[slug].astro`,
   value-preserving) and 3b (rhythm application: prop additions,
   `variant="glass"`, CTA wrapper token flip). Final split is the architect's
   call in the rework concept; 3a/3b is the baseline.

5. **ResultsGrid prop removed from scope.** Since row 7 on `default` already
   matches Content's default, the prop addition and forwarding originally scoped
   are no longer required. `SuccessStoryHero` still gains the prop
   (independently motivated by ADR-0014 debt at its own outer `<section>`).

These amendments are authoritative for Phase 3. The architect produces a revised
`02-concept.md`; the concept-reviewer then runs a second round.

---

## Amendment 2026-04-24 (second delta) — post-round-2-review Minor resolutions

The round-2 concept-review returned **Clean** (0 Blocker, 0 Major) with three
Minor findings. The project owner opted to resolve all three rather than defer,
consistent with the project philosophy of preferring typed/structural safeguards
over discipline-only mitigations. The requirements are amended as follows:

1. **Phrasing tightening (R2-M1 — concept-only).** The concept's Round-2 claim
   "only `class:list` and `background` props change" slightly overstated the
   row-8 situation: the reader-pickup `<p>` keeps its hardcoded
   `text-foreground-700 dark:text-gray-300` tokens when the wrapper flips to
   `muted`. Those tokens overlap with `sectionText[muted]`'s mapping
   (`text-foreground-700 dark:text-gray-400` at `sectionStyles.ts:56`) verbatim
   in light mode and differ by one step in dark mode (`gray-300` vs `gray-400`)
   — a pre-existing inconsistency, not introduced by this task. The revised
   concept names this explicitly as an intentional no-touch on text colours
   under Structural Health Check, and records the same observation under Notes
   for the Orchestrator for the next rhythm iteration. AC 7's attribute-surface
   statement is refined above to enumerate the exact attribute-level changes
   (`class:list`, `variant="glass"`, `background="muted"`, and the new hero
   prop) without claiming a broader invariant than the task actually delivers.

2. **CtaButton variant flip on row 11 (R2-M2 — concept-only).**
   `<Cta variant="glass">` also flips the inner `CtaButton variant` from
   `secondary` (white-outlined) to `primary` (accent-filled) at `CTA.astro:123`.
   This is pre-existing `Cta`-component behaviour, not introduced by this task,
   but it means the row-11 primary button visibly changes colour relative to
   every other CTA on the page. The revised concept records the flip under
   Structural Health Check → CTA surface contract, under Self-Critique (1), and
   adds an AC-9-level browser-check note so the row-11 button is expected
   (accent-filled, not white-outlined) rather than read as a regression. No new
   acceptance criterion is introduced; the AC 9 browser-check already covers the
   visual composition of row 11.

3. **JSDoc tripwire on `SuccessStoryResultsGrid.astro` (R2-M3 — scope extension,
   concept + requirements).** The rhythm's row 7 depends on
   `SuccessStoryResultsGrid.astro`'s inner `<Content>` invocation receiving no
   `background` prop, so Content's own `default = 'default'` paints row 7. That
   contract was implicit: a future refactor that added `background="muted"` to
   the grid's `<Content>` would silently move row 7 off `default` without any
   diff on `[slug].astro`. The revised concept pins the contract structurally
   with a JSDoc-style comment (roughly three lines, under three lines of prose)
   immediately above the inner `<Content>` invocation. No prop is added, no
   behaviour changes; the grid's API, props, slots, and rendered markup are
   identical to today.

   Requirements deltas:
   - "Files in scope" for `SuccessStoryResultsGrid.astro` is updated from
     "unchanged by this task" to "touched: JSDoc comment addition only".
   - Non-Scope's "`SuccessStoryResultsGrid.astro` prop addition" bullet is
     clarified: prop addition is still out of scope; only the JSDoc comment is
     in scope.
   - AC 4 is updated to record the JSDoc addition as part of the contract
     verification: row 7 on `default` holds via Content's existing default, and
     the JSDoc comment is now explicitly present.
   - AC 7 is refined as described under R2-M1 above.

These amendments are authoritative for Phase 3. The Phase-3 surface is three
files: `SuccessStoryHero.astro` (commit 1 — prop addition), `[slug].astro`
(commits 2 and 3 — debt conversion and rhythm application), and
`SuccessStoryResultsGrid.astro` (commit 3 — JSDoc comment only).

---

## Notes / Constraints

- **Worktree isolation.** This task is executed in the
  `success-story-detail-rhythm` worktree at
  `C:\work\team4procoaching\website\.claude\worktrees\success-story-detail-rhythm`.
  The main working directory is off-limits (per maintainer memory — parallel
  Claude sessions rely on worktree isolation).
- **Commit discipline.** The three-file surface naturally splits into three
  commits (one per file) if a commit plan is to reflect single-concern changes,
  or into two (hero + grid prop additions as one; page-level rhythm application
  as another) if the architect prefers that grouping. The architect decides in
  the Phase 2 commit plan.
- **References.**
  - ADR-0014 `docs/adr/0014-light-mode-section-background-system.md` — the
    pattern applied here.
  - `src/styles/sectionStyles.ts` — authoritative token map (lines 23, 26, 44,
    54).
  - `src/pages/index.astro` — reference for how a page composes sections with
    the full six-variant rhythm.
  - `src/pages/success-stories/[slug].astro` — the file being changed;
    line-level targets named in Scope.
  - `src/components/sections/successStories/SuccessStoryHero.astro` — line 52 is
    the hardcoded background to replace.
  - `src/components/sections/successStories/SuccessStoryResultsGrid.astro` — the
    component that must forward `background` to its inner `Content`.
  - `src/components/sections/successStories/SuccessStoryCoachCard.astro` — out
    of scope; doc comment explicitly records the dark-background constraint.
