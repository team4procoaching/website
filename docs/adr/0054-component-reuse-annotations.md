# ADR-0054: JSDoc Reuse Annotations for UI Components

Date: 2026-05-19

## ADR Warrant Check

- [x] **A — Contract**: this decision creates a project-wide contract on every
      component in `src/components/` — each `.astro` file in the four-folder
      catalogue (`layout/`, `navigation/`, `sections/`, `ui/`) carries a JSDoc
      block immediately above its `type Props` declaration with a mandatory
      description line, mandatory `@useWhen`, mandatory `@dontUseWhen`, and an
      optional set of cross-reference and example annotations. The contract
      applies to all 72 components today and to every future component added to
      the four subfolders; it is not narrowed to a single page, route, or
      surface. A reviewer measuring the borderline
      _universally-stated-but-currently-narrow contract_ finds **no** narrowing:
      the introductory commit-series populates every component in scope, and
      future additions inherit the same rule.
- [x] **B — Asymmetry**: the convention sets a deliberate asymmetry — every
      component carries a structured tag-bearing JSDoc block — against the
      prevailing JSDoc-on-functions style used elsewhere in `src/utils/`,
      `src/scripts/`, and `src/data/`, which is more prose-driven and does not
      enforce mandatory tag fields. The asymmetry cannot be encoded as JSDoc on
      a single file because the rule is _that every component carries the
      block_: no single component's JSDoc can carry the catalogue-wide schema. A
      future tidy-pass — driven by an AI-assisted edit asked to "make the JSDoc
      consistent with the rest of the codebase" — would plausibly compress the
      structured tag blocks back into free-form prose. The ADR documents _why_
      the asymmetry exists so the next contributor reading a JSDoc block does
      not "fix" its tag structure away.
- [ ] C — External revisit: not applicable. No vendor schedule, no dated
      external event, no named external change governs this decision. The
      deferred mechanical sensor and the deferred inventory artefact are
      _internal_ deferrals, not C-triggers.
- [ ] D — Promise/Code Asymmetry: not applicable. This is a fresh convention,
      not a deviation from a prior concept document's promise.

## Status

Accepted

## Context

The Team 4 Pro Coaching site has accumulated 72 reusable UI components in
`src/components/`, partly derived from `@tailwindplus/elements` (ADR-0019) and
partly authored in-project. The catalogue is split across four domain-based
subfolders — `layout/` (3), `navigation/` (6), `sections/` (45), `ui/` (18).

Two structural failure modes have surfaced in AI-assisted edits:

1. **Research-defect residue**: a new component is created without first
   checking what already exists in `src/components/`. The agent's scanning pass
   sees file names and prop shapes, neither of which encodes _intent_.
2. **Generalisation-defect**: a similar component is identified, but a new one
   is created anyway because the existing one "almost fits". The agent's pass
   sees no signal about why the existing component is the right pick under
   condition X and the wrong pick under condition Y.

Both fail in the same direction — duplication of intent across the component
catalogue. The current JSDoc style is project-consistent but does not carry
cross-component signal: there is no machine-parseable answer to "is what I am
about to write already here, and if not, what siblings should I consider
extending?"

A central inventory document was considered (see § Evaluated approaches) and
deferred: the diagnosis evidence is currently insufficient to justify a separate
maintained artefact that can drift from the source of truth. JSDoc annotations
co-located with the code are the minimum-cost mechanism that addresses both
failure modes without introducing a parallel artefact.

### Decision drivers

- **Cheaper reuse than rewrite for AI agents.** The convention's primary purpose
  is to flatten the discoverability gradient an agent faces when scanning the
  component catalogue.
- **Co-locate intent with code so drift is mechanically harder.** Drift requires
  forgetting to update both the code and the JSDoc in the same commit, rather
  than allowing a separate inventory document to fall behind silently.
- **Match the existing project JSDoc style.** Terse single-line tag entries, no
  ceremony, the same shape an IDE hover-tooltip already renders.
- **Preserve the option to generate a derived inventory artefact later.** The
  annotation schema is designed so a future generator can build
  `docs/components-inventory.md` from JSDoc without re-annotating the codebase.

### Evaluated approaches

1. **Central `docs/components-inventory.md`** — explicit, parseable,
   cross-component. Rejected for now: diagnosis evidence is insufficient to
   justify a separate maintained artefact, maintenance burden is non-trivial,
   and an annotation-first approach preserves the option to generate the
   inventory from JSDoc later without changing the source of truth.
2. **Inline component list in `CLAUDE.md`** — universally read, but bloats every
   session context. Rejected on context-budget grounds.
3. **Storybook / Ladle** — heavyweight tooling for a 72-component catalogue and
   a solo maintainer. Rejected as disproportionate.
4. **JSDoc reuse annotations co-located with components** — co-located with the
   source of truth, parseable, low ceremony, matches existing style. **Chosen.**

## Decision

