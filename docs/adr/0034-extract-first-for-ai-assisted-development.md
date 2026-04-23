# Extract-First for AI-Assisted Development

Date: 2026-04-23

Supersedes: [ADR-0033](0033-inline-first-page-composition.md)

## Status

Accepted

## Context

[ADR-0033](0033-inline-first-page-composition.md) was accepted earlier the same
day and established an inline-first default for page composition. A design
review within hours of acceptance surfaced two findings that change the premise
of the decision:

1. **Duplicate detection depends on reviewer discipline.** ADR-0033's "organic
   convergence" policy relies on someone grep'ing for similar markup before
   inlining a new block. There is no tool-level enforcement — not Biome, not
   TypeScript, not tests. In practice, this means duplication will drift
   silently whenever the grep-before-inline step is skipped — and across
   multiple AI-assisted sessions, that step is unreliable.
2. **The workflow assumption underlying ADR-0033 no longer holds.** ADR-0033's
   strongest argument was the friction of re-wrapping external block markup
   (Tailwind Plus, HyperUI, Astro themes) into typed component files. That
   friction is a human-typing cost. The project's work mode is now almost
   exclusively AI-assisted code generation, where producing a `Props` type,
   importing `Content`, and wiring typed data is one pass of the same
   token-stream — effectively no friction. The argument loses its weight.

The original quantitative motivation — that roughly 58 % of Astro components
have exactly one consumer — remains factually correct but is not, on reflection,
a source of real pain. File-count cognitive load has not been reported as a
problem. What the extracted structure has delivered, observed in practice:

- Small blast radius when editing single sections
- Typed `Props` contracts that catch data-shape mismatches at compile time
- Stable find-all-references for AI-assisted edits
- Structural consistency via `Content`-wrapper adapters, centralizing section
  chrome in one place per domain rather than duplicating it per page

These properties matter more under AI-assisted generation than under solo human
editing, and they shift the cost-benefit balance back toward extraction.

### Decision drivers

- **Structural safety over reviewer discipline.** Prefer mechanisms that fail
  loud (type errors, missing imports, compile failures) over mechanisms that
  require someone to remember to run a check.
- **Small blast radius is the primary safety net for AI-assisted edits.** Each
  file is one thing; one change affects one thing. Cross-file impact is mediated
  by typed boundaries.
- **Section chrome belongs in one adapter.** Typed wrappers over `Content`
  (e.g., `Stats`, `Usps`, `Coaches`, `Services`, `SuccessStories`) are not
  incidental extractions — they are the single source of truth for each domain's
  section frame. Inlining them would distribute the chrome across every
  consumer.

### Evaluated approaches

1. **Inline-first with extraction criteria (ADR-0033).** Rejected — see Context
   above. The policy's assumptions no longer hold.
2. **No codified policy.** Rejected — the project owner requires an explicit
   rule rather than a case-by-case judgment call each time a section is
   designed.
3. **Extract-first with narrow non-extraction exceptions.** **Chosen.**

## Decision

**Every identifiable UI section is extracted into its own typed component**,
unless one of two narrow exceptions applies:

1. **Layout wrapper around an already-extracted component.** A page-level
   `<section>` or `<div>` frame whose only job is to give padding, max-width, or
   background to a single existing component (e.g., a page-specific `<section>`
   around `<Cta>`) stays inline. Wrapping a wrapper adds a file without adding
   structure.
2. **Trivial single-element block with no logic, no typed data, and no reuse
   signal.** A one-line `<h2>`, a single `<p>` of static copy, or a decorative
   `<div>` does not warrant a file. The extraction threshold is that there is
   something to type — a data shape, a configuration object, or a repeatable
   pattern. Without that, extraction is noise.

Everything else — heroes, cards, grids, carousels, section adapters over
`Content`, modals, form blocks, navigation widgets, filter bars — is extracted.
**Single-consumer extraction is not a problem under this policy; it is expected
for the first instance of any new section.**

### What does NOT change

- [ADR-0007](0007-component-folder-structure.md) still governs folder placement
  for any extracted component: `sections/` by domain, `ui/` for primitives,
  `navigation/` for nav, `layout/` for shells.
