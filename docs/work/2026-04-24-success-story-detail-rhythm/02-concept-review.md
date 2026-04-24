# Concept Review: Success-Story Detail Page — Narrative Rhythm Background Cycle — Round 2

**Task ID:** 2026-04-24-success-story-detail-rhythm
**Concept:** docs/work/2026-04-24-success-story-detail-rhythm/02-concept.md
**Date:** 2026-04-24
**State:** 65dbdf30aa6854cf1cfad59d9ac192e2cfc512ac
**Round:** 2 (follow-up to Round 1 at the same path)

---

## Verdict

**Clean.** All Round-1 Blockers and Majors are genuinely resolved; the two Round-1 Minors are editorial fixes landed. Three new Minor findings surfaced during the adversarial hunt, none of which blocks Phase 3. Severity counts: 0 Blocker, 0 Major, 3 Minor, 0 Nit. Worst finding: **Minor** — the reader-pickup `<section>` at row 8 keeps its hardcoded body-text pair `text-foreground-700 dark:text-gray-300` after flipping to `muted`; the shift is safe (foreground-700 reads on `bg-background-muted`), but the concept asserts "no attribute-surface change other than `class:list` and new `background` props" which overstates the situation slightly — the hardcoded text tokens do not follow the `sectionText[background]` contract.

---

## Round-2 Summary

- **Round-1 Blocker 1 (StatsGrid on teal) — resolved.** The rhythm was reshaped (Variant W): row 7 is now `default`; `SuccessStoryResultsGrid` is explicitly unchanged; row 7 inherits `Content`'s own default. The teal surface that triggered the StatsGrid constraint violation is eliminated.
- **Round-1 Blocker 2 (Cta variant on charcoal) — resolved.** Commit 3 adds `variant="glass"` on the inner `<Cta>` at row 11. `variant="glass"` is a real supported prop (`CTA.astro:56, 75`), already branched to `bg-white/10 ... inset-ring-white/20 backdrop-blur-sm` at line 97. Verified against `CTA.astro` directly.
- **Round-1 Major 1 (dark-mode honesty) — resolved.** Summary explicitly frames rhythm as light-mode-only; `sectionStyles.ts:6–7` cited; homepage precedent cited with specific lines (`index.astro:99–122`); AC 5 reformulated in requirements to match.
- **Round-1 Major 2 (commit split) — resolved.** Three-commit plan. Commit 2 is pure debt conversion across exactly the four hardcoded sites on `[slug].astro` (`default`→`default`, value-preserving). Commit 3 is rhythm application + CTA variant addition. Boundaries are crisp; no bleed.
- **Round-1 Major 3 (hero render-identity wording) — resolved.** Concept now states verbatim: "all utilities are atomic and non-conflicting — `relative` governs `position`, `isolate` governs `isolation` … class ordering inside the `class` attribute does not affect the cascade for non-conflicting utilities; therefore the `class:list` rewrite is a render no-op for `background='default'`." Exactly the required language.
- **Round-1 Minor 1 (row-5 stale reversal) — resolved.** Row 5 carries no `background` prop anywhere in the concept. Summary, Affected Files, Commit Plan, Self-Critique and Explicitly-unchanged all agree: "omit-when-default" for row 5.
- **Round-1 Minor 2 (content-anchored references) — resolved.** Commit 3 bullets name rows by content (`startingPoint`, `whatIWasLookingFor`, `turningPoint`, "the reader-pickup section wrapper", "the CTA-band outer `<div>` wrapper", "the inner `<Cta>` invocation"). No line numbers inside Commit 3.
- **New findings:** three Minors — (a) hardcoded text tokens on inline blocks that flip background don't follow the `sectionText[background]` contract (flagged in Notes, but one instance of "no attribute-surface change" claim still reads too strong); (b) concept does not explicitly name the glass-branch secondary-cta guard or the primary/secondary button swap as intentional; (c) Results-Grid sole-caller grep (recorded for completeness) is correct but the concept's claim "No prop change; the grid component is out of scope" is very slightly misleading — the call site signature does not change, but the rhythm depends on the grid's inner `<Content>` default, which is an implicit contract worth one sentence.

