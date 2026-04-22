# Revise Silver Surface Hex and Card Requirement for WCAG AA

Date: 2026-04-22

## Status

Accepted

## Context

[ADR-0014](0014-light-mode-section-background-system.md) established `silver`
(`#acacac`) as one of four new dark-toned section background variants.
Subsequent review flagged two converging problems with that choice:

- **WCAG AA for body text fails on the surface.** White text on `#acacac` gives
  ~2.4:1. `docs/reference/color-system.md` therefore classified the combination
  as "large bold headlines only" and required body text to sit inside white
  cards.
- **The card-requirement rule was not enforced in practice.**
  `src/components/sections/usps/UspCard.astro`, the only consumer of
  `background="silver"` in the current codebase (`src/pages/index.astro:95`),
  rendered descriptions directly on the surface without a card wrapper. This
  divergence between the specified contract and the actual rendering had existed
  since the USPs-on-silver assignment was made and was never caught.

An owner-reported readability issue on the homepage "What Makes Team 4 Pro
Unique" section was the direct trigger for this ADR.

We evaluated four options:

- **(A) Enforce white cards per ADR-0014.** Refactor `UspCard` to render each
  item inside a white card. Highest structural fidelity to the original ADR, but
  introduces a visible look-shift for a single consumer and expands the scope to
  a component restructure.
- **(B) Swap the USPs section to another variant.** Change `background="silver"`
  to `charcoal` or `teal`. Resolves contrast via a different surface, but
  concentrates the palette (charcoal would appear 3× on the homepage alongside
  Success Stories and Footer) and drops silver from the homepage rhythm
  entirely.
- **(C) Darken the silver token itself.** Change `--color-surface-silver` from
  `#acacac` to a darker hex so white text passes AA directly on the surface.
  Preserves the variant's slot in the homepage rhythm and the brand identity of
  a neutral grey section. Requires revising the ADR-0014 rule that silver
  requires white cards.
- **(D) Strengthen opacity only.** Replace `text-white/70` with `text-white` on
  UspCard descriptions. Does not address the underlying 2.4:1 failure; rejected
  as insufficient.

Option (C) is the chosen direction. It resolves contrast at the surface level,
removes the implicit obligation that any silver consumer must wrap content in
white cards, and preserves the visual rhythm of the homepage as approved in the
ADR-0014 mockup. The cost is that ADR-0014's silver hex and card requirement no
longer apply — hence this ADR partially supersedes ADR-0014 for the silver
variant only.

## Decision

Revise the `silver` section surface as follows:

1. **Hex.** `--color-surface-silver` changes from `#acacac` to `#6e6e6e`.
2. **Card requirement.** Body text may sit directly on the surface. White cards
   become optional rather than mandatory.
3. **Text colors.** `sectionHeadline[silver]` remains `text-white`.
   `sectionText[silver]` remains `text-white/90`. `UspCard` description class is
   aligned with the `sectionText[silver]` contract (it previously used
   `text-white/70`, a pre-existing inconsistency).

Contrast ratios on the new surface (WCAG 2.1 Luminance):

| Text            | Effective color |  Ratio  |  WCAG AA (normal)  |
| :-------------- | :-------------: | :-----: | :----------------: |
| `#ffffff`       |    `#ffffff`    | ~5.17:1 |       ✓ pass       |
| `text-white/90` |   ~`#f0f0f0`    | ~4.53:1 | ✓ pass (no margin) |

The `text-white/90` ratio passes AA with minimal headroom (0.03 above the 4.5
threshold). This is accepted as the trade-off to keep silver visually distinct
from both sage (`#6d7b7b`, L\* ≈ 50) and charcoal (`#4a5859`, L\* ≈ 42) —
further darkening would push silver into charcoal territory and erode the
palette variety.

The token name `silver` is retained despite `#6e6e6e` being objectively a
neutral dark grey. Renaming would be a larger, cross-cutting change without
functional benefit; the token abstraction means consumers do not depend on the
literal hex.

### Implementation

1. Update `--color-surface-silver` in `src/styles/global.css`.
2. Align the `darkBackground` branch of `descClass` in `UspCard.astro` with
   `sectionText[silver]` (opacity `/90` instead of `/70`).
3. Update `docs/reference/color-system.md` to reflect the new hex, per-variant
   contract row, rhythm diagram, and accessibility table.
4. Mark ADR-0014 as
   `Accepted (partially superseded by ADR-0032 for the silver surface hex and card requirement)`.
   Leave the rest of ADR-0014 historically accurate and structurally intact.

### Scope and Non-Goals

**In Scope:**

- Hex revision of `--color-surface-silver`.
- Removal of the "white cards required for silver" rule.
- Doc updates in `color-system.md` to reflect the new contract.
- Status update on ADR-0014 to signal partial supersession.

**Out of Scope:**

- Other section variants (teal, sage, charcoal). Sage retains its card-required
  rule (~3.6:1 with white — AA for large text only).
- Dark mode behavior. `sectionBackground[silver]` maps to
  `dark:bg-background-dark`, which does not use the silver token; dark mode
  contrast is unaffected.
- `sectionStyles.ts` type and map definitions (headline and text maps keep their
  existing values; only UspCard is brought in line).
- Typography or component-structure changes unrelated to silver.

## Consequences

### Positive

- **AA body text on silver without cards.** White (~5.17:1) and `text-white/90`
  (~4.53:1) pass AA directly on the surface. The previous pre-existing spec
  drift in `UspCard` (text on surface, no card wrapper) becomes the sanctioned
  pattern instead of a violation.
- **Minimal blast radius.** A single token change plus one component class
  string. Dark mode is untouched because the dark-mode fallback does not use the
  silver token.
- **Visual rhythm preserved.** The homepage A-B-A-B alternation documented in
  ADR-0014 is unchanged; silver remains the neutral grey step between muted
  (`#e8ddd6`) and sage (`#6d7b7b`).

### Negative

- **`text-white/90` passes AA with no headroom.** Any future change that affects
  effective text luminance (font weight, sub-pixel rendering on unusual
  displays, further token drift) risks dropping below 4.5:1. Consumers adding
  text on silver should verify contrast against the rendered pixels, not assume
  it.
- **Token name mismatch.** `silver` semantically implies a light metallic tone;
  `#6e6e6e` is perceptually a medium-dark grey. Retained for continuity; this is
  a latent naming debt if the palette evolves further.
- **Sage remains the anomaly.** With silver now AA-compliant for body text
  directly on the surface, sage (`#6d7b7b`, ~3.6:1 with white) is the only
  section variant that still requires card wrapping for body text. This is
  already documented in `color-system.md`, but the variant set becomes less
  uniform.

## Related ADRs

- [ADR-0014](0014-light-mode-section-background-system.md) — establishes the
  six-variant section background system. Partially superseded by this ADR for
  the silver surface hex and card requirement; all other variants and the
  prop-based pattern itself remain in force.

## References

- [Color System Reference](../reference/color-system.md) — current
  specification; reflects this ADR's decision.
- [WCAG 2.1 Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
