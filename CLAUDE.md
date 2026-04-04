# CLAUDE.md — Project Guide for AI-Assisted Development

This file helps Claude (and other AI tools) work effectively with the Team 4 Pro
Coaching website codebase. It is the **first file to read** before making
changes.

## Project Overview

Marketing website for Team 4 Pro Coaching — three IFBB Pro coaches (Helle
Trevino, Gina Cavaliero, Irene Andersen) offering online fitness coaching. Built
with Astro 6, Tailwind CSS v4, TypeScript, deployed on Netlify. Solo developer
(André). Static site with planned hybrid rendering for Stripe (ADR-0022).

## Design Philosophy

The goal is code that looks boring on first reading — not because the problems
are trivial, but because every abstraction earns its place, every indirection
has a reason, and nothing is clever when simple would do.

When in doubt between "more structured" and "more direct", choose direct until
proven otherwise. A variable that holds a constant with one consumer should be
inlined. A wrapper that only forwards should be inlined. A ternary whose
branches are identical should be removed. Structure exists to solve a problem —
when the problem disappears, the structure should follow.

This philosophy applies equally to adding and removing abstractions. Introducing
a shared component to eliminate duplication is good. Keeping that component
alive after the duplication is gone is not.

Technical debt is not a backlog — it is friction that compounds. When an issue
is identified and the fix is straightforward, the default is to fix it now, not
to track it for later.

## Critical Rules (never break these)

1. **All internal URLs go through `src/data/routes.ts`** — no hardcoded path
   strings in pages, components, or data modules
2. **ADR-0020 migration is mandatory** — when modifying a component with
   `is:inline` script, migrate it to a module `<script>` in the same PR.
   Currently only `CoachDetailModal.astro` remains
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

- Present work commit by commit, each with files in the correct state for that
  commit.
- Verify documentation impact: does the change affect `CLAUDE.md`,
  `CONVENTIONS.md`, `ARCHITECTURE.md`, `README.md`, relevant ADRs, or JSDoc?
  Update in the same commit if the code change created the need.

### Evaluating Refactoring Proposals

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

### Quick Fix vs. Feature

A **Quick Fix** has all of these properties:

- One clearly defined change at one clearly identified location
- No wording, layout, or placement decisions needed
- No new components, patterns, or abstractions introduced
- Can be described in 1–3 sentences with no ambiguity

If any of these are not true, it is a **Feature** and needs the full template
including the Readiness Checklist.

## Architecture at a Glance

```
scripts/                # Build & CI tooling (convention checker)
  └── conventions/      #   Check functions + unit tests
src/
├── components/         # Astro components (.astro)
│   ├── layout/         #   BaseHead, SEO, ScrollAnimations
│   ├── navigation/     #   Header, Footer, NavLink, menus
│   ├── sections/       #   Page sections (Hero, Services, Coaches, etc.)
│   │   ├── coaches/    #     CoachCardCompact, CoachCardExpanded
│   │   ├── howItWorks/ #     ProcessSteps, FaqAccordion
│   │   ├── services/   #     ServiceCard, ServiceCategoryTabs, ServicesCatalog
│   │   ├── successStories/ # BeforeAfterImages, cards, testimonials
│   │   └── usps/       #     UspCard
│   └── ui/             #   Reusable primitives (Button, Modal, FormSelect, etc.)
├── data/               # Typed data modules — business data and config
├── layouts/            # BaseLayout (single page wrapper)
├── pages/              # File-based routing
├── scripts/            # Client-side controller modules (extracted from components)
├── styles/             # Global CSS + shared Tailwind class constants
├── test-utils/         # Shared test helpers (assertNotNull, assertDefined)
├── types/              # Shared TypeScript types (ImageSource, CtaAction, etc.)
└── utils/              # Utility functions (slugify, quizContext, etc.)
```

## Page → Component Map

| Page               | Key Components                                                                              | Data Sources                                                |
| :----------------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------------------- |
| `/` (Homepage)     | HeroSplit, Services, Stats, Usps, Coaches, SuccessStories, CTA, CoachDetailModal, QuizModal | coaches, cta, routes, services, stats, successStories, usps |
| `/services`        | HeroFullscreen, ServicesCatalog (→ ServiceCategoryTabs, ServiceCard), CTA, QuizModal        | routes                                                      |
| `/coaches`         | HeroSplit, Coaches (expanded), Testimonial, Content, PullQuote, CTA, CoachDetailModal       | coaches, routes                                             |
| `/how-it-works`    | HeroFullscreen, ProcessSteps, FaqAccordion, CTA                                             | howItWorks, routes                                          |
| `/success-stories` | HeroFullscreen, SuccessStoryGridCard, TestimonialGrid, SectionHeader, CTA                   | routes, successStories, testimonials                        |
| `/contact`         | Contact, ContactForm (→ FormSelect)                                                         | contact                                                     |
| `/contact/thanks`  | Button                                                                                      | thanks                                                      |

## CTA Map (see also `src/data/routes.ts`)

