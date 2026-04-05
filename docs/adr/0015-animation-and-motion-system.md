# Scroll-Reveal Animation & Hover Interaction System

Date: 2026-03-22

## Status

Accepted

## Context

The approved visual mockup demonstrates scroll-triggered reveal animations,
hover micro-interactions, and counter animations throughout the homepage. The
production Astro codebase had no animation system — all sections appeared
statically without scroll-based entrance effects.

Key requirements from the mockup:

- **"Something always happens when you scroll"** — every section should animate
  on scroll into viewport
- Desktop hover effects where interactive elements exist
- Counter animations on stat numbers
- Ken-Burns background effect on fullscreen heroes
- `prefers-reduced-motion` compliance
- Compatibility with existing Astro build pipeline (ADR-0001) and client-side
  script strategy (ADR-0020, formerly ADR-0012)

Evaluated approaches:

1. **GSAP / Motion libraries** — powerful but adds dependency weight and
   complexity. Rejected (YAGNI).
2. **CSS-only `:has()` / scroll-timeline** — browser support insufficient for
   production. Rejected.
3. **Vanilla IntersectionObserver + CSS transitions** — zero dependencies,
   GPU-composited properties only, works with existing Astro module script
   pattern. **Chosen.**

## Decision

Implement a data-attribute-driven animation system using:

- **CSS classes** in `global.css` for animation definitions
- **`data-animate` attribute** on HTML elements to declare scroll-reveal type
- **A single IntersectionObserver** in `ScrollAnimations.astro` (module script)
  that toggles `.is-visible` class when elements enter the viewport
- **Separate CSS utility classes** for hover effects (`hover-scale`,
  `hover-icon-float`, `hover-shine`, `animated-underline`,
  `group-animated-underline`)

### Architecture

```
global.css                    ScrollAnimations.astro
┌──────────────────────┐      ┌───────────────────────┐
│ [data-animate] {     │      │ IntersectionObserver   │
│   opacity: 0;        │◄─────│ watches [data-animate] │
│   transition: ...    │      │ adds .is-visible       │
│ }                    │      │ unobserves after       │
│ [data-animate].      │      │                        │
│   is-visible {       │      │ Counter observer       │
│   opacity: 1;        │      │ watches [data-countup] │
│ }                    │      └───────────────────────┘
│ .hover-scale { ... } │
│ @media (hover) { }   │
│ @media (prefers-     │
│   reduced-motion) {} │
└──────────────────────┘
```

### Scroll-Reveal Variants

| Value                      | Effect                     | Use case                          |
| -------------------------- | -------------------------- | --------------------------------- |
| `fade-up`                  | Translate Y 40px + opacity | Standard — grids, cards, sections |
| `fade-up-lg`               | Translate Y 60px, 0.9s     | CTA boxes — more pronounced       |
| `fade-left` / `fade-right` | Translate X ±40px          | Split layouts, ping-pong rhythm   |
| `fade-down`                | Translate Y -40px          | Sticky filters                    |
| `fade`                     | Opacity only               | Subtle, no directional movement   |
| `scale`                    | Scale 0.92→1.0             | Highlighted blocks, pull quotes   |
| `scale-up`                 | Scale 0.92 + Y 30px        | Stat tiles                        |
| `bounce`                   | Elastic overshoot          | Thank-you page confirmation       |
| `line-grow`                | scaleY via @keyframes      | ProcessSteps timeline             |

### Hover Effects

| Class                      | Technique                | Use case                               |
| -------------------------- | ------------------------ | -------------------------------------- |
| `hover-scale`              | `scale: 1.02`            | Fully clickable cards (stretched link) |
| `hover-icon-float`         | `translateY(-4px)`       | Decorative icon groups                 |
| `hover-shine`              | `::after` gradient sweep | Primary buttons                        |
| `animated-underline`       | `background-size`        | Self-hovered links                     |
| `group-animated-underline` | `group:hover` triggered  | Decorative CTA text in cards           |

### Critical Constraint: No Hover + Scroll-Animate on Same Element