---

## Findings

| # | Severity | Scope | One-liner |
|---|----------|-------|-----------|
| R2-M1 | Minor | `[slug].astro` row 8 reader-pickup | Inline `<p class="text-foreground-700 dark:text-gray-300">` keeps hardcoded text tokens when wrapper flips to `muted`; safe today, but concept claim "only `class:list` and `background` props change" is slightly overstated. |
| R2-M2 | Minor | Commit 3 `<Cta variant="glass">` | Concept asserts the glass variant is the first live caller and flags latent risk in Self-Critique (1), but does not explicitly note that the CTA component's glass branch also swaps `CtaButton` variant from `secondary` to `primary` (`CTA.astro:123`) — visible button colour changes too. Not a defect; worth one sentence so the reviewer isn't surprised. |
| R2-M3 | Minor | Results-Grid contract | The concept relies on `SuccessStoryResultsGrid.astro` passing no `background` to its inner `<Content>` so Content's default `'default'` paints row 7. This is an **implicit cross-file contract** — if a future refactor adds `background="muted"` to that `<Content>` invocation, row 7 silently moves off `default` and violates AC 1 without any change to `[slug].astro`. Concept notes the mechanism in Structural Health Check but does not recommend pinning it (for example, a one-line JSDoc note on the grid component's `<Content>` invocation, or a requirement-level acceptance test). Follow-up only; not a Phase-3 blocker. |

---

## Verification log

1. **Variant W rhythm table (row-by-row).** Requirements table (01-requirements.md lines 61–74): row 1 default / 2 muted / 3 default / 4 muted / 5 default / 6 muted / 7 default / 8 muted / 9 muted / 10 default / 11 charcoal / 12 default. Concept Commit-3 scope + Affected Files narrative match row by row. AC 1 reformulated: "rows 1, 3, 5, 7, 10, 12 render on `default`; rows 2, 4, 6, 8, 9 render on `muted`; row 11 renders on `charcoal`." Exact match.

2. **Round-1 Blocker 1 — StatsGrid on teal.** Eliminated at source: row 7 is `default`, not `teal`. Requirements Amendment 1 explicitly documents the reason ("honours StatsGrid"). `SuccessStoryResultsGrid` is unchanged — concept's "Explicitly unchanged" section states that and explains row 7 inherits `Content`'s own default (`'default'`). I cross-checked `Content.astro:67` and `SuccessStoryResultsGrid.astro:37` — `<Content headline={headline}>` passes no `background`, so `Content`'s `const { ..., background = 'default' } = Astro.props;` resolves to `'default'` and the outer `<section>` paints `sectionBackground.default`. Verified.

3. **Round-1 Blocker 2 — Cta variant on charcoal.** `variant="glass"` is real: `CTA.astro:56` declares `variant?: 'dark' | 'glass'`; line 75 gates on it; line 97 produces `bg-white/10 ... inset-ring-white/20 backdrop-blur-sm`. Concept correctly cites lines 7–9 (JSDoc), 75 (`isGlass`). The detail-page invocation passes no `secondaryCta`, so the `secondaryCta && <TextLink variant="light">...` branch at `CTA.astro:125` is not reached in either path — no glass-TextLink interaction to worry about. Verified.

4. **Round-1 Major 1 — dark-mode honesty.** Concept Summary paragraph 3 says "The dark-mode rhythm is explicitly accepted as light-mode-only"; token-map note at `sectionStyles.ts:6–7` cited; Structural Health Check → Cross-cutting: dark-mode fallback spells out each row's fallback; AC 5 rewritten in requirements to match. Self-Critique (2) explicitly re-poses the dark-mode-collapse objection and answers it. No rhetorical dodge.

