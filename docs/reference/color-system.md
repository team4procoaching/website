# Color System Reference

This document specifies the complete light-mode color system for the Team 4 Pro
Coaching website. It covers color tokens, section background variants,
page-level section mappings, component color contracts, and accessibility
compliance.

**Dark mode is unaffected** — all `dark:` classes remain unchanged. This
document exclusively covers light-mode colors.

> **Decision**: [ADR-0014](../adr/0014-light-mode-section-background-system.md)

## 📋 Table of Contents

- [Color Tokens](#-color-tokens)
- [Section Background System](#-section-background-system)
- [Page Section Mappings](#-page-section-mappings)
- [Component Color Contracts](#-component-color-contracts)
- [Button and CTA Colors](#-button-and-cta-colors)
- [Accessibility](#-accessibility)
- [Implementation Guide](#-implementation-guide)

---

## 🎨 Color Tokens

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

| Token              | Hex       | Role                                  |
| :----------------- | :-------- | :------------------------------------ |
| `surface-teal`     | `#2e6b72` | Section bg: Services                  |
| `surface-silver`   | `#acacac` | Section bg: USPs/Advantages           |
| `surface-sage`     | `#6d7b7b` | Section bg: Coaches                   |
| `surface-charcoal` | `#4a5859` | Section bg: Success Stories, Footer   |
| `pink`             | `#ec4899` | Warning highlights, story type labels |

### Token Relationships

```text
Page Background Spectrum (light → dark):

#f7eee5 ─── #e8ddd6 ─── #acacac ─── #6d7b7b ─── #4a5859 ─── #2e6b72 ─── #38070f
default     muted       silver      sage        charcoal    teal        CTA dark
  ↑           ↑           ↑           ↑           ↑           ↑           ↑
dark text   dark text   light text  light text  light text  light text  light text
```

---

## 🧱 Section Background System

### Type Definition

Located in `src/utils/styles.ts`:

```typescript
export type SectionBackground =
  | 'default' // #f7eee5 — warm cream
  | 'muted' // #e8ddd6 — warm sand
  | 'teal' // #2e6b72 — deep teal
  | 'silver' // #acacac — neutral silver
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

```typescript
export const sectionText: Record<SectionBackground, string> = {
  default: 'text-foreground-950 dark:text-white',
  muted: 'text-foreground-950 dark:text-white',
  teal: 'text-white',
  silver: 'text-white',
  sage: 'text-white',
  charcoal: 'text-white',
};
```

### Contract Per Variant

| Variant    | Background | Headline  | Body Text        | Card Bg   | Card Border             | Card Title | Card Body          |
| :--------- | :--------- | :-------- | :--------------- | :-------- | :---------------------- | :--------- | :----------------- |
| `default`  | `#f7eee5`  | `fg-950`  | `fg-950`         | —         | —                       | —          | —                  |
| `muted`    | `#e8ddd6`  | `fg-950`  | `fg-950`         | `#ffffff` | `fg-950/10`             | `teal-500` | `rgba(0,0,0,0.8)`  |
| `teal`     | `#2e6b72`  | `#ffffff` | `#ffffff`        | `#ffffff` | `rgba(0,0,0,0.1)`       | `teal-500` | `rgba(0,0,0,0.8)`  |
| `silver`   | `#acacac`  | `#ffffff` | ⚠️ on cards only | `#ffffff` | `rgba(255,255,255,0.1)` | `#6d7b7b`  | `rgb(159,159,159)` |
| `sage`     | `#6d7b7b`  | `#ffffff` | ⚠️ on cards only | `#ffffff` | `rgba(255,255,255,0.1)` | `#6d7b7b`  | `rgba(0,0,0,0.8)`  |
| `charcoal` | `#4a5859`  | `#f7eee5` | `#ffffff`        | `#ffffff` | `rgba(255,255,255,0.1)` | `teal-500` | `rgba(0,0,0,0.8)`  |

> ⚠️ **Silver and Sage**: Body text must never sit directly on the background
> surface. Always place body text inside white cards. Only large bold headlines
> (≥18px, font-weight ≥700) may appear directly on the surface.

---

## 📄 Page Section Mappings

### Visual Rhythm

The core design principle is **alternating light and dark sections** to create
visual drama and guide the user's eye. Each page has its own rhythm, documented
below.

### Homepage (`/`)

| #   | Section               | Background     | Key Notes                                         |
| :-- | :-------------------- | :------------- | :------------------------------------------------ |
| 1   | Header + HeroSplit    | `default`      | CTA Primary: `accent-600`, Secondary: `fg-950/30` |
| 2   | We Get Your Struggles | `muted`        | Content component with image                      |
| 3   | Services (featured)   | **`teal`**     | White cards, quiz callout: `teal-500/30` bg       |
| 4   | Stats / Trust         | `muted`        | White stat cards, numbers: `fg-950`               |
| 5   | USPs / Advantages     | **`silver`**   | White cards, icon/title: `#6d7b7b`                |
| 6   | Coaches               | **`sage`**     | White cards, coach title: `#6d7b7b`               |
| 7   | Success Stories       | **`charcoal`** | White cards, name: `teal-500`, type: `pink`       |
| 8   | Final CTA             | `default`      | Contains CTA box (`fg-950` dark bg)               |
| 9   | Footer                | **`charcoal`** | Headings: `#f7eee5`, links: `#ffffff`             |

```text
Visual rhythm:

LIGHT    ██████████  Header + Hero (#f7eee5)
MUTED    ██████████  Struggles (#e8ddd6)
DARK     ██████████  Services (#2e6b72)         ← teal
MUTED    ██████████  Stats (#e8ddd6)
MEDIUM   ██████████  USPs (#acacac)             ← silver
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
| 3   | FaqAccordion   | `muted`       | Dividers: `fg-950/10`                     |
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

### Success Story Detail (`/success-stories/[slug]`)

| #   | Section             | Background | Key Notes                                       |
| :-- | :------------------ | :--------- | :---------------------------------------------- |
| 1   | Back Link + Header  | `default`  | Transformation: `accent-600`, tiles: `fg-950/5` |
| 2   | Before/After Images | `muted`    | Visual break                                    |
| 3   | Pull Quote + Body   | `default`  | Border: `accent-600`, prose: `fg-600`           |
| 4   | Bottom CTA          | `muted`    | CTA box: `fg-950` dark bg                       |
| 5   | Navigation          | `default`  |                                                 |
| 6   | Footer              | `charcoal` |                                                 |

### Contact (`/contact`)

| #   | Section             | Background | Key Notes                                  |
| :-- | :------------------ | :--------- | :----------------------------------------- |
| 1   | Contact Info (left) | `muted`    | Icons: `fg-400`                            |
| 2   | Form (right)        | `default`  | Inputs: white, focus: `accent-600` outline |
| 3   | Footer              | `charcoal` |                                            |

### Thanks (`/contact/thanks`)

| #   | Section           | Background | Key Notes                                       |
| :-- | :---------------- | :--------- | :---------------------------------------------- |
| 1   | Thank You message | `default`  | Icon circle: `accent-100` bg, `accent-600` icon |
| 2   | Footer            | `charcoal` |                                                 |

---

## 🧩 Component Color Contracts

### Cards

| Context                           | Card Bg   | Border                  | Shadow      |
| :-------------------------------- | :-------- | :---------------------- | :---------- |
| On light bg (`default`, `muted`)  | `#ffffff` | `fg-950/5` ring         | `shadow-lg` |
| On dark bg (`teal`, `sage`, etc.) | `#ffffff` | `rgba(255,255,255,0.1)` | none        |

### Service Cards

| Variant  | Card Bg   | Title     | Price     | Features   | Check Icon   |
| :------- | :-------- | :-------- | :-------- | :--------- | :----------- |
| Standard | `#ffffff` | `fg-950`  | `fg-950`  | `fg-600`   | `accent-600` |
| Featured | `fg-950`  | `#ffffff` | `#ffffff` | `gray-300` | `#ffffff`    |

### Coach Cards

| Element        | On light bg                 | On sage bg (`#6d7b7b`)   |
| :------------- | :-------------------------- | :----------------------- |
| Card Bg        | `fg-950/5`                  | `#ffffff`                |
| Name           | `fg-950`                    | `fg-950` (on white card) |
| Title          | `accent-600`                | `#6d7b7b`                |
| Bio            | `fg-600`                    | `rgba(0,0,0,0.8)`        |
| Specialty Tags | `accent-100` / `accent-700` | same                     |

### Success Story Cards

| Element       | Color                           |
| :------------ | :------------------------------ |
| Card Bg       | `#ffffff`                       |
| Name          | `fg-950`                        |
| Program       | `accent-600`                    |
| Duration      | `fg-500`                        |
| Quote         | `fg-600`                        |
| Program Badge | `teal-100` bg / `teal-700` text |

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

## 🔘 Button and CTA Colors

### Primary CTA Button

| Property   | Value                                  |
| :--------- | :------------------------------------- |
| Background | `accent-600` (`#bf7960`)               |
| Text       | `#f7eee5`                              |
| Hover      | Shadow intensifies, `translateY(-2px)` |
| Box Shadow | `0 10px 30px rgba(191, 121, 96, 0.3)`  |

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

### CTA Box (Dark)

| Element      | Color                                         |
| :----------- | :-------------------------------------------- |
| Background   | `fg-950` (`#38070f`)                          |
| Headline     | `#ffffff`                                     |
| Description  | `gray-300`                                    |
| Primary Btn  | `accent-600` bg (secondary variant, inverted) |
| Secondary Lk | `#ffffff`                                     |

---

## ♿ Accessibility

### Contrast Ratios

All text combinations must meet WCAG 2.1 AA:

- **Normal text** (< 18px or < 14px bold): contrast ratio ≥ 4.5:1
- **Large text** (≥ 18px or ≥ 14px bold): contrast ratio ≥ 3:1

| Combination                       | Ratio  | Status                          |
| :-------------------------------- | :----- | :------------------------------ |
| `#38070f` on `#f7eee5` (default)  | ~14:1  | ✅ Excellent                    |
| `#38070f` on `#e8ddd6` (muted)    | ~11:1  | ✅ Excellent                    |
| `#ffffff` on `#2e6b72` (teal)     | ~5.5:1 | ✅ AA                           |
| `#ffffff` on `#4a5859` (charcoal) | ~5.8:1 | ✅ AA                           |
| `#f7eee5` on `#4a5859` (charcoal) | ~5.1:1 | ✅ AA                           |
| `#ffffff` on `#6d7b7b` (sage)     | ~3.6:1 | ✅ AA large text only           |
| `#ffffff` on `#acacac` (silver)   | ~2.4:1 | ⚠️ Large bold headlines only    |
| `#bf7960` on `#f7eee5` (CTA btn)  | ~3.2:1 | ✅ AA large text (button ≥16px) |

### Restrictions

1. **Silver (`#acacac`)**: Never place normal-weight body text directly on this
   surface. All body text must be inside white cards. Only section headlines
   (≥18px, bold) may sit directly on the background.

2. **Sage (`#6d7b7b`)**: Same restriction as Silver — body text on white cards
   only. Headlines are permitted directly on the surface.

3. **CTA buttons**: The terracotta accent (`#bf7960`) on cream (`#f7eee5`) is
   borderline at 3.2:1 — this passes AA for large text, which all buttons are
   (≥16px, font-weight 600). Do not use this color combination for small or
   regular-weight text.

---

## 🔧 Implementation Guide

### Phase 1: Foundation (Low Risk)

1. **Add new tokens** to `@theme` in `global.css`:

   ```css
   @theme {
     /* ... existing tokens ... */

     /* Section surface colors (light mode only) */
     --color-surface-teal: #2e6b72;
     --color-surface-silver: #acacac;
     --color-surface-sage: #6d7b7b;
     --color-surface-charcoal: #4a5859;

     /* Accent: Pink (used sparingly) */
     --color-pink: #ec4899;
   }
   ```

2. **Extend `utils/styles.ts`** with new variants and text color map (see type
   definitions above).

3. **Update Footer** from `bg-background` to `bg-surface-charcoal` with white
   text. This is the simplest change since Footer is a single component used
   globally.

### Phase 2: Homepage Sections

Implement section-by-section, top to bottom:

4. **Services section** → `teal` background. Requires white section headline/
   subtitle and white cards with dark text inside.
5. **USPs section** → `silver` background. Same card pattern.
6. **Coaches section** → `sage` background. White cards with adapted title
   color.
7. **Success Stories section** → `charcoal` background. White cards,
   teal-colored story names.

### Phase 3: Subpage Sections

8. **Coaches page** → Coach Cards section gets `sage` background.
9. Remaining subpages use only `default`/`muted` — no changes needed beyond the
   Footer (already done in Phase 1).

### Testing Checklist

For each changed section, verify:

- [ ] Light mode: correct background color
- [ ] Light mode: correct text colors (headline, body, card contents)
- [ ] Dark mode: no visual regression (`dark:` classes unchanged)
- [ ] Responsive: section looks correct at mobile, tablet, desktop widths
- [ ] Cards: correct background, border, shadow for the context
- [ ] CTAs: correct button variant (light/dark surface)
- [ ] Lighthouse accessibility score ≥ 95

---

## 📚 Related Documentation

| Document                                                        | Purpose                         |
| :-------------------------------------------------------------- | :------------------------------ |
| [ADR-0014](../adr/0014-light-mode-section-background-system.md) | Decision rationale              |
| [ARCHITECTURE.md](../ARCHITECTURE.md)                           | Overall system architecture     |
| `src/styles/global.css`                                         | Token definitions (`@theme`)    |
| `src/utils/styles.ts`                                           | Section background utility maps |
| `src/components/ui/Button.astro`                                | Button variant implementations  |
| `src/components/ui/CTA.astro`                                   | CTA box component               |
