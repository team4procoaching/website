# CLAUDE.md — Working Instructions for AI-Assisted Development

**Before starting any work, read `docs/ARCHITECTURE.md` for project context.**
It contains the design philosophy, project structure, component maps, data
flows, coupling points, and pending work. This file contains only working
instructions.

---

## Critical Rules (never break these)

1. **All internal URLs go through `src/data/routes.ts`** — no hardcoded path
   strings in pages, components, or data modules
2. **Module scripts are the default (ADR-0020)** — `is:inline` is only for
   Critical Early Execution. When a change touches the script behavior of a
   component that still uses `is:inline`, migrate it to a module `<script>` in
   the same PR. Pure content or CSS changes that do not affect script behavior
   do not trigger migration. See `docs/ARCHITECTURE.md` → Pending Work for
   current migration status.
3. **`as const satisfies Record<>`** for all domain data with ID-based
   cross-references (ADR-0017). TypeScript must catch missing entries at compile
   time
4. **Named exports only** — no default exports in data modules or utilities
   (ADR-0013)
5. **No barrel files** — import directly from source files, never from
   `index.ts` re-exports
6. **`readonly` on array Props** — component Props that receive arrays must use
   `readonly T[]`
7. **SmartImage for all non-decorative images** — wraps Astro's `<Image />` with
   `ImageSource` discriminated union (ADR-0010)
8. **Test files are excluded from Semgrep** — DOM patterns in tests are not
   security issues

---

## Working Process

The project owner acts as requester, design-sparring partner, and reviewer. The
AI implements. The AI is expected to push back with reasoning when it sees
structural problems — whether in existing code, in the project owner's proposal,
or in its own earlier work. Silence is not agreement; if something looks wrong,
say so. Apply the same design philosophy scrutiny to the project owner's
proposals as to existing code — if a proposal introduces unnecessary complexity,
contradicts an ADR, or misses a simpler alternative, raise it with a clear
explanation of why. The project owner values well-reasoned pushback over
compliance.

### Phase 1: Requirements

Before implementing, check the Readiness Checklist in
`docs/FEATURE_TEMPLATE.md`. If any item is unanswered, **do not implement** —
ask the project owner. Do not fill gaps with assumptions.

### Phase 2: Design Sparring

Present your implementation plan before writing code:

- Which files are affected and what changes in each
- Which existing patterns and components you will reuse
- Whether new abstractions, types, or conventions are needed
- All consumers of any value being added, renamed, or removed (grep the codebase
  and list them)
- If the feature introduces a new view (detail page, modal, inline expand),
  apply the decision framework in `docs/DECISION_GUIDES.md` and state which
  option fits and why

**Structural health check**: When the plan touches an existing component,
briefly assess its current state. Does it comply with current ADRs? Is the
client-side code testable (exported functions, not inline scripts)? Are there
duplicated class strings or template structures that a shared component would
eliminate? Does the component's complexity still match its responsibility? Flag
findings with a recommendation and reasoning. The default recommendation should
be to address them in the current PR when the fix is contained and low-risk —
the project has version control, so the cost of trying is a revert, not a
catastrophe. Only recommend deferral when the fix would significantly expand the
PR scope or requires design decisions that are not yet made.

**Phase 2 ends with the plan. Phase 3 starts only after explicit approval. Never
present a plan and implement in the same response. The plan message must end
without code changes — always.**

### Phase 3: Implementation

- **One concern per commit.** Each commit does exactly one thing.
- **Follow existing patterns.** Before creating any new file, look at how
  existing files of the same type are structured. Follow the pattern. If no
  pattern exists, flag it — do not silently invent one.
- **Identify missing conventions, don't silently establish new ones.** If you
  notice an undocumented pattern in the codebase, point it out: "I see all pages
  use `directory/index.astro` but this isn't documented." Let the project owner
  decide whether to document it. Do not introduce conventions without discussion
  — but do propose them when engineering fundamentals support it.
- **Post-change cleanup.** After removing a condition, parameter, or branch,
  check whether the surrounding code still earns its complexity. Specific
  triggers: a ternary whose branches are now identical → remove the ternary. A
  variable holding a constant with exactly one consumer → inline it. A wrapper
  that only forwards → inline it. A component prop that is always passed the
  same value → hardcode it. Do not preserve structure that no longer serves a
  purpose.
- **Validate against project tooling.** Before presenting code, check it
  mentally against: Biome line width (100), `as const satisfies` patterns, named
  exports only, `readonly` on array Props, routes through `routes.ts`, CSS
  selector compatibility, and all Critical Rules above.
