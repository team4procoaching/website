# Animation & Motion System

**Status:** Implemented for all live pages. Sections marked "Planned" describe
pages listed in
[ARCHITECTURE.md → Pending Work](../ARCHITECTURE.md#pending-work) and are not
yet on `main`.

---

## 1. Overview

Every section reveals on scroll into viewport. Interactive elements provide
hover feedback. The system uses exclusively vanilla CSS + a single global
IntersectionObserver — no external libraries.

### Files

| File                                       | Purpose                                                           |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `styles/global.css`                        | CSS classes for scroll reveals, hover effects, special animations |
| `components/layout/ScrollAnimations.astro` | Global IntersectionObserver + counter animation                   |
| `layouts/BaseLayout.astro`                 | Includes ScrollAnimations once                                    |

---

## 2. Scroll Reveal System

### How It Works

1. Add `data-animate="variant"` attribute to the HTML element
2. CSS sets `opacity: 0` + a `transform` starting state
3. IntersectionObserver watches the element (threshold 15%, 50px bottom margin)
4. On entering viewport: class `is-visible` is added
5. CSS transition animates `opacity` and `transform` to the end state

The `15%` threshold and `50px` bottom margin are a deliberate cross-file
contract between `ScrollAnimations.astro` and every `data-animate` element —
changing them shifts the reveal timing site-wide. Treat a change as a
system-wide decision, not a local tweak.

### Variants

| Attribute Value | Effect                           | When to Use                                                |
| --------------- | -------------------------------- | ---------------------------------------------------------- |
| `fade-up`       | Slide up from below (40px)       | **Default.** Grids, cards, sections — Apple-style.         |
| `fade-up-lg`    | Slide up from below (60px, 0.9s) | Standalone CTA boxes — slower and more pronounced.         |
| `fade-left`     | Slide in from left               | Left column in split layouts, ping-pong with `fade-right`. |
| `fade-right`    | Slide in from right              | Right column, counter-direction to `fade-left`.            |
| `fade-down`     | Slide down from above            | Rare. Sticky filters that "drop in" from above.            |
| `fade`          | Opacity only, no movement        | Subtle reveal without directional motion.                  |
| `scale`         | Zoom from 92% to 100%            | Highlighted standalone blocks (e.g., pull quotes).         |
| `scale-up`      | Zoom + upward (92%, 30px)        | Stat tiles — combines attention-grab with movement.        |
| `bounce`        | Elastic bounce-in (0.6→1.08→1.0) | Thank-you page check icon only.                            |
| `line-grow`     | Vertical line grows from top     | ProcessSteps timeline line only.                           |

### Delay

Explicit delays via `data-animate-delay="value"`:

```html
<!-- First element: no delay (immediate) -->
<div data-animate="fade-up">...</div>

<!-- Second element: 200ms delay -->
<div data-animate="fade-up" data-animate-delay="200">...</div>
```

Available values: `100`, `150`, `200`, `300`, `400`, `450`, `500`, `600`.

### Stagger (Parent-Driven)

`data-animate-stagger` on a parent element automatically distributes increasing
delays to direct children (50ms, 120ms, 190ms, ..., up to child 8).

```html
<ul data-animate-stagger>
  <li data-animate="fade-up">Card 1</li>
  <!-- delay: 50ms -->
  <li data-animate="fade-up">Card 2</li>
  <!-- delay: 120ms -->
  <li data-animate="fade-up">Card 3</li>
  <!-- delay: 190ms -->
</ul>
```

### ⚠️ Critical Rule: No Hover + Scroll Animation on the Same Element

CSS `transition` is a shorthand property. When `.hover-scale`
(`transition: transform 0.3s`) and `[data-animate]`
(`transition: opacity 0.7s, transform 0.7s`) are on the same element, one
completely overwrites the other.

**Solution:** Always separate them onto different elements:

```html
<!-- ✅ CORRECT -->
<li data-animate="fade-up">
  <!-- scroll animation -->
  <div class="hover-scale">
    <!-- hover effect -->
    <Card />
  </div>
</li>

<!-- ❌ WRONG — transition conflict -->
<li data-animate="fade-up" class="hover-scale">
  <Card />
</li>
```

### Reduced Motion

When `prefers-reduced-motion: reduce` is active, all transforms are disabled and
transitions shortened to 0.01s. Content appears immediately visible without
movement. Implemented via `[data-animate][data-animate]` (doubled selector for
increased specificity without `!important`).

---

## 3. Hover Effects

All hover effects are wrapped in `@media (hover: hover)` — they only apply on
devices with mouse/trackpad. For keyboard users, the effects also trigger via
`:focus-visible` or `:focus-within` (for cards with stretched links).

### When to Use Which Hover

| Effect              | CSS Class                  | Keyboard Trigger | Use On                                        |
| ------------------- | -------------------------- | ---------------- | --------------------------------------------- |
| **Card Scale**      | `hover-scale`              | `:focus-within`  | Fully clickable cards (stretched link/button) |
| **Icon Float**      | `hover-icon-float`         | —                | Decorative icon groups                        |
| **Button Shimmer**  | `hover-shine`              | `:focus-visible` | Primary buttons                               |
| **Link Underline**  | `animated-underline`       | `:focus-visible` | Directly hovered links/buttons                |
| **Group Underline** | `group-animated-underline` | `:focus-within`  | Decorative CTA text inside clickable cards    |

### Decision Tree: Does This Element Need a Hover?

```
Is the element interactive (clickable)?
├── No → NO hover effect
└── Yes → Is the entire card clickable (stretched link)?
    ├── Yes → hover-scale on card container
    │         + group-animated-underline on decorative CTA text
    └── No → Is it a button?
        ├── Yes → hover-shine (primary) or native Tailwind hover (secondary)
        └── No → Is it a text link?
            └── Yes → animated-underline
```

---

## 4. Special Animations

### Ken-Burns (HeroFullscreen)

Class `hero-ken-burns` on the section element. Background image/video slowly
zooms (scale 1.0 → 1.06, 20s, infinite alternate).

### PullQuote Border-Grow

Class `pullquote-animate` + `data-animate="fade"` on the `<figure>`. The left
border grows via `clip-path` animation from top to bottom.

### Counter Countup

Attribute `data-countup` on stat numbers, configured via data attributes:

- `data-countup-target`: Numeric target value (required)
- `data-countup-suffix`: Text appended after the number, e.g. `+`, `%`
  (optional)

The observer (threshold 0.5) starts a 2s ease-out-cubic animation from 0 to the
target value. Values are parsed at build time by `parseCounterValue()` from
`~/utils/counter.ts` and set as data attributes — the client never parses
rendered text.

```html
<!-- Build time: parseCounterValue('500+') → target=500, suffix='+' -->
<dd data-countup data-countup-target="500" data-countup-suffix="+">500+</dd>
```

---

## 5. Card Pattern (Consistency Rule)

All interactive cards follow the same structure:

```
┌─ Container (group relative, hover-scale)
│  ├─ Invisible Stretched Link/Button (absolute inset-0)
│  ├─ Card Content (flex-1 for equal height)
│  └─ Visible CTA Button (relative z-10, above stretched link)
└─
```

| Card                 | Stretched Element           | Visible CTA          |
| -------------------- | --------------------------- | -------------------- |
| ServiceCard          | `<a>` inside `<h3>`         | Button "Get Started" |
| CoachCardExpanded    | `<button absolute inset-0>` | Button "Meet {name}" |
| CoachCardCompact     | `<button absolute inset-0>` | Button "Meet {name}" |
| SuccessStoryGridCard | `<a>` inside `<h3>`         | Text "Read story →"  |

---

## 6. Per-Page Animation Map

### Homepage

| Section                         | Scroll Animation                                                             | Hover                                |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| Hero (HeroSplit)                | Headline: `fade-right`, Body: `fade-right` +200ms, Image: `fade-left` +100ms | —                                    |
| We Get Your Struggles (Content) | Headline: `fade-left`, Body: `fade-left` +100ms, Image: `fade-up`            | —                                    |
| Services                        | Header: `fade-up`, Cards: `fade-up` + stagger                                | `hover-scale` on card wrapper        |
| Stats                           | Header: `fade-up`, Tiles: `scale-up` + stagger + countup                     | —                                    |
| USPs                            | Container: `fade-up` + stagger, each card: `fade-up`                         | `hover-icon-float` on inner div      |
| Coaches                         | Cards: `fade-up` with explicit delays (0, 200, 400ms)                        | `hover-scale` on inner div           |
| Success Stories                 | Slider container: `fade-up`                                                  | — (cards not individually clickable) |
| Final CTA                       | `fade-up-lg`                                                                 | —                                    |

### Coaches Page

| Section                   | Scroll Animation                                                       | Hover                      |
| ------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| Hero (HeroSplit)          | Standard split animation, Stats: `scale-up` + stagger + countup        | —                          |
| Why Team Beats Individual | Two-column: `fade-left` / `fade-right`, PullQuote: `pullquote-animate` | —                          |
| Testimonial               | Image: `fade-left`, Quote: `fade-right` +150ms                         | —                          |
| Meet the Champions        | Cards: `fade-up` with explicit delays (0, 200, 400ms)                  | `hover-scale` on inner div |
| CTA                       | `fade-up-lg`                                                           | —                          |

### Services Page

| Section               | Scroll Animation                                                   | Hover                         |
| --------------------- | ------------------------------------------------------------------ | ----------------------------- |
| Hero (HeroFullscreen) | Staggered: `fade-up` 300/450/600ms, Ken-Burns background           | —                             |
| ServicesCatalog       | Header: `fade-up`, Tabs: `fade` +200ms, Cards: `fade-up` + stagger | `hover-scale` on card wrapper |
| Bottom CTA            | `fade-up-lg`                                                       | —                             |

### How It Works

| Section               | Scroll Animation                                                                 | Hover |
| --------------------- | -------------------------------------------------------------------------------- | ----- |
| Hero (HeroFullscreen) | Staggered: `fade-up`, Ken-Burns                                                  | —     |
| ProcessSteps          | Header: `fade-up`, Steps: `fade-left` with increasing delays, Lines: `line-grow` | —     |
| FAQ                   | Header: `fade-up`, Items: `fade-up` + stagger, smooth expand/collapse            | —     |
| CTA                   | `fade-up-lg`                                                                     | —     |

### Success Stories (Index)

| Section               | Scroll Animation                                                           | Hover                                 |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| Hero (HeroFullscreen) | Staggered: `fade-up`, Ken-Burns                                            | —                                     |
| Stories Grid          | Header: `fade-up`, Filter: `fade-down` +200ms, Cards: `scale-up` + stagger | `hover-scale` on SuccessStoryGridCard |
| Testimonial Grid      | Columns: `fade-up` with delays (0, 150, 300ms)                             | —                                     |
| CTA                   | `fade-up-lg`                                                               | —                                     |

### Success Story Detail — Planned

> Not yet on `main`. Design reference for the `/success-stories/[slug]` route
> listed under Pending Work in ARCHITECTURE.md.

| Section      | Scroll Animation              | Hover |
| ------------ | ----------------------------- | ----- |
| Back Link    | `fade-left`                   | —     |
| Story Header | `fade-up`                     | —     |
| Before/After | `fade-up`                     | —     |
| Pull Quote   | `scale` + `pullquote-animate` | —     |
| Story Body   | `fade-up`                     | —     |
| CTA          | `fade-up-lg`                  | —     |
| Navigation   | `fade-up`                     | —     |

### Contact

| Section      | Scroll Animation                                                                 | Hover                          |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------ |
| Contact Info | Headline: `fade-left`, Intro: `fade-left` +100ms, Methods: `fade-left` + stagger | —                              |
| Form         | `fade-right` +200ms                                                              | `hover-shine` on submit button |

### Thank You

| Section    | Scroll Animation |
| ---------- | ---------------- |
| Check Icon | `bounce`         |
| Headline   | `fade-up` +200ms |
| Text       | `fade-up` +300ms |
| Button     | `fade-up` +400ms |

---

## 7. Maintenance Guide

### Animating a New Element

1. Add `data-animate="fade-up"` to the element (default choice)
2. Optional: add `data-animate-delay="200"` for staggered timing
3. Check: does the element also have a hover class? → Separate onto different
   elements

### Creating a New Card Component

1. `group relative` on the outer container
2. Stretched link/button with `absolute inset-0` for full-card clickability
3. Visible CTA button with `relative z-10`
4. `hover-scale` on a wrapper **between** `data-animate` and card content
5. `flex-1` on the content area for equal card heights

### Adding a New Hover Effect

1. Define inside `@media (hover: hover)` in global.css
2. Add `:focus-visible` (or `:focus-within` for cards) alongside `:hover`
3. Add matching rule in `@media (prefers-reduced-motion: reduce)`
4. Never place on the same element as `data-animate`

### Performance Rules

- Only animate `transform` and `opacity` (GPU-composited)
- Never animate `width`, `height`, `margin`, `padding`
- `will-change` is intentionally NOT set globally — the browser's own heuristics
  perform better when many elements are present
- IntersectionObserver unobserves after trigger → no ongoing scroll overhead
