# FilterBar Labelling: ariaLabel as Equal Alternative to ariaLabelledBy

Date: 2026-04-19

## Status

Consolidated into
[src/components/ui/FilterBar.astro](../../../src/components/ui/FilterBar.astro)
(Props type + JSDoc)

## Context

When FilterBar was introduced (see ADR-0023), the initial contract allowed only
`ariaLabelledBy` as the labelling path — a visible label element outside the
primitive whose id is referenced. An `ariaLabel` alternative (an invisible
string name on the toolbar itself) was intentionally excluded. The rationale was
expressed in JSDoc rather than in an ADR: every current and expected consumer
was assumed to render a visible label for the control group, and adding an
`ariaLabel` alternative before a consumer needed it was framed as speculative
flexibility.

The Services page redesign added a consumer that breaks this assumption. After
the tab-to-FilterBar refactor (see ADR-0024 for the toolbar ARIA-semantics
choice), the surrounding composition no longer includes a short, referenceable
visible label — the existing intro paragraph is a multi-sentence explanation,
not a label element with a DOM id that `aria-labelledby` could point to. Adding
a hidden `<p id="filter-label">` exclusively to satisfy the primitive's
labelling contract would be visually-redundant scaffolding whose only purpose is
to paper over a shape mismatch between the primitive and the surrounding DOM.

The original stance was a speculative-flexibility-avoidance argument. That
argument is now inverted: a concrete consumer has emerged for which the only
supported path is the wrong shape.

### Decision drivers

- A concrete consumer requires an `ariaLabel` path — not a speculative one.
- Both WAI-ARIA labelling mechanisms (`aria-labelledby` and `aria-label`) are
  equally valid for `role="toolbar"`; the choice is composition-driven, not an
  accessibility hierarchy.
- The primitive remains composition-agnostic: FilterBar does not know which
  surface embeds it, so it cannot default to one labelling path over the other.

### Evaluated approaches

1. **Keep ariaLabelledBy-only; add a hidden visible-label scaffold for
   services.** Rejected. DOM that exists only to satisfy a primitive's contract
   is a primitive constraint leaking into consumer markup.
2. **Invert the default to `ariaLabel`-only.** Rejected. Existing and expected
   future consumers with real visible-label surfaces would lose the more
   semantic option.
3. **Symmetric XOR: both paths supported, consumer picks based on a structural
   heuristic. Chosen.**

## Decision

FilterBar accepts exactly one of `ariaLabelledBy` or `ariaLabel` (XOR unchanged
— a single source of labelling truth is required for a valid Accessible Name).
Both paths are equally valid; the primitive does not prefer one over the other.

Consumers pick the path using a structural heuristic based on the surrounding
DOM:

- **A visible label element is available as a DOM-id anchor** → use
  `ariaLabelledBy` with that element's id.
- **No visible label element is positioned as a DOM-id anchor** (the surrounding
  composition establishes the filter's purpose through section context, pill
  labels, or other surrounding copy rather than a referenced label element) →
  use `ariaLabel` with a string name.

The heuristic is structural rather than a "sufficiency" judgement: the consumer
answers it by looking at their own template, not by reasoning about whether
ambient copy carries "enough" context to substitute for a label.

Runtime validation (see `src/utils/filterBarValidation.ts`) rejects empty-string
and whitespace-only values with prop-specific messages; supplying both paths or
neither throws with a message that names the violation.

### What does NOT change

- The XOR contract itself (exactly one path). Two paths would conflict for the
  Accessible Name.
- The `role="toolbar"` + `aria-pressed` semantics of FilterBar established in
  ADR-0023.
- The primitive's composition-agnostic stance: the choice of path is the
  consumer's, based on their own surrounding DOM.

### Scope and non-goals

**In scope:**

- The labelling-path selection heuristic for FilterBar consumers.
- The primitive-level contract (both paths supported, XOR enforced).

**Out of scope:**

- ARIA semantics beyond labelling (covered by ADR-0023).
- Category-filter semantics (covered by ADR-0024).
- Which specific visible content elements qualify as DOM-id anchors — a
  per-consumer judgement based on the surrounding composition.

## Consequences

### Positive

- Services filter (and future consumers without a visible-label surface) can
  label the toolbar without introducing redundant DOM.
- The selection heuristic is structural ("is there a DOM-id anchor?") rather
  than fuzzy ("do the pill labels carry enough context?"), so consumers resolve
  it by reading their own template.

### Negative

- Two valid paths require consumers to make a choice per usage site. Mitigation:
  the heuristic above resolves to a single correct answer for any given
  composition, and the primitive's JSDoc encodes it directly next to the prop
  documentation.

## References

- [ADR-0023](../0023-filter-vs-selection-primitives.md) — establishes FilterBar
  as a distinct primitive with `role="toolbar"` + `aria-pressed` semantics; this
  ADR refines the labelling-path contract within that frame.
- [ADR-0024](../0024-category-filter-semantics.md) — Services category
  navigation uses FilterBar; this ADR addresses the labelling consequence of
  that choice.
- [ADR-0029](../0029-services-toolbar-filter-paradigm.md) — services
  toolbar-filter paradigm; addresses the consumer-level architecture that
  consumes this primitive.
- [`src/components/ui/FilterBar.astro`](../../../src/components/ui/FilterBar.astro)
  — primitive JSDoc reflects this decision.
- [`src/utils/filterBarValidation.ts`](../../../src/utils/filterBarValidation.ts)
  — runtime validation of the XOR contract.