- **If something breaks, stop and analyze.** Do not patch. Understand the root
  cause, describe it to the project owner, and discuss alternatives together
  before attempting a fix.

### Phase 4: Review

- All work is delivered as signed commits on a feature branch, submitted as a PR
  against `main`. Direct pushes to `main` are blocked. Follow the commit
  convention in `CONTRIBUTING.md` (Conventional Commits with mandatory scope).
  Commit signing is the project owner's responsibility — present commits for the
  project owner to sign and push.
- Commits are squashed on merge. The per-commit structure exists for review
  clarity, not for Git history. Still follow "one concern per commit" — it makes
  the review faster and problems easier to isolate.
- Present work commit by commit, each with files in the correct state for that
  commit.
- Verify documentation impact: does the change affect `CLAUDE.md`,
  `CONVENTIONS.md`, `ARCHITECTURE.md`, `README.md`, relevant ADRs, or JSDoc?
  Update in the same commit if the code change created the need.

---

## Evaluating Refactoring Proposals

When the project owner proposes a structural change, or when a structural health
check reveals issues, weigh both directions honestly:

- **Cost of changing**: risk of regressions, review effort, churn, learning
  curve for new patterns
- **Cost of not changing**: untestable code, convention violations, growing
  coupling, duplicated patterns, increasing cognitive load

Do not default to "it works, leave it." If you disagree with a proposed
refactoring, explain which specific cost of changing outweighs which specific
cost of not changing — not just "it's fine as is."

When no ADR or convention covers the situation, do not treat the absence of a
rule as an argument against a change. Evaluate the proposal on engineering
fundamentals: testability, separation of concerns, duplication, coupling,
consistency with the design philosophy. If these fundamentals support the
change, say so — even if no existing rule requires it. New ADRs are born from
exactly these moments.

---

## Quick Fix vs. Feature

A **Quick Fix** has all of these properties:

- One clearly defined change at one clearly identified location
- No wording, layout, or placement decisions needed
- No new components, patterns, or abstractions introduced
- Can be described in 1-3 sentences with no ambiguity

If any of these are not true, it is a **Feature** and needs the full template
including the Readiness Checklist.

---

## Conventions Quick Reference

For full details, see `docs/CONVENTIONS.md`.

- **Imports**: `~/` alias for `src/`, Biome auto-sorts, `import type` enforced
- **Props**: `type Props = { ... }` (not interface), `readonly` for arrays
- **Data modules**: `as const satisfies Record<>` for ID-keyed data
- **Routes**: Always import from `~/data/routes`, never hardcode paths
- **Client-side scripts**: Module `<script>` by default. `is:inline` only for
  Critical Early Execution (ADR-0020). Complex scripts → extract to
  `src/scripts/`
- **CSS**: Tailwind v4 utility classes, `@theme` in `global.css` for custom
  tokens. No `@apply`.
- **Images**: `SmartImage` for content images, plain `<img>` only for decorative
  ≤64px
- **Forms**: Netlify Forms with honeypot spam protection
- **Animations**: `data-animate` attributes + IntersectionObserver (ADR-0015),
  `prefers-reduced-motion` compliance required
- **Component extraction**: Extract-first — every identifiable UI section
  becomes its own typed component, except (a) layout wrappers around an
  already-extracted component and (b) trivial single-element blocks with no
  logic or typed data (ADR-0034)
- **Testing**: Vitest, jsdom for DOM tests, tests in `*.test.ts` next to source

---

## Documentation Map

For the full documentation map (including human-facing docs), see
`docs/ARCHITECTURE.md` → Documentation Map. The table below lists documents
relevant during AI-assisted implementation.

| Document                   | When to Read                                               |
| :------------------------- | :--------------------------------------------------------- |
| `docs/ARCHITECTURE.md`     | Always first — project context, maps, data flows           |
| `docs/CONVENTIONS.md`      | When writing or reviewing code                             |
| `CONTRIBUTING.md`          | When preparing commits, branches, or PRs                   |
| `docs/DECISION_GUIDES.md`  | When a feature introduces a new view or content format     |
| `docs/FEATURE_TEMPLATE.md` | When scoping a new feature                                 |
| `docs/DEVELOPMENT.md`      | When debugging tooling or environment issues               |
| `docs/MAINTENANCE.md`      | When touching CI/CD, dependencies, or deployment config    |
| `docs/reference/`          | When adjusting tool behavior (Biome, commitlint, Renovate) |
| `docs/adr/*.md`            | When a specific architecture decision is relevant          |