CSS `transition` shorthand on `.hover-scale` (`transition: scale 0.3s`)
**overwrites** the transition from `[data-animate]`
(`transition: opacity 0.7s, transform 0.7s`). This kills the scroll reveal — the
element jumps from invisible to visible without animation.

**Rule**: Always separate scroll-animate and hover onto different DOM elements:

```html
<li data-animate="fade-up">
  <!-- scroll animation -->
  <div class="hover-scale">
    <!-- hover effect -->
    <Card />
  </div>
</li>
```

### Script Initialization (Module Script Timing)

Astro module scripts (`<script>` without `is:inline`) are deferred — they
execute after DOM parsing. `DOMContentLoaded` may have already fired by the time
the script loads. The observer is therefore **called directly** at script load,
with event listeners as fallbacks for View Transitions.

```typescript
initScrollAnimations(); // direct call — DOM is ready
document.addEventListener('DOMContentLoaded', initScrollAnimations);
document.addEventListener('astro:page-load', initScrollAnimations);
```

This follows ADR-0020's module script pattern but adds the direct call to handle
the timing edge case.

### Scope and Non-Goals

**In Scope:**

- Scroll-reveal animations for all sections on all pages
- Hover micro-interactions for interactive elements
- Counter animations for stat numbers
- Ken-Burns background effect on fullscreen heroes
- FAQ smooth expand/collapse
- PullQuote border-grow animation
- `prefers-reduced-motion` compliance
- Documentation in `docs/reference/animation-system.md`

**Out of Scope:**

- Page Transition animations (View Transitions API) — separate concern
- Parallax scrolling — too aggressive for the brand tone
- Lottie or illustrative animations — no design assets
- Scroll-hijacking or scroll-snap on sections
- Framework migration (React Spring, Framer Motion) — vanilla is sufficient

## Consequences

### Positive

- **Zero dependencies**: No animation library to maintain or update
- **GPU-composited**: Only `opacity`, `transform`, and `scale` are animated
- **Declarative**: Adding animation = adding one `data-animate` attribute
- **Accessible**: Full `prefers-reduced-motion` support
- **Performant**: Observer unobserves after trigger — no ongoing scroll cost
- **Consistent hover pattern**: Clear rule for when hover applies (element must
  be fully interactive)

### Negative

- **CSS transition conflict risk**: Hover and scroll-animate on the same element
  silently breaks animations. Requires developer awareness.
- **No reverse animation**: Elements don't animate out when scrolling back up.
  This is intentional (matches Apple's pattern) but limits visual options.
- **Manual delay management**: Stagger delays are either CSS-based
  (`data-animate-stagger`) or explicit (`data-animate-delay`). No automatic
  viewport-position-based staggering.

### Risk Mitigation

- **Transition conflict**: Documented as prominent warning in reference docs and
  in this ADR. Code review should flag `data-animate` + hover class on same
  element.
- **Stagger reliability**: For critical sequences (Coaches, ProcessSteps),
  explicit `data-animate-delay` attributes are used instead of the CSS stagger
  mechanism, which can have specificity issues.
- **Module script timing**: Direct call + event listener fallback covers all
  initialization scenarios.

## Success Criteria

- Every section on every page has a visible scroll-reveal animation
- Hover effects only appear on fully interactive elements (stretched-link cards,
  buttons, standalone links)
- `prefers-reduced-motion: reduce` disables all movement
- No Cumulative Layout Shift (CLS) from animations
- No `console.log` or debug output in production build

## References

- [Animation System Reference](../reference/animation-system.md) — full
  specification with per-page breakdown and maintenance guide
- [ADR-0020: Client-Side Script Strategy](0020-client-side-script-strategy-revised.md)
  — module vs `is:inline` decision that governs ScrollAnimations.astro
- [ADR-0014: Section Background System](0014-light-mode-section-background-system.md)
  — visual rhythm that animations enhance
- [Apple iPhone page](https://www.apple.com/de/iphone/) — design reference for
  fade-up scroll reveals and card scale hover