Every component in `src/components/` carries a JSDoc block immediately above its
`type Props` declaration with the schema specified in
[§ Component Reuse Annotations](../CONVENTIONS.md#component-reuse-annotations).

The mandatory fields are the one-sentence description, `@useWhen`, and
`@dontUseWhen`. The optional fields (`@alternativeTo`, `@relatedTo`, `@source`,
`@adr`, `@example`) are included when applicable. `(none)` placeholders are not
used — an optional field that does not apply is simply omitted.

### Cross-reference target surfaces

`@alternativeTo` always names a sibling **component** in `src/components/` — by
definition, an alternative pick is another component competing for the same
surface.

`@relatedTo` is broader: a component's behaviour can couple to a data module, a
client-side controller script, or a page layout, not just to another component.
The annotation therefore resolves against **four target surfaces**, and the
copy-editor schema check applies one deterministic resolution path per surface:

1. **Component** — a PascalCase identifier (e.g., `SegmentedControl`). Resolves
   against `src/components/**/<Name>.astro`. This is the default and most common
   surface.
2. **Data module symbol** — a camelCase identifier (e.g., `coachesExpanded`,
   `statsSection`, `testimonials`, `sectionBackground`). Resolves against an
   exported identifier of that exact name under `src/data/**` _or_
   `src/styles/**` (style-token lookup tables such as `sectionBackground` are
   data-shaped exported records and live under `src/styles/`). The check greps
   for `export ... <name>` or `export const <name>` across both directories.
3. **Controller script** — a camelCase identifier ending in `Controller` (e.g.,
   `servicesFilterController`). Resolves against `src/scripts/<name>.ts`.
4. **Layout** — a PascalCase identifier that resolves against
   `src/layouts/<Name>.astro` rather than `src/components/` (e.g.,
   `BaseLayout`).

Resolution is deterministic by casing and suffix: a PascalCase name is checked
first against `src/components/**`, then against `src/layouts/**`; a camelCase
name ending in `Controller` is checked against `src/scripts/`; any other
camelCase name is checked against `src/data/**` and `src/styles/**`. A
`@relatedTo` target that resolves under none of the four paths is a malformed
reference and the copy-editor flags it. Widening the surface keeps the ~15
non-component couplings in the catalogue checkable rather than dropping them
into untyped prose — the point of the check is preserved, not made vacuous.

### Responsibilities

- **architect subagent**: At Phase-2 concept review, names the candidate
  components the proposed change would touch and cites their `@useWhen` and
  `@dontUseWhen` annotations. A proposal for a new component must include the
  draft JSDoc block.
- **implementer subagent**: Before creating or modifying a component file, reads
  its current JSDoc annotations and the annotations of components named in
  `@alternativeTo` or `@relatedTo`. Updates annotations in the same commit as
  semantic changes to the component.
- **copy-editor subagent**: Validates the schema (mandatory fields present,
  single-sentence form on the first line and tag bodies, well-formed
  cross-references that resolve under the four-surface resolution paths above).

### What does NOT change

- The component code itself is not restructured; this is an annotation rule.
- Existing per-prop JSDoc remains; the new block is additional, not replacing.
- ADR-0023, ADR-0027, ADR-0036, and other component-scoped ADRs remain
  authoritative; `@adr` annotations point to them, not replace them.
- The four-folder structure (`layout/`, `navigation/`, `sections/`, `ui/`) is
  unaffected.
- Components outside `src/components/` (layouts in `src/layouts/`, utilities in
  `src/utils/`, scripts in `src/scripts/`, data in `src/data/`) are not
  themselves in scope for _carrying_ the block — but they are legal _targets_ of
  a `@relatedTo` reference (see § Cross-reference target surfaces).

### Scope and non-goals

**In scope:**

- All 72 `.astro` files under `src/components/` (`layout/` × 3, `navigation/` ×
  6, `sections/` × 45, `ui/` × 18) carry the JSDoc block.

**Out of scope:**

- Layout files in `src/layouts/` — single-purpose page wrappers, no reuse
  competition. They do not carry the block; they may be referenced by it.
- Utility modules in `src/utils/`, `src/scripts/`, `src/data/` — different
  concern, covered by the existing JSDoc-on-functions style. They do not carry
  the block; data modules and controller scripts may be referenced by it.
- A derived inventory document (`docs/components-inventory.md`) — deferred; see
  § Evaluated approaches.
- A mechanical sensor that validates the schema
  (`scripts/check-component-annotations.mjs`) — deferred. The copy-editor
  subagent's schema-check pass is the validation surface for the introductory
  commit-series; a sensor lands only if drift is observed and the manual pass
  proves insufficient.
- A type-checking sensor that verifies `@example` snippets against live Props —
  deferred until `@example` drift is observed in practice.

## Consequences

### Positive

- Reuse signal lives next to the code; drift is mechanically harder than with a
  separate document because updating one without the other requires two diffs in
  the same commit.
- Cross-references (`@alternativeTo`, `@relatedTo`) make near-duplicates surface
  during architect review: a Phase-2 concept that proposes a new component
  naturally lists sibling annotations as part of the consumer grep.
- `@dontUseWhen` makes anti-patterns explicit at the call site where they are
  easy to misjudge — the discriminator for "which of the two similar components
  is the right pick here" lives in the same hover-tooltip as the component's
  first-sentence description.
- Preserves the option to generate `docs/components-inventory.md` from
  annotations later, without changing the source of truth.

### Negative

- Adds annotation work to every new component. The marginal cost per component
  is ~15 lines of JSDoc; the marginal cost of skipping the annotation is a
  future research-defect or generalisation-defect that costs the project a
  duplicate component.
- Vague `@useWhen` or `@dontUseWhen` entries reduce value to near-zero;
  discipline required. The copy-editor schema check catches presence, not
  quality; the human review at Phase 3 is the quality gate.
- Annotations can drift from code semantics if the implementer rule is not
  enforced. The implementer subagent treats "modified component without updated
  annotation" as a self-rejected output, which is the structural mitigation; a
  future sensor lands if the rule proves insufficient.
- `@example` snippets can drift from the live Props in the same way. The
  copy-editor's schema check verifies presence, not validity — a type-checked
  example verification is deferred until drift is observed.
- The `@dontUseWhen`-mandatory rule (decided in Phase 1) produces a
  near-tautological entry on trivial primitives with no sibling-competitor
  (`Logo`, `CheckIcon`, `SubmitButton`). The cost is a minute of author time per
  such component and one extra line a reader skims past; the rule is kept
  mandatory anyway so the field is never silently dropped on a component where
  it _would_ have carried signal. This is an accepted, bounded cost, not a
  deferred problem — see the concept doc's § Self-Critique.

### Risk mitigation

- The implementer subagent's "self-rejected on missing-update" rule is the
  primary mitigation against drift. The copy-editor's schema check is the
  secondary mitigation against malformed entries.
- A future `check-component-annotations.mjs` sensor (deferred per § Out of
  scope) can mechanically verify the schema if drift becomes a problem after the
  manual passes prove insufficient. The schema is designed so the sensor can be
  added later without reshaping the annotations.
- An `@example` that no longer matches the current Props is worse than no
  example. When changing a component's Props shape, the implementer rule
  requires updating or removing the `@example` in the same commit. A future
  `check-component-examples.mjs` sensor that type-checks examples against the
  live Props is the deferred fallback.
- Dangling `@alternativeTo` / `@relatedTo` references to renamed or removed
  components, data modules, or scripts are the highest-frequency failure mode
  for cross-reference drift. The copy-editor's schema check resolves named
  targets against the four-surface resolution paths above; a rename that touches
  more than one component must update both the renamed component's block and
  every block that references it in the same commit.

## Success criteria

- Every component in `src/components/` carries the JSDoc block within the
  introductory commit-series of this ADR (Commit 2 of the two-commit plan).
- Within four weeks of merge, at least one architect Phase-2 concept cites
  `@alternativeTo` or `@dontUseWhen` content as the basis for reusing instead of
  creating.
- No observed instance, post-introduction, of an agent generating a
  duplicate-intent component without first comparing `@useWhen` annotations.

## Documentation Updates

This ADR requires updates to the following documents in Commit 1 of the
introductory commit-series (the ADR + docs commit, before the annotation commit
lands):

- `docs/CONVENTIONS.md#component-reuse-annotations` — new section after §
  Component Composition with the full schema, mandatory and optional fields, the
  four `@relatedTo` target surfaces, examples, and drift control rules.
- `docs/CONVENTIONS.md#topic-hub-index` — new entry pointing at the section with
  this ADR's backlink.
- `docs/ARCHITECTURE.md` → § Where to Find Coding Rules — new bullet mirroring
  the Topic Hub Index entry (per the four-coupling-sites rule in CONVENTIONS §
  Topic Hub Index Maintenance).
- `docs/ARCHITECTURE.md` → § ADR Quick Reference — new row for ADR-0054 with the
  Key Insight cell summarising the convention in one line.
- `docs/AGENTS.md` — architect, implementer, and copy-editor subagent
  responsibility additions (one or two bullets each; see § Responsibilities
  above).
- `CLAUDE.md` → § Critical Rules — one-line pointer to the convention section
  and this ADR.

Commit 2 of the introductory commit-series applies the annotation blocks to all
72 components.

## References

- [ADR-0019](0019-tailwindplus-elements.md) — `@tailwindplus/elements`;
  components derived from this source carry `@source tailwindplus`.
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) — Extract-first
  composition; the convention complements extract-first by giving every
  extracted component a parseable reuse signal.
- [`docs/CONVENTIONS.md` § When to write an ADR](../CONVENTIONS.md#when-to-write-an-adr)
  — the Warrant Check rule against which this ADR's A and B triggers are
  evaluated.
- Anthropic, April 23 postmortem.
- github.com/anthropics/claude-code#42796 (Laurenzo quantitative analysis on the
  research-defect / generalisation-defect failure modes).
