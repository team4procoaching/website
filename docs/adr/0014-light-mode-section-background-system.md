# Introduce Section Background Variants for Light Mode

Date: 2026-03-22

## Status

Accepted

## Context

The original light-mode design uses only two section backgrounds — `default`
(`#f7eee5` warm cream) and `muted` (`#e8ddd6` sand). While clean, this limits
the visual rhythm of pages to subtle alternation between two very similar tones.

The approved visual mockup demonstrates a significantly richer approach:
**alternating light and dark sections** that create dramatic visual contrast,
guide the user's eye, and give each content block a distinct personality.
Specifically, the mockup introduces four new dark-toned section backgrounds for
the homepage.

The challenge: the current component system hard-codes text colors for light
backgrounds (e.g., `text-foreground-950`). Supporting dark section backgrounds
requires conditional text and card styling — components must know whether they
sit on a light or dark surface.

We evaluated two approaches:

- **CSS-only (parent selectors)**: Use Tailwind's `group` or CSS `:has()` to
  propagate background context. Clean but limited — Tailwind v4 utilities don't
  natively support arbitrary parent-based color switching.
- **Prop-based**: Extend the existing `background` prop on section components to
  accept new variants, with each variant carrying its own text/card color
  contract. Explicit, composable, matches the existing pattern in
  `styles/sectionStyles.ts`.

## Decision

We will extend the section background system from 2 to 6 variants via the
existing prop-based pattern. Each variant defines a background color and an
implicit text color contract.

### New Variants

| Variant    | Hex       | Text Color | Card Style  | Source   |
| :--------- | :-------- | :--------- | :---------- | :------- |
| `default`  | `#f7eee5` | Dark       | —           | Existing |
| `muted`    | `#e8ddd6` | Dark       | White cards | Existing |
| `teal`     | `#2e6b72` | Light      | White cards | New      |
| `silver`   | `#acacac` | Light      | White cards | New      |
| `sage`     | `#6d7b7b` | Light      | White cards | New      |
| `charcoal` | `#4a5859` | Light      | White cards | New      |

### Implementation

1. Add new color tokens to `@theme` in `global.css`
2. Extend `SectionBackground` type and `sectionBackground` map in
   `styles/sectionStyles.ts`
3. Add companion `sectionText` map for conditional text colors
4. Adapt components that render on dark backgrounds (Footer, Homepage sections)
5. Dark mode (`dark:`) classes remain unchanged — the new variants only affect
   light mode

### Scope and Non-Goals

**In Scope:**

- New CSS tokens for section surface colors
- Extended `SectionBackground` type with 6 variants
- Section-by-section color mapping for all pages (documented in
  `reference/color-system.md`)
- Footer background change from `default` to `charcoal`
- Homepage section background assignments per approved mockup
- Accessibility review of all new color combinations

**Out of Scope:**

- Dark mode changes (unaffected — all `dark:` classes stay as-is)
- Typography changes (font sizes, weights, families)
- Layout or spacing changes
- New component creation (existing components are adapted)

## Consequences

### Positive

- Visual richness matching the approved design mockup
- Clear visual hierarchy — users can distinguish sections at a glance
- Stronger brand identity through distinctive color rhythm
- Systematic approach — every section's colors are documented and predictable
- No breaking changes — existing `default` and `muted` work exactly as before

### Negative

- Components on dark backgrounds need conditional text classes, adding
  complexity to the template logic
- The `silver` background (`#acacac`) has a contrast ratio of only 2.4:1 with
  white text — body text must never sit directly on this surface (only inside
  white cards or as large bold headlines)
- More visual variants to maintain — design consistency requires discipline

### Risk Mitigation

- Accessibility: all contrast ratios documented in `reference/color-system.md`;
  `silver` variant restricted to card-based layouts with large headline-only
  direct placement
- Incremental rollout: implement Footer first (lowest risk), then Homepage
  sections one by one
- Dark mode isolation: new tokens exist in `@theme` only — `dark:` prefixed
  classes are untouched

## Success Criteria

- All pages match the section-by-section color mapping documented in
  `reference/color-system.md`
- WCAG 2.1 AA compliance: all text meets minimum contrast ratios (4.5:1 normal
  text, 3:1 large text) — verified per combination in the reference doc
- No visual regression in dark mode
- No accessibility regression (Lighthouse accessibility score ≥ 95)

## References

- [Color System Reference](../reference/color-system.md) — full specification
- [Visual Mockup](<team4pro-with-colors(4)(3).html>) — approved homepage design
- [Tailwind CSS v4 Theming](https://tailwindcss.com/docs/theme)
- [WCAG 2.1 Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
