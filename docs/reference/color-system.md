# Color System Reference

This document specifies the complete color system for the Team 4 Pro Coaching
website. It covers color tokens, section background variants, page-level section
mappings, component color contracts, accessibility compliance, and dark mode
behavior.

> **Decisions**: [ADR-0014](../adr/0014-light-mode-section-background-system.md)
> (system baseline); silver surface revised by
> [ADR-0032](../adr/0032-revise-silver-surface-for-aa.md).

## Table of Contents

- [Color Tokens](#color-tokens)
- [Section Background System](#section-background-system)
- [Page Section Mappings](#page-section-mappings)
- [Component Color Contracts](#component-color-contracts)
- [Button and CTA Colors](#button-and-cta-colors)
- [Hover Effects](#hover-effects)
- [Dark Mode](#dark-mode)
- [Accessibility](#accessibility)
- [Implementation Guide](#implementation-guide)

---

## Color Tokens

### Existing Tokens (unchanged)

Defined in `src/styles/global.css` under `@theme`. Full ramps from 50–950 exist
for `foreground`, `accent`, and `teal`. Only the most-used stops are listed
here.

| Token              | Hex       | Role                                  |
| :----------------- | :-------- | :------------------------------------ |
| `foreground-950`   | `#38070f` | Primary text (warm dark brown)        |
| `foreground-700`   | `#5c2020` | Secondary text                        |
| `foreground-600`   | `#7a3a3a` | Tertiary text, descriptions           |
| `foreground-400`   | `#f27a8a` | Icons on light backgrounds            |
| `foreground-100`   | `#fde6e8` | Hover backgrounds                     |
| `foreground-50`    | `#fef2f3` | Subtle backgrounds                    |
| `accent-600`       | `#bf7960` | Primary CTA (terracotta)              |
| `accent-500`       | `#d4846a` | CTA hover                             |
| `accent-300`       | `#f0b8a5` | Subtle accent                         |
| `accent-200`       | `#f7d5ca` | Timeline connecting lines             |
| `accent-100`       | `#fbeae4` | Badge/tag backgrounds                 |
| `teal-500`         | `#4a9199` | Secondary accent                      |
| `teal-700`         | `#36656c` | Dark teal for emphasis                |
| `teal-100`         | `#d9f0f1` | Badge/tag backgrounds (stories)       |
| `background`       | `#f7eee5` | Standard page background (warm cream) |
| `background-muted` | `#e8ddd6` | Muted section background (warm sand)  |

### New Tokens

Added to `@theme` in `global.css`:

| Token              | Hex       | Role                                                             |
| :----------------- | :-------- | :--------------------------------------------------------------- |
| `surface-teal`     | `#2e6b72` | Section bg: Services                                             |
| `surface-silver`   | `#6e6e6e` | Section bg: USPs/Advantages                                      |
| `surface-sage`     | `#6d7b7b` | Section bg: Coaches                                              |
| `surface-charcoal` | `#4a5859` | Section bg: Success Stories, Footer                              |
| `pink`             | `#ec4899` | Reserved — declared in `@theme`, not yet consumed by any utility |

### Token Relationships

```text
Page Background Spectrum (light → dark):

#f7eee5 ─── #e8ddd6 ─── #6e6e6e ─── #6d7b7b ─── #4a5859 ─── #2e6b72 ─── #38070f
default     muted       silver      sage        charcoal    teal        CTA dark
  ↑           ↑           ↑           ↑           ↑           ↑           ↑
dark text   dark text   light text  light text  light text  light text  light text
```

---

## Section Background System

### Type Definition

Located in `src/styles/sectionStyles.ts`:

```typescript
export type SectionBackground =
  | 'default' // #f7eee5 — warm cream
  | 'muted' // #e8ddd6 — warm sand
  | 'teal' // #2e6b72 — deep teal
  | 'silver' // #6e6e6e — neutral silver
  | 'sage' // #6d7b7b — muted sage green
  | 'charcoal'; // #4a5859 — dark charcoal
```

### Background Classes

```typescript
export const sectionBackground: Record<SectionBackground, string> = {
  default: 'bg-background dark:bg-background-dark',
  muted: 'bg-background-muted dark:bg-background-dark-muted',
  teal: 'bg-surface-teal dark:bg-background-dark',
  silver: 'bg-surface-silver dark:bg-background-dark-muted',
  sage: 'bg-surface-sage dark:bg-background-dark-muted',
  charcoal: 'bg-surface-charcoal dark:bg-background-dark',
};
```

### Text Color Classes

Headline and body text use separate class maps because their colors differ on
some variants (e.g., `default` uses `fg-950` for headlines but `fg-700` for body
text).

```typescript
export const sectionHeadline: Record<SectionBackground, string> = {
  default: 'text-foreground-950 dark:text-white',
  muted: 'text-foreground-950 dark:text-white',
  teal: 'text-white',
  silver: 'text-white',
  sage: 'text-white',
  charcoal: 'text-white',
};

export const sectionText: Record<SectionBackground, string> = {
  default: 'text-foreground-700 dark:text-gray-400',
  muted: 'text-foreground-700 dark:text-gray-400',
  teal: 'text-white/90',
  silver: 'text-white/90',
  sage: 'text-white/90',
  charcoal: 'text-white/90',
};
```

### Contract Per Variant

| Variant    | Background | Headline  | Body Text        | Card Bg   | Card Border             | Card Title | Card Body         |
| :--------- | :--------- | :-------- | :--------------- | :-------- | :---------------------- | :--------- | :---------------- |
| `default`  | `#f7eee5`  | `fg-950`  | `fg-950`         | —         | —                       | —          | —                 |
| `muted`    | `#e8ddd6`  | `fg-950`  | `fg-950`         | `#ffffff` | `fg-950/10`             | `teal-500` | `rgba(0,0,0,0.8)` |
| `teal`     | `#2e6b72`  | `#ffffff` | `#ffffff`        | `#ffffff` | `rgba(0,0,0,0.1)`       | `teal-500` | `rgba(0,0,0,0.8)` |
| `silver`   | `#6e6e6e`  | `#ffffff` | `text-white/90`  | `#ffffff` | `rgba(255,255,255,0.1)` | `#6d7b7b`  | `rgba(0,0,0,0.8)` |
| `sage`     | `#6d7b7b`  | `#ffffff` | ⚠️ on cards only | `#ffffff` | `rgba(255,255,255,0.1)` | `#6d7b7b`  | `rgba(0,0,0,0.8)` |
| `charcoal` | `#4a5859`  | `#f7eee5` | `#ffffff`        | `#ffffff` | `rgba(255,255,255,0.1)` | `teal-500` | `rgba(0,0,0,0.8)` |

> ⚠️ **Sage**: Body text must never sit directly on the background surface.
> Always place body text inside white cards. Only large bold headlines (≥18px,
> font-weight ≥700) may appear directly on the surface.

---

## Page Section Mappings

### Visual Rhythm

The core design principle is **alternating light and dark sections** to create
visual drama and guide the user's eye. Each page has its own rhythm, documented
below.

### Homepage (`/`)

| #   | Section               | Background     | Key Notes                                                                                                             |
| :-- | :-------------------- | :------------- | :-------------------------------------------------------------------------------------------------------------------- |
| 1   | Header + HeroSplit    | `default`      | CTA Primary: `accent-600`, Secondary: `fg-950/30`                                                                     |
| 2   | We Get Your Struggles | `muted`        | Content component with image                                                                                          |
| 3   | Services (featured)   | **`teal`**     | All white cards, `teal-600` titles, `teal-500` icons. Featured: `ring-teal-300`. Toggle: `on-dark`. Quiz CTA: `glass` |
| 4   | Stats / Trust         | `muted`        | White stat cards, numbers: `fg-950`                                                                                   |
| 5   | USPs / Advantages     | **`silver`**   | `bg-white/10` container, white icons/text                                                                             |
| 6   | Coaches               | **`sage`**     | White cards with `shadow-lg`                                                                                          |
| 7   | Success Stories       | **`charcoal`** | White cards with `shadow-xl`, slider nav: `bg-white/20`                                                               |
| 8   | Final CTA             | `default`      | Contains CTA box (`dark` variant)                                                                                     |
| 9   | Footer                | **`charcoal`** | Links: `text-white/70`, hover: `text-white`                                                                           |

```text
Visual rhythm:

LIGHT    ██████████  Header + Hero (#f7eee5)
MUTED    ██████████  Struggles (#e8ddd6)
DARK     ██████████  Services (#2e6b72)         ← teal
MUTED    ██████████  Stats (#e8ddd6)
DARK     ██████████  USPs (#6e6e6e)             ← silver
DARK     ██████████  Coaches (#6d7b7b)          ← sage
DARK     ██████████  Success Stories (#4a5859)  ← charcoal
LIGHT    ██████████  Final CTA (#f7eee5)
DARK     ██████████  Footer (#4a5859)           ← charcoal
```

### Services (`/services`)

| #   | Section         | Background    | Key Notes                                        |
| :-- | :-------------- | :------------ | :----------------------------------------------- |
| 1   | HeroFullscreen  | Image overlay | White text on dark overlay                       |
| 2   | ServicesCatalog | `default`     | Tabs: `accent-600` active, cards: white/featured |
| 3   | Bottom CTA      | `muted`       | CTA box: `fg-950` dark bg                        |
| 4   | Footer          | `charcoal`    |                                                  |

### How It Works (`/how-it-works`)

| #   | Section        | Background    | Key Notes                                 |
| :-- | :------------- | :------------ | :---------------------------------------- |
| 1   | HeroFullscreen | Image overlay | White text on dark overlay                |
| 2   | ProcessSteps   | `default`     | Circles: `accent-600`, line: `accent-200` |
| 3   | Accordion      | `muted`       | Dividers: `fg-950/10`                     |
| 4   | Bottom CTA     | `default`     | CTA box: `fg-950` dark bg                 |
| 5   | Footer         | `charcoal`    |                                           |

### Coaches (`/coaches`)

| #   | Section              | Background | Key Notes                                             |
| :-- | :------------------- | :--------- | :---------------------------------------------------- |
| 1   | HeroSplit            | `default`  | Stat tiles: `fg-950/5` bg                             |
| 2   | Why Team Beats Indv. | `muted`    | PullQuote border: `accent-600`                        |
| 3   | Testimonial          | built-in   | White text on `fg-950` bg                             |
| 4   | Coach Cards          | **`sage`** | White cards, title: `#6d7b7b`, tags: `accent-100/700` |
| 5   | Bottom CTA           | `default`  | CTA box: `fg-950` dark bg                             |
| 6   | Footer               | `charcoal` |                                                       |

### Success Stories (`/success-stories`)

| #   | Section          | Background    | Key Notes                                              |
| :-- | :--------------- | :------------ | :----------------------------------------------------- |
| 1   | HeroFullscreen   | Image overlay | White text on dark overlay                             |
| 2   | Stories Grid     | `muted`       | White cards, badge: `teal-100`/`teal-700`              |
| 3   | Testimonial Grid | `default`     | White cards, gradient blurs: `accent-400`→`accent-200` |
| 4   | Bottom CTA       | `muted`       | CTA box: `fg-950` dark bg                              |
| 5   | Footer           | `charcoal`    |                                                        |

### Success Story Detail (`/success-stories/[slug]`) — Planned

> Not yet on `main`. Design reference for the route listed under Pending Work in
> ARCHITECTURE.md.

| #   | Section             | Background | Key Notes                                       |
| :-- | :------------------ | :--------- | :---------------------------------------------- |
| 1   | Back Link + Header  | `default`  | Transformation: `accent-600`, tiles: `fg-950/5` |
| 2   | Before/After Images | `muted`    | Visual break                                    |
| 3   | Pull Quote + Body   | `default`  | Border: `accent-600`, prose: `fg-600`           |
| 4   | Bottom CTA          | `muted`    | CTA box: `fg-950` dark bg                       |
| 5   | Navigation          | `default`  |                                                 |
| 6   | Footer              | `charcoal` |                                                 |

### Contact (`/contact`)

| #   | Section             | Background | Key Notes                                                 |
| :-- | :------------------ | :--------- | :-------------------------------------------------------- |
| 1   | Contact Info (left) | `muted`    | Icons: `fg-400`. Dark: `bg-dark`                          |
| 2   | Form (right)        | `default`  | Inputs: white, focus: `accent-600`. Dark: `bg-dark-muted` |
| 3   | Footer              | `charcoal` | Dark: `bg-dark` — form→footer boundary is B→A             |

### Thanks (`/contact/thanks`)

| #   | Section           | Background | Key Notes                                       |
| :-- | :---------------- | :--------- | :---------------------------------------------- |
| 1   | Thank You message | `default`  | Icon circle: `accent-100` bg, `accent-600` icon |
| 2   | Footer            | `charcoal` |                                                 |

---

## Component Color Contracts

### Cards

| Context                           | Card Bg   | Border          | Shadow                      |
| :-------------------------------- | :-------- | :-------------- | :-------------------------- |
| On light bg (`default`, `muted`)  | `#ffffff` | `fg-950/5` ring | `shadow-lg`                 |
| On dark bg (`teal`, `sage`, etc.) | `#ffffff` | —               | `shadow-lg shadow-black/10` |

The `Card` component accepts a `darkBackground` prop. When `true`, it drops the
ring border in favor of a soft shadow with explicit `shadow-black/10` for gentle
lift against the colored surface. In dark mode the existing `dark:` classes
remain unchanged regardless of the prop value.

### Service Cards

Service cards use **three style paths** based on background context and featured
state:

**On dark section background** (e.g. teal on homepage):

All cards become white — including the featured card. The featured card is
distinguished by a `ring-2 ring-teal-300` accent ring instead of a dark
background. This avoids the warm-brown vs cool-teal color clash.

| Element     | Standard Card        | Featured Card                      |
| :---------- | :------------------- | :--------------------------------- |
| Card Bg     | `#ffffff`            | `#ffffff` + `ring-2 ring-teal-300` |
| Title       | `teal-600`           | `teal-600`                         |
| Price       | `fg-950`             | `fg-950`                           |
| Description | `fg-600`             | `fg-600`                           |
| Features    | `fg-600`             | `fg-600`                           |
| Check Icon  | `teal-500`           | `teal-500`                         |
| Button      | Primary (terracotta) | Primary (terracotta)               |

**On light section background** (e.g. `/services` page):

| Element     | Standard Card           | Featured Card             |
| :---------- | :---------------------- | :------------------------ |
| Card Bg     | `#ffffff` + `fg-950/10` | `fg-950` (dark)           |
| Title       | `fg-950`                | `#ffffff`                 |
| Price       | `fg-950`                | `#ffffff`                 |
| Description | `fg-600`                | `gray-300`                |
| Features    | `fg-600`                | `gray-300`                |
| Check Icon  | `accent-600`            | `#ffffff`                 |
| Button      | Primary (terracotta)    | Secondary (white outline) |

### Coach Cards

| Element        | On light bg                 | On sage bg (`#6d7b7b`)   |
| :------------- | :-------------------------- | :----------------------- |
| Card Bg        | `fg-950/5`                  | `#ffffff`                |
| Name           | `fg-950`                    | `fg-950` (on white card) |
| Title          | `accent-600`                | `#6d7b7b`                |
| Bio            | `fg-600`                    | `rgba(0,0,0,0.8)`        |
| Specialty Tags | `accent-100` / `accent-700` | same                     |

### Success Story Cards (Slider)

The slider cards accept a `darkBackground` prop. On dark backgrounds they switch
from semi-transparent (`bg-fg-950/5`) to solid white with shadow.

| Element        | On light bg  | On dark bg (charcoal)   |
| :------------- | :----------- | :---------------------- |
| Card Bg        | `fg-950/5`   | `#ffffff` + `shadow-xl` |
| Name           | `fg-950`     | `fg-950` (on white)     |
| Transformation | `accent-600` | `accent-600` (on white) |
| Program        | `fg-600`     | `fg-600` (on white)     |

### Testimonial Cards

| Element      | Color      |
| :----------- | :--------- |
| Card Bg      | `#ffffff`  |
| Ring         | `fg-950/5` |
| Quote Text   | `fg-950`   |
| Author Name  | `fg-950`   |
| Author Title | `fg-600`   |
| Avatar Bg    | `fg-50`    |

### Stat Tiles

| Element | Color                                 |
| :------ | :------------------------------------ |
| Tile Bg | `fg-950/5` (or `#ffffff` on muted bg) |
| Number  | `fg-950`                              |
| Label   | `fg-600`                              |

### PullQuote

| Element     | Color                    |
| :---------- | :----------------------- |
| Border Left | `accent-600` (4px)       |
| Quote Text  | `fg-950` (italic, serif) |
| Citation    | `fg-600`                 |

### Process Steps (Timeline)

| Element          | Color                           |
| :--------------- | :------------------------------ |
| Circle           | `accent-600` bg, `#ffffff` text |
| Connecting Line  | `accent-200`                    |
| Step Title       | `fg-950`                        |
| Step Description | `fg-600`                        |

### Segmented Control / Tabs

| State            | Background   | Text      |
| :--------------- | :----------- | :-------- |
| Inactive         | transparent  | `fg-600`  |
| Active           | `accent-600` | `#ffffff` |
| Hover (inactive) | `fg-100`     | `fg-950`  |

### FAQ Accordion

| Element  | Color       |
| :------- | :---------- |
| Divider  | `fg-950/10` |
| Question | `fg-950`    |
| Answer   | `fg-600`    |
| Chevron  | `fg-400`    |

---

## Button and CTA Colors

### Primary CTA Button

| Property   | Value                                             |
| :--------- | :------------------------------------------------ |
| Background | `accent-600` (`#bf7960`)                          |
| Text       | `#f7eee5`                                         |
| Hover      | `accent-500`, `translateY(-2px)` (reference only) |
| Box Shadow | `0 10px 30px rgba(191, 121, 96, 0.3)`             |

### Secondary CTA Button

| Context     | Background  | Text      | Border      | Hover                                   |
| :---------- | :---------- | :-------- | :---------- | :-------------------------------------- |
| On light bg | transparent | `fg-950`  | `fg-950/30` | Border → `teal-500`, bg → `teal-500/10` |
| On dark bg  | transparent | `#f7eee5` | `#f7eee5`   | Opacity change                          |

### Button Component

| Variant   | Background   | Text      | Ring        | Hover Bg     |
| :-------- | :----------- | :-------- | :---------- | :----------- |
| Primary   | `accent-600` | `#ffffff` | —           | `accent-500` |
| Secondary | `#ffffff`    | `fg-950`  | `fg-950/10` | `fg-50`      |

### CTA Box

The CTA component supports two visual variants:

**`dark` variant (default)** — solid dark background for light sections:

| Element      | Color                                       |
| :----------- | :------------------------------------------ |
| Background   | `fg-950` (`#38070f`)                        |
| Headline     | `#ffffff`                                   |
| Description  | `gray-300`                                  |
| Primary Btn  | Secondary variant (white outline, inverted) |
| Secondary Lk | `#ffffff`                                   |

**`glass` variant** — semi-transparent panel for dark/colored sections:

| Element      | Color                                        |
| :----------- | :------------------------------------------- |
| Background   | `bg-white/10` + `inset-ring-white/20` + blur |
| Headline     | `#ffffff`                                    |
| Description  | `text-white/80`                              |
| Primary Btn  | Primary variant (terracotta, filled)         |
| Secondary Lk | `#ffffff`, hover: `gray-200`                 |

The `glass` variant is used automatically when a CTA sits inside a dark section
(e.g., the quiz callout on the teal Services section on the homepage).

### Segmented Control

The SegmentedControl accepts a `variant` prop for dark backgrounds:

| Element        | `default` (light bg) | `on-dark` (dark bg) |
| :------------- | :------------------- | :------------------ |
| Container Ring | `fg-950/10`          | `white/30`          |
| Inactive Text  | `fg-700`             | `white/70`          |
| Active Bg      | `accent-600`         | `accent-600`        |
| Active Text    | `#ffffff`            | `#ffffff`           |

---

## Hover Effects

All hover effects have been audited for correct behavior on dark section
backgrounds. The principle: interactive elements on dark backgrounds either live
inside white cards (so hover happens on a white surface) or use explicit
light-mode hover classes.

### Hover on dark section surface (not inside cards)

| Component        | Default State   | Hover State           |
| :--------------- | :-------------- | :-------------------- |
| Footer links     | `text-white/70` | `text-white`          |
| Slider buttons   | `bg-white/20`   | `bg-white/30`         |
| TextLink (light) | `text-white`    | `text-gray-200`       |
| SegmentedControl | no hover        | n/a (`:checked` only) |

### Hover inside white cards on dark backgrounds

| Component               | Default State     | Hover State       |
| :---------------------- | :---------------- | :---------------- |
| Button Primary          | `bg-accent-600`   | `bg-accent-500`   |
| Button Secondary        | `bg-white`        | `bg-fg-50`        |
| Coach "Learn more" link | `text-accent-600` | `text-accent-500` |

These are identical to light-background behavior because the card surface is
white in both contexts.

---

## Dark Mode

### Design Principles

Dark mode uses **two tones with strict alternation**, not background-color
variety. The existing warm-brown palette (`#1a1412` and `#241c19`, ΔL\* 4.2) is
sufficient — a third intermediate tone would be below reliable perceptual
discrimination on most monitors.

Key principles:

- **Elevation via borders, not shadows.** Shadows are invisible on dark
  surfaces. Cards use `bg-white/5` + `ring-1 ring-white/10`.
- **Accent colors carry the hierarchy.** `teal-400` and `accent-400` pop
  vibrantly on dark backgrounds, replacing the light-mode section-color variety.
- **Warm undertone preserved.** Both tones stay in the warm brown family.

### Section Background Mapping

The `dark:` fallbacks in `sectionBackground` are chosen for strict A-B
alternation on the homepage:

| Light variant | Dark fallback           | Role     |
| :------------ | :---------------------- | :------- |
| `default`     | `background-dark`       | A (deep) |
| `muted`       | `background-dark-muted` | B (lift) |
| `teal`        | `background-dark`       | A (deep) |
| `silver`      | `background-dark`       | A (deep) |
| `sage`        | `background-dark-muted` | B (lift) |
| `charcoal`    | `background-dark`       | A (deep) |

Homepage rhythm: `A-B-A-B-A-B-A-B-A` (Hero → Struggles → Services → Stats → USPs
→ Coaches → Stories → CTA → Footer).

### Card Surfaces in Dark Mode

All card components with `darkBackground={true}` include dark mode overrides:

| Component             | Light mode               | Dark mode                                     |
| :-------------------- | :----------------------- | :-------------------------------------------- |
| CoachCardCompact      | `bg-white shadow-lg`     | `bg-white/5 shadow-none ring-1 ring-white/10` |
| CoachCardExpanded     | `bg-white p-4 shadow-lg` | `bg-white/5 shadow-none ring-1 ring-white/10` |
| SuccessStoryCard      | `bg-white shadow-xl`     | `bg-white/5 shadow-none ring-1 ring-white/10` |
| ServiceCard (on dark) | `bg-white shadow-lg`     | `bg-white/5 shadow-none ring-1 ring-white/10` |

### ServiceCard Text Colors in Dark Mode

The `darkBackground` style path (used on teal section) includes full `dark:`
counterparts:

| Element     | Light (on white card) | Dark (on white/5 card) |
| :---------- | :-------------------- | :--------------------- |
| Title       | `text-teal-600`       | `text-teal-400`        |
| Price       | `text-foreground-950` | `text-white`           |
| Description | `text-foreground-600` | `text-gray-400`        |
| Check icon  | `text-teal-500`       | `text-teal-400`        |
| Feat. ring  | `ring-teal-300`       | `ring-teal-700`        |

### Dark Mode Text Hierarchy (unchanged)

| Role      | Class        | Hex       |
| :-------- | :----------- | :-------- |
| Primary   | `white`      | `#ffffff` |
| Secondary | `gray-300`   | `#d1d5db` |
| Tertiary  | `gray-400`   | `#9ca3af` |
| Muted     | `gray-500`   | `#6b7280` |
| Accent    | `accent-400` | `#e59a7f` |
| Teal      | `teal-400`   | `#5ab4ba` |

---

## Accessibility

### Contrast Ratios

All text combinations must meet WCAG 2.1 AA:

- **Normal text** (< 18px or < 14px bold): contrast ratio ≥ 4.5:1
- **Large text** (≥ 18px or ≥ 14px bold): contrast ratio ≥ 3:1

| Combination                        | Ratio  | Status                          |
| :--------------------------------- | :----- | :------------------------------ |
| `#38070f` on `#f7eee5` (default)   | ~14:1  | ✅ Excellent                    |
| `#38070f` on `#e8ddd6` (muted)     | ~11:1  | ✅ Excellent                    |
| `#ffffff` on `#2e6b72` (teal)      | ~5.5:1 | ✅ AA                           |
| `#ffffff` on `#4a5859` (charcoal)  | ~5.8:1 | ✅ AA                           |
| `#f7eee5` on `#4a5859` (charcoal)  | ~5.1:1 | ✅ AA                           |
| `#ffffff` on `#6d7b7b` (sage)      | ~3.6:1 | ✅ AA large text only           |
| `#ffffff` on `#6e6e6e` (silver)    | ~5.2:1 | ✅ AA                           |
| `#f0f0f0` on `#6e6e6e` (silver/90) | ~4.5:1 | ✅ AA (minimal headroom)        |
| `#bf7960` on `#f7eee5` (CTA btn)   | ~3.2:1 | ✅ AA large text (button ≥16px) |

**Dark mode contrast ratios:**

| Combination                         | Ratio  | Status       |
| :---------------------------------- | :----- | :----------- |
| `#ffffff` on `#1a1412` (dark)       | ~16:1  | ✅ Excellent |
| `#ffffff` on `#241c19` (dark-muted) | ~13:1  | ✅ Excellent |
| `#9ca3af` (gray-400) on `#1a1412`   | ~6.5:1 | ✅ AA        |
| `#9ca3af` (gray-400) on `#241c19`   | ~5.3:1 | ✅ AA        |
| `#e59a7f` (accent-400) on `#1a1412` | ~8:1   | ✅ Excellent |
| `#5ab4ba` (teal-400) on `#1a1412`   | ~8:1   | ✅ Excellent |

### Restrictions

1. **Sage (`#6d7b7b`)**: Never place normal-weight body text directly on this
   surface (~3.6:1 with white). All body text must be inside white cards. Only
   section headlines (≥18px, bold) may sit directly on the background.

2. **CTA buttons**: The terracotta accent (`#bf7960`) on cream (`#f7eee5`) is
   borderline at 3.2:1 — this passes AA for large text, which all buttons are
   (≥16px, font-weight 600). Do not use this color combination for small or
   regular-weight text.

---

## Related Documentation

| Document                                                        | Purpose                                  |
| :-------------------------------------------------------------- | :--------------------------------------- |
| [ADR-0014](../adr/0014-light-mode-section-background-system.md) | Decision rationale                       |
| [ARCHITECTURE.md](../ARCHITECTURE.md)                           | Overall system architecture              |
| `src/styles/global.css`                                         | Token definitions (`@theme`)             |
| `src/styles/sectionStyles.ts`                                   | Section background utility maps          |
| `src/components/ui/Button.astro`                                | Button variant implementations           |
| `src/components/ui/CTA.astro`                                   | CTA box: `dark` and `glass` variants     |
| `src/components/ui/Card.astro`                                  | Card: `darkBackground` prop              |
| `src/components/ui/SegmentedControl.astro`                      | Toggle: `default` and `on-dark` variants |
| `src/components/sections/services/ServiceCard.astro`            | 3-path style system for service cards    |