5. **Round-1 Major 2 — commit split.** Commit 2 scope: "Value-preserving ADR-0014 debt conversion of the four hardcoded `bg-background dark:bg-background-dark` wrappers to `sectionBackground.default`" at the four content-anchored locations (mid pull-quote aside, reader-pickup section, final pull-quote aside, related-stories section). Value-preserving is mechanically proven (all four lands on `default`, and `sectionBackground.default === 'bg-background dark:bg-background-dark'`). Commit 3 scope: three `background="muted"` prop additions (rows 2/4/6), the reader-pickup flip from `default` → `muted`, the CTA-band flip from `muted` → `charcoal`, and `variant="glass"` on the `<Cta>`. No bleed either direction — the hero (commit 1) is separate; the page-level debt (commit 2) is pure; the page-level rhythm (commit 3) is self-contained. The "Why three commits and not two / not four" paragraphs directly address the Round-1 objection that splitting adds cost.

6. **Round-1 Major 3 — render-identity wording.** Verbatim match with the recommendation: "all utilities are atomic and non-conflicting — `relative` governs `position`, `isolate` governs `isolation`, `overflow-hidden` governs `overflow`, `pt-14` governs `padding-top`, and the two background utilities govern `background-color` in light and dark modes respectively; no pair collides. Class ordering inside the `class` attribute does not affect the cascade for non-conflicting utilities; therefore the `class:list` rewrite is a render no-op for `background='default'`." Resolved.

