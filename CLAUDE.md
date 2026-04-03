# CLAUDE.md — Project Guide for AI-Assisted Development

This file helps Claude (and other AI tools) work effectively with the Team 4 Pro
Coaching website codebase. It is the **first file to read** before making
changes.

## Project Overview

Marketing website for Team 4 Pro Coaching — three IFBB Pro coaches (Helle
Trevino, Gina Cavaliero, Irene Andersen) offering online fitness coaching. Built
with Astro 6, Tailwind CSS v4, TypeScript, deployed on Netlify. Solo developer
(André). Static site with planned hybrid rendering for Stripe (ADR-0022).

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

## Architecture at a Glance

```
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
- **Legal pages**: `/privacy` and `/terms` — routes exist, pages don't yet

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
- **"Standard" → "Monthly"**: Label change on Services pricing cards
- **Home menu item**: Add to navigation
- **Category selection rework**: Services tab/filter behavior change
- **How It Works expansion**: More content/sections
- **Color changes**: At one specific location (TBD from coaches)

## How to Write a Good Prompt for This Project

When asking for changes, use the feature template (`docs/FEATURE_TEMPLATE.md`)
for anything beyond a one-line fix. At minimum include:

1. **Which page(s)** are affected
2. **The user-visible behavior** you want (not implementation details)
3. **If data flows between pages**, describe the full user journey
4. **If the coaches have opinions**, state them — they're the stakeholders

Example of a good prompt:

> "On the Services page, when a user clicks 'Get Started' on a service card,
> they should land on the Contact page with that service preselected in the
> dropdown. The coaches want the service name visible, not just the ID."

Example of a prompt that leads to rework:

> "Fix the contact form to show the service." (Which service? From where?
> Preselected how? What if they came from the quiz?)

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