- [ADR-0009](0009-use-types-for-component-props.md) (`type` for Props) applies
  to every extracted component.
- [ADR-0013](0013-use-named-exports-for-data-modules.md),
  [ADR-0017](0017-domain-data-integrity-pattern.md), and the other data-module
  rules are untouched — this ADR is about markup composition, not data.
- **No retro refactor.** Pages written under ADR-0033 — notably
  `src/pages/success-stories/[slug].astro` — are not mass-refactored by this
  decision. Adjustments happen in separate, scoped PRs when the page is touched
  for another reason or when the owner opens a targeted audit.
- **Existing `Content`-wrapper adapters keep their current shape.** `Stats`,
  `Usps`, `Coaches`, `Services`, `SuccessStories` were correct extractions under
  both the prior and new rule; no action required.

### Scope and non-goals

**In scope:**

- The default decision when designing a new page section: extract, not inline.
- The two narrow non-extraction exceptions.
- Cross-reference updates in `CLAUDE.md`, `docs/CONVENTIONS.md`, and
  `docs/ARCHITECTURE.md`.

**Out of scope:**

- Refactoring `src/pages/success-stories/[slug].astro` (anticipated follow-up
  PR, not part of this decision).
- Any other code changes in this PR.
- Folder structure (covered by ADR-0007).
- Client-side script placement (covered by
  [ADR-0020](0020-client-side-script-strategy-revised.md) and
  `docs/CONVENTIONS.md`).

## Consequences

### Positive

- **Structural safety.** Typed `Props` catch data-shape errors at the boundary;
  inlined markup cannot.
- **Small blast radius for AI edits.** Changes to a section affect one file.
  Consumers — current or future — update mechanically via the type system when
  the `Props` surface changes.
- **No grep-before-inline discipline required.** Convergence is detected
  structurally via imports and type references, not via human attention.
- **Consistency is enforced, not reviewed.** `Content`-wrapper adapters
  centralize section chrome in one place per domain.
- **Single-consumer extraction stops being a warning sign.** It is the expected
  case for the first instance of any new section and no longer triggers a
  re-evaluation question.

### Negative

- **Single-use-component ratio stays high (~58 % or higher).** Accepted. The
  ratio is not a pain source in this project — file-count navigation has not
  been reported as a problem.
- **Component folders grow steadily.** ADR-0007 already handles this; domain
  subfolders (`sections/coaches/`, `sections/successStories/`) remain the
  organizational mechanism.
- **External block adoption requires a `Props`-wrapping pass.** Under
  AI-assisted generation, this is a few seconds of token emission rather than
  meaningful friction.

### Risk mitigation

- **Literal three-line component ("only forwards").** Mitigated by exception 2
  and by the CLAUDE.md post-change cleanup guidance: a wrapper that only
  forwards a slot is inlined.
- **Temptation to inline "just this once" for speed.** Mitigated by the
  narrowness of the two exceptions. If the section has typed data or a
  repeatable structure, it is extracted — the decision is not reopened on a
  per-section basis.

## Success criteria

- New feature PRs extract recognizable sections by default, with inline use
  limited to the two named exceptions.
- AI-assisted edits continue to exhibit small blast radius: changes to one
  section rarely require simultaneous edits in unrelated pages.
- The project does not regress on compile-time safety; type-based errors
  continue to surface data-shape mistakes before runtime.

## References

- [ADR-0033](0033-inline-first-page-composition.md) — superseded by this ADR on
  the same day (2026-04-23) after the two decision drivers above were
  identified.
- [ADR-0007](0007-component-folder-structure.md) — folder placement for
  extracted components.
- [ADR-0009](0009-use-types-for-component-props.md) — `type` for Props.
- [ADR-0019](0019-use-tailwindplus-elements-for-interactive-ui.md) — Tailwind
  Plus elements adoption, the concrete external-block source whose friction
  argument drove ADR-0033.
- `CLAUDE.md` — Phase 2 design sparring, post-change cleanup rules.
- `docs/CONVENTIONS.md` — Component Composition.