7. **Round-1 Minor 1 — row-5 reversal.** Searched the concept for any row-5 prop addition: Summary (no mention of a row-5 prop), Affected Files table (`background="muted"` on rows 2, 4, 6; row 5 not listed), Explicitly-unchanged section ("Row 5 `Content` invocation (`howWeWorked`) — **no** `background` prop added"), Commit Plan bullet ("`howWeWorked` (row 5) receives no prop — omit-when-default"), Self-Critique (no row-5 reversal needed because it's not in the plan). All four sections agree. Resolved.

8. **Round-1 Minor 2 — content-anchored references.** Commit 3 bullets: "the `Content` invocation for `startingPoint` (row 2)", "the `Content` invocation for `whatIWasLookingFor` (row 4)", "the `Content` invocation for `turningPoint` (row 6)", "the reader-pickup section wrapper (row 8)", "the CTA-band outer `<div>` wrapper (row 11)", "the inner `<Cta>` invocation at the CTA band (row 11)". No line numbers inside Commit 3's scope bullets. Commits 1 and 2 still reference line 52 (hero) and lines 98, 142, 166, 196 (page) — acceptable because those commits execute against the pre-rework baseline where those numbers are authoritative and stable.

9. **Row 8 shape — `<section>` with `class:list`, not `<Content>`.** Commit 3 scope reads "Flip the reader-pickup section wrapper (row 8) from `sectionBackground.default` (set in commit 2) to `sectionBackground.muted`." Commit 2 sets `class:list={[..., sectionBackground.default]}` on the `<section>`. The rework therefore keeps row 8 as a `<section>` with a `class:list` attribute, not promoted to `<Content>`. This is defensible — promotion would change `aria-label="Reader pickup"` semantics, add headline structure where none is wanted, and widen scope. The concept is explicit about the choice. However: the inner `<p>` keeps its hardcoded `text-foreground-700 dark:text-gray-300` tokens (unchanged from today). On `bg-background-muted` (light) / `bg-background-dark-muted` (dark), `text-foreground-700` / `dark:text-gray-300` reads correctly — these are the same token pair `sectionText[muted]` resolves to at `sectionStyles.ts:56` with the exception that the live CSS uses `dark:text-gray-300` (not `dark:text-gray-400`). Trivial, but the concept's claim that only `class:list` and `background` props change is slightly overstated (see R2-M1). The reader-pickup paragraph's hardcoded text reads fine on muted because the tokens happen to match; the concept does not assert otherwise but does not flag the implicit contract either.

10. **Rows 2, 4, 6 — `sectionText` / `sectionHeadline` cascade on muted.** Verified at `sectionStyles.ts:44–51` (headline) and `53–61` (text): `muted` and `default` both map to `text-foreground-950 dark:text-white` (headline) and `text-foreground-700 dark:text-gray-400` (text). No text-colour shift when `Content` invocations flip from `default` → `muted`. The `<p>` body inside each Content call inherits from Content's slot-wrapping `class:list={['text-base/7', sectionText[background]]}` at `Content.astro:113` (two-column) or is unwrapped for the default layout and passed to `SectionHeader`'s own `sectionText[background]` cascade at `SectionHeader.astro:76`. Either path flows `muted` correctly. Verified.

11. **Row 10 — final pull-quote aside on `default`.** Commit 2 converts the `<aside>` wrapper from hardcoded to `sectionBackground.default` (value-preserving). Inner `<PullQuote variant="large">` has its own hardcoded text classes: `text-foreground-950 font-serif font-medium italic dark:text-white` on the blockquote (`PullQuote.astro:39`) and a border accent. These read on `default` (light: foreground-950 on cream; dark: white on background-dark). No regression; behaviour identical to today because the resolved background string is identical. Verified.

12. **Row 12 — related-stories section on `default`.** Commit 2 converts the `<section>` wrapper from hardcoded to `sectionBackground.default`. Inner `<h2>` hardcodes `text-foreground-950 dark:text-white` at `[slug].astro:202`, and the grid uses `SuccessStoryGridCard`. All existing text tokens read on `default` surface (unchanged from today). Verified.

13. **Glass variant text on charcoal.** `CTA.astro` glass path: `text-white` (headline, line 101), `text-white/80` (description, line 105). Surface is `bg-surface-charcoal` (`#4a5859`, per the ADR-0014 palette). Both colour pairs pass AA on the charcoal surface (white on charcoal is approximately 7:1; white/80 on charcoal is still well above 4.5:1). Concept's Self-Critique item (1) raises the same point and accepts it as out-of-`Cta`-scope. Adequate.

14. **Glass path with no secondary CTA.** Detail-page invocation at `[slug].astro:183–187` passes only `primaryCta`. `CTA.astro:125` gates the `TextLink` rendering on `secondaryCta && ...` — no forced render in either variant. `CtaButton variant` for the primary is `'primary'` in the glass branch vs `'secondary'` in the dark branch (`CTA.astro:123`): this is a pre-existing CTA-component behaviour, out-of-scope, but visible on row 11. See R2-M2 — concept should mention the button-colour shift in one sentence so the AC 9 browser-check reviewer isn't surprised.

15. **Critical-Rule walk (CLAUDE.md rules 1–9).**
    - Rule 1 (routes): not engaged. `routes.contact` already imported and used; no hardcoded path introduced.
    - Rule 2 (module scripts): not engaged. No `<script>` on the three in-scope files; concept confirms by reading.
    - Rule 3 (`as const satisfies Record<>`): not engaged. No domain data changed.
    - Rule 4 (named exports): not engaged. No utilities touched.
    - Rule 5 (no barrel files): not engaged. Imports are direct.
    - Rule 6 (`readonly` on array Props): the new `background?` is scalar; existing `readonly Stat[]` on `SuccessStoryResultsGrid.astro:31` is unchanged. Rule holds.
    - Rule 7 (`SmartImage`): not engaged. No image handling changed.
    - Rule 8 (test files excluded from Semgrep): not engaged. No tests added.
    - Rule 9 (render-and-trim / ADR-0036): not engaged at the three in-scope files. `SuccessStoryHero.astro` has no slot forwarders; `[slug].astro` composes other components but does not read slot presence itself; `SectionHeader.astro` already uses render-and-trim at line 53. The `Content.astro` slot handling at `Content.astro:76–77` uses `Astro.slots.has` for the `content` and `aside` slots, but these are *not* forwardable by the call sites in `[slug].astro` (each `<Content>` invocation either passes a real `<Fragment slot="content">` or omits it entirely — no intermediate wrapper that could forward an empty slot). Confirmed by reading the file. ADR-0036 is not freshly engaged by this task; the `SectionHeader` hardening at commit `aeacd2f` already covered the one case where it mattered on this page.

16. **Scope-breach check.** Affected Files table names exactly two files: `SuccessStoryHero.astro` (commit 1) and `[slug].astro` (commits 2 and 3). `SuccessStoryResultsGrid.astro` is listed under "Explicitly unchanged". The nine out-of-scope debt sites (HeroSplit, Contact, coaches/index, how-it-works/index, contact/thanks, ProcessSteps, ServicesCatalog, Modal, index.astro:122) are enumerated in "Notes for the Orchestrator" with a debt-auditor recommendation, not silently fixed. `sectionStyles.ts` explicitly untouched; `Cta.astro` explicitly untouched; `CoachCard.astro` explicitly untouched. No expansion.

17. **`isolate` / `overflow-hidden` composability (Round-1 Owner Question 3 carry-over).** Explicitly addressed at "Structural Health Check → `SuccessStoryHero.astro` → Render-identity statement": "`isolate` governs `isolation`, `overflow-hidden` governs `overflow` … no pair collides." The `class:list` rewrite preserves all four layout utilities verbatim; the background utilities are the only thing that moves from literal to token-lookup. Order-independence follows from atomic-utility semantics (made explicit now, per Round-1 Major 3). Stacking context is governed by `isolate`, not by background. No regression risk. Carried forward.

---

## Open Assumptions

- **Assumption — `SuccessStoryResultsGrid`'s inner `<Content>` default remains `'default'`.** The rhythm for row 7 depends on this implicit cross-file contract. If the grid component is ever refactored and its inner `<Content>` gets `background="muted"` added (or the default of `Content` changes), row 7 silently moves off `default` without any diff on `[slug].astro`. **If wrong:** AC 1 is violated silently; regression is only caught by an AC 9 browser check at PR time. See R2-M3. Not a Phase-3 blocker.
- **Assumption — inline text tokens on rows 3, 8, 10 stay content-compatible with their assigned backgrounds.** Rows 3 and 10 land on `default`; row 8 lands on `muted`. All three use hardcoded `text-foreground-700 dark:text-gray-300` or equivalent, which overlap with `sectionText[default]` and `sectionText[muted]`'s mapping (both resolve to `text-foreground-700 dark:text-gray-400` — the `gray-300` vs `gray-400` is a pre-existing inconsistency, not introduced here). **If wrong** (i.e. a future rhythm iteration moves any of these blocks to `teal`/`silver`/`sage`/`charcoal`): hardcoded dark text fails on dark surfaces. The concept's Notes-for-Orchestrator entry 3 flags this for the next iteration. Not actionable here.
- **Assumption — `bg-surface-charcoal` and the glass panel's `bg-white/10` compose visually as intended.** Concept's Self-Critique (1) surfaces the risk and defers to browser check. AC 9 names the transition explicitly. Unverifiable without rendering; recorded.

---

## Praise

- The commit plan now argues explicitly against both "collapse to two commits" and "split to four commits", naming the bisect and readability costs each way. This level of commit-structure reasoning is rare and pre-empts a Round-3 challenge on the same axis.
- The Self-Critique no longer defeats its own counter-arguments. Each of the three items poses a real objection and answers it on its merits — (1) glass-variant first-caller risk with a concrete fallback; (2) dark-mode collapse with owner acceptance recorded; (3) row-8 double-edit as an intentional cost of the split. Passes the "if I had to argue the counter-argument myself" test.
- The `variant="glass"` first-caller verification grep was actually run and the result documented: three hits, all inside `CTA.astro` itself (JSDoc example, prop type, branch condition). This kind of "no ripple consequences" substantiation is the level the Consumers section is supposed to deliver.
- Requirements Amendment 5 ("ResultsGrid prop removed from scope") and concept's corresponding Explicitly-unchanged entry are tightly aligned. The round-1 scope creep (adding a prop that the rhythm doesn't need) is genuinely removed, not papered over.

---

## Unverifiable items

- **Visual reading of `<Cta variant="glass">` on `bg-surface-charcoal` in light mode.** The inset-ring + backdrop-blur composition is not something I can evaluate from token values alone. AC 9 covers it by browser check. Confirmed as a test-time gate.
- **Visual reading of dark-mode row 10→11→12 block.** All three rows paint `bg-background-dark` in dark mode; the Beat-2 collapse is what the concept honestly acknowledges. Whether the collapse is subjectively acceptable is an owner-signoff question, recorded and closed per the requirements amendment.
- **Button colour shift on row 11 (primary vs secondary in glass branch).** Pre-existing CTA-component behaviour exposed for the first time here. See R2-M2; resolution is a single sentence in the concept or the PR body noting the expected visual change.