| Page                   | Primary CTA           | Target              | Secondary CTA            | Target                |
| :--------------------- | :-------------------- | :------------------ | :----------------------- | :-------------------- |
| Homepage Hero          | Start with Team 4 Pro | `/contact`          | Learn about our Services | `#services` (on-page) |
| Homepage Quiz          | Take the Quiz         | QuizModal           | —                        | —                     |
| Homepage Bottom        | Start Your Journey    | `/contact`          | Explore Services         | `/services`           |
| Services Hero          | Take the Quiz         | QuizModal           | Explore Categories       | `#categories`         |
| Services Bottom        | Take the Quiz         | QuizModal           | Contact Us               | `/contact`            |
| Coaches Hero           | Meet the Coaches      | `#meet-the-coaches` | View Our Services        | `/services`           |
| Coaches Bottom         | Contact Us            | `/contact`          | View Services            | `/services`           |
| How It Works Hero      | Book Consultation     | `/contact`          | See How It Works         | `#how-it-works`       |
| How It Works Bottom    | Book Consultation     | `/contact`          | Explore Services         | `/services`           |
| Success Stories Hero   | Start Transformation  | `/contact`          | Explore Stories          | `#stories`            |
| Success Stories Bottom | Start Transformation  | `/contact`          | Explore Services         | `/services`           |

## Key Data Flows

### Quiz → Contact (ADR-0021)

```
QuizModal (4 steps) → saveQuizAnswers(sessionStorage) → Result screen
  ├─ "Get in Touch" → /contact?goal=...&service=...&experience=...&timeline=...
  │   → ContactForm reads sessionStorage (priority) or URL params (fallback)
  │   → Summary card + service dropdown preselect + hidden fields for Netlify
  └─ "View This Service" → /services?category=...&service=...
      → ServiceCategoryTabs switches tab + highlights card
      → User clicks "Get Started" → /contact?service=...
      → ContactForm reads sessionStorage (quiz context survives)
```

### Quiz → Services Deep-Link

```
Quiz result href → /services?category=bodybuilding&service=competition-prep
  → ServiceCategoryTabs reads ?category= → switches tab
  → reads ?service= → scrolls to card + quiz-highlight pulse animation (3s)
```

## Known Coupling Points

These are places where changes in one file require manual sync in another:

- **`styles/quizClasses.ts`** ↔ `QuizStepPanel.astro` + `quizModalController.ts`
  — radio-card label classes shared between server-rendered and client-rendered
  options
- **`PillSwitcher.astro`** ↔ `ServiceCategoryTabs.astro` script —
  active/inactive tab style classes are duplicated (documented in
  ServiceCategoryTabs with comment)
- **`quiz.ts` `SerializedQuizData`** ↔ `quizModalController.ts` — the type
  describes the JSON shape passed via `<template data-json>`
- **`quiz.ts` results** ↔ `quizContext.ts` `answerLabels` — labels are derived
  from quiz.ts at module load, not duplicated manually

## Conventions Quick Reference

- **Imports**: `~/` alias for `src/`, Biome auto-sorts, `import type` enforced
- **Props**: `type Props = { ... }` (not interface), `readonly` for arrays
- **Data modules**: `as const satisfies Record<>` for ID-keyed data
- **Routes**: Always import from `~/data/routes`, never hardcode paths
- **Client-side scripts**: Module `<script>` by default. `is:inline` only for
  Critical Early Execution (ADR-0020). Complex scripts → extract to
  `src/scripts/`
- **CSS**: Tailwind v4 utility classes, `@theme` in `global.css` for custom
  tokens
- **Images**: `SmartImage` for content images, plain `<img>` only for decorative
  ≤64px
- **Forms**: Netlify Forms with honeypot spam protection
- **Animations**: `data-animate` attributes + IntersectionObserver (ADR-0015),
  `prefers-reduced-motion` compliance required
- **Testing**: Vitest, jsdom for DOM tests, tests in `*.test.ts` next to source

## Rendering Model (ADR-0022)

Currently full SSG. Planned: `output: 'server'` with `prerender: true` default
(Astro 6 hybrid). All marketing pages stay static. Server endpoints only for
Stripe API routes (`export const prerender = false`).

## Pending Work / Known Open Items

### Technical debt

- **CoachDetailModal**: Last `is:inline` script — migrate on next change
  (ADR-0020)
- **Logo**: Still using placeholder — real logo outstanding from coaches
- **Legal pages**: `/privacy` and `/terms` — placeholder content, real legal
  copy outstanding

### Content blockers (for launch)

- Coach content delivery from Helle, Irene, Gina still pending
- Gina's prices not yet finalized

### Upcoming features (from coaches)

- **Stripe integration**: ADR-0022 decision made, implementation pending
- **Success Stories detail pages**: Expandable content or
  `/success-stories/[slug]` pages (see `docs/DECISION_GUIDES.md` — Modal vs.
  Page)
- **Service additional info**: Expandable details per service card
- **Curtain reveal effect**: Opening animation when visiting the site
- **Category selection rework**: Services tab/filter behavior change
- **How It Works expansion**: More content/sections
- **Color changes**: At one specific location (TBD from coaches)

## Documentation Map

| Document                   | Purpose                                       | When to read                                  |
| :------------------------- | :-------------------------------------------- | :-------------------------------------------- |
| `CLAUDE.md` (this file)    | AI quick reference                            | Always first                                  |
| `docs/ARCHITECTURE.md`     | System overview, ADR summaries, design system | When understanding the big picture            |
| `docs/CONVENTIONS.md`      | Coding standards and patterns                 | When writing or reviewing code                |
| `docs/DEVELOPMENT.md`      | Setup, tooling, troubleshooting               | When setting up or debugging                  |
| `docs/MAINTENANCE.md`      | CI/CD, security, dependency updates           | When touching infrastructure                  |
| `docs/FEATURE_TEMPLATE.md` | Template for describing new features          | When scoping a new feature                    |
| `docs/DECISION_GUIDES.md`  | Modal vs. Page, When to Use MDX               | When introducing new views or content formats |
| `CONTRIBUTING.md`          | Workflow, commits, PRs, ADR process           | When contributing changes                     |
| `docs/adr/*.md`            | Individual architecture decisions             | When a specific decision is relevant          |
