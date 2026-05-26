# Coding Conventions

Project-specific coding patterns and naming conventions for the **Team 4 Pro
Coaching** website. This document complements
[CONTRIBUTING.md](../CONTRIBUTING.md) (workflow and process) and
[ARCHITECTURE.md](ARCHITECTURE.md) (high-level decisions).

**Rule of thumb**: If a convention is _why_ we do something → ADR. If it's _how_
we do something consistently → this document.

---

## When to write an ADR

A decision deserves a separate ADR file when at least one trigger applies.
Otherwise the substance belongs in a commit message, in JSDoc next to the
affected field, or as a paragraph in this document.

The opening rule of thumb above (_why_ → ADR; _how_ → this document) is the
first-pass filter. This Warrant Check is the gate that decides the borderline
cases the rule of thumb cannot settle alone.

- **A — Contract**: the decision creates or changes a contract future code must
  honour _project-wide_ — a pattern, a default, or a primitive others build on
  across more than one page, route, or component. A rule that applies to a
  single page or a single component is not a Contract trigger; it is JSDoc on
  that file.
- **B — Asymmetry**: the decision sets a deliberate asymmetry a future
  contributor or AI-assisted edit would otherwise tidy back to symmetry, _and
  the asymmetry cannot be encoded as JSDoc on the file that carries it_. If the
  asymmetry lives on one component and the rule can sit at the top of that
  component's source, JSDoc is the right home; an ADR adds drift surface without
  buying enforcement.
- **C — External revisit**: the decision has a _named, documented_ revisit
  trigger — a vendor schedule, a dated event, a concrete external change ("when
  Stripe Checkout migration ships", "when SonarCloud's API v3 deprecates", "when
  a second session-based service lands"). Hypothetical-conditional triggers ("if
  the brand mission changes", "if a fourth coach joins") are not C-triggers;
  they are restatements of the decision's own scope, not external events the
  contract depends on.
- **D — Promise/Code Asymmetry**: the concept document for a stream promised X
  but the implementation that landed is Y, and the divergence is not yet
  resolved on either side. Default is **NOT** to write an ADR — writing one here
  is the fourth of four legitimate resolutions, not the first. See the four
  resolutions below.

What is **not** a trigger: a large diff, type-system involvement,
placeholder-content removal, a paragraph of justification, or "the architect
found this decision interesting".

### Promise/Code Asymmetry — four resolutions

When a concept document promised X but the code on `main` is Y, four resolutions
are legitimate. Pick the one the underlying situation actually calls for; do not
default to (4).

1. **Fulfil the promise.** The concept was right, the implementation drifted;
   bring the code to match X in a follow-up commit or stream. The concept doc
   needs no change.
2. **Scale back the cross-references.** The repository never had Y in the shape
   the concept promised, because the promise itself was wrong. Remove the
   cross-references that point at the never-existed Y. The concept doc is
   archived or amended; no ADR is written.
3. **Amend the concept retroactively.** The repository _has_ Y, and Y is what
   the project actually wants — the concept document was the inaccurate part.
   Keep the cross-references, amend the concept doc to describe Y honestly, and
   record in the concept's revision history why the change reads
   counter-intuitive against the original promise. No ADR is written.
4. **Document the deviation via an ADR.** The repository has Y, Y is what the
   project wants, _and_ the divergence from X carries a project-wide contract
   that A/B/C above warrant on its own merits. Write the ADR for Y on the A/B/C
   grounds the deviation surfaces; the asymmetry between X-and-Y is the trigger,
   not the warrant. If A/B/C do not fire on Y itself, resolution (3) is the
   right call.

Resolutions (2) and (3) sit at opposite ends of the same axis. (2) removes
cross-references because the repository never had Y, the promise was wrong. (3)
keeps cross-references and amends the concept because the repository has Y, the
concept was the inaccurate part. Collapsing them into one menu item loses the
distinction; the default to (4) is the trap this sub-section exists to prevent.

The ADR template (`docs/adr/0000-template.md`) opens with a Warrant Check
section that lists these triggers as a checklist. Mark at least one when
authoring an ADR; if none apply, do not write the ADR.

**Cross-document spread.** This canonical text is the source of truth. The
per-ADR checklist in `docs/adr/0000-template.md` is a deliberate subset (drops
the parenthetical examples and the borderline footnote below). The agent prompts
`.claude/agents/architect.md` and `.claude/agents/concept-reviewer.md`
paraphrase and cross-reference rather than duplicate. A future surface follows
the shape that fits its role — checklist instance → subset; procedural reminder
→ paraphrase with cross-reference. Do not inline the canonical text into a new
surface; that re-introduces the drift surface this pattern is designed to
prevent.

> **Borderline vocabulary.** Three patterns the strict reading above rejects,
> named here as shared vocabulary for architect-reviewer negotiation, not as
> escape hatches that grant the trigger:
>
> - _A borderline — universally-stated-but-currently-narrow contract_: the rule
>   reads project-wide but only one surface uses it today.
> - _B borderline — JSDoc-with-reflexive-loss-risk_: JSDoc could carry the rule,
>   but a future tidy-pass is plausible enough that the rule needs a more
>   permanent home than a single component's top-of-file comment.
> - _C borderline — named-event-without-a-date_: a concrete revisit trigger
>   exists, but no vendor schedule or external commitment dates it.
>
> A borderline finding does not auto-pass the Warrant Check; it is the
> vocabulary in which the architect and the concept-reviewer reach a shared
> verdict on whether the trigger fires.

---

## Topic Hub Index

Task-oriented entry-point for "what rules apply to the surface I am about to
touch". Each entry names a code-writing task, the section in this document that
holds the rule prose, and the ADR(s) that carry the rationale. Follow the
section link for the rule; follow the ADR link for the decision history.

- **When writing a new ID-keyed dataset** (one whose IDs are referenced across
  files), or adding an entry to one — see
  [§ Data Integrity: `as const satisfies Record<>` Pattern](#data-integrity-as-const-satisfies-record-pattern)
  ([ADR-0017](adr/0017-domain-data-integrity-pattern.md)).
- **When choosing a section background variant or rendering a `<Section>`
  wrapper** — see [§ Section Backgrounds](#section-backgrounds)
  ([ADR-0014](adr/0014-light-mode-section-background-system.md)).
- **When composing a component that must work on both light and dark section
  backgrounds** — see
  [§ Component Composition → Dark Background Handling](#dark-background-handling)
  ([ADR-0014](adr/0014-light-mode-section-background-system.md)).
- **When adding a `<script>` to a component** — see
  [§ Client-Side Scripts](#client-side-scripts)
  ([ADR-0020](adr/0020-client-side-script-strategy-revised.md)).
- **When adding cross-page state that survives a navigation** — see
  [§ Cross-Page State Persistence](#cross-page-state-persistence)
  ([ADR-0021](adr/0021-session-storage-quiz-persistence.md)).
- **When adding a server endpoint or touching the rendering mode** — see
  [§ Server Endpoints and Hybrid Rendering](#server-endpoints-and-hybrid-rendering)
  ([ADR-0022](adr/0022-hybrid-rendering-model.md)).
- **When choosing between FilterBar and SegmentedControl** — see
  [§ Client-Side Scripts → Data Attribute Naming](#data-attribute-naming)
  ([ADR-0023](adr/0023-filter-vs-selection-primitives.md)).
- **When building or extending a filterable catalog page** — see
  [§ Filterable Catalog Pattern](#filterable-catalog-pattern)
  ([ADR-0024](adr/0024-category-filter-semantics.md),
  [ADR-0025](adr/0025-filterable-catalog-pages.md)).
- **When wiring a controller that must run on cold loads** — see
  [§ Client-Side Scripts → Rules](#rules) (Dual-Dispatch sub-rule)
  ([ADR-0026](adr/0026-dual-dispatch-controller-init.md)).
- **When wiring a modal trigger or registering a new modal id** — see
  [§ Cross-Component DOM ID Registry (`MODAL_IDS`)](#cross-component-dom-id-registry-modal_ids)
  ([ADR-0027](adr/0027-invokers-api-modal-trigger-standard.md)).
- **When touching `astro.config.mjs`, post-build hooks, or any inline `<script>`
  / `<style>`** — see [§ CSP Hash Strategy](#csp-hash-strategy)
  ([ADR-0030](adr/0030-csp-strategy.md)).
- **When extracting a section component or deciding inline-vs-extract** — see
  [§ Component Composition → Extract-First](#extract-first-for-ai-assisted-development)
  ([ADR-0034](adr/0034-extract-first-for-ai-assisted-development.md)).
- **When writing a section adapter or any component that forwards a slot to gate
  visible markup** — see
  [§ Component Composition → Section Components Wrap `Content.astro`](#section-components-wrap-contentastro)
  ([ADR-0036](adr/0036-content-aware-slot-detection-in-forwarded-slots.md)).
- **When writing a component test whose correctness is Prop-to-DOM, not
  function-to-return-value** — see
  [§ Component Tests with Astro Container API](#component-tests-with-astro-container-api)
  ([ADR-0037](adr/0037-adopt-astro-container-api-for-component-tests.md)).
- **When adding a dynamic detail route (`/<domain>/[slug]`)** — see
  [§ Dynamic Detail Routes](#dynamic-detail-routes)
  ([ADR-0038](adr/0038-dynamic-detail-route-pattern.md)).
- **When adding a new entry-point script under `scripts/`** — see
  [§ Script Entry-Point Naming](#script-entry-point-naming)
  ([ADR-0050](adr/0050-script-entry-point-naming-convention.md)).
- **When writing a component under `src/components/ui/` or
  `src/components/navigation/`** — see
  [§ Testing Conventions → Component-Level Accessibility Tests](#component-level-accessibility-tests)
  ([ADR-0052](adr/0052-component-level-accessibility-testing-with-axe-core.md)).
- **When composing a session-mode service detail page or adding a new
  session-mode service** — see
  [§ Component Composition → Session-Service Detail Pages Compose the Configurator](#session-service-detail-pages-compose-the-configurator)
  ([ADR-0051](adr/0051-session-service-detail-page-launch-gate.md)).
- **When adding a placeholder string to `src/data/services.ts` or
  `src/data/servicesMission.ts`** — see
  [§ Data Integrity → Placeholder-Prefix Convention is File-Local](#placeholder-prefix-convention-is-file-local)
  ([ADR-0051](adr/0051-session-service-detail-page-launch-gate.md)).
- **When touching how coaches are presented on the Services overview** — see
  [§ Component Composition → Services Overview Coach Presentation](#services-overview-coach-presentation).
- **When creating or modifying a component in `src/components/`** — see
  [§ Component Reuse Annotations](#component-reuse-annotations)
  ([ADR-0054](adr/0054-component-reuse-annotations.md)).
- **When authoring a `SKILL.md` for a cross-cutting discipline** — see
  [§ SKILL Authoring](#skill-authoring)
  ([ADR-0055](adr/0055-skill-layer-for-cross-cutting-disciplines.md)).

## Topic Hub Index Maintenance

The Topic Hub Index above is load-bearing for AI subagent doc-discovery. When
you add an ADR that touches a code-writing surface (or change one that already
does), the same PR adds or updates its Hub Index entry and either creates a new
section in this document for the rule or updates the existing target section's
ADR backlink. Updates to the Topic Hub Index also require a matching bullet in
ARCHITECTURE.md § Where to Find Coding Rules so the two indexes stay aligned.
The ARCHITECTURE.md flat ADR Quick Reference table is the index of record for
_all_ ADRs by number; the Topic Hub Index is the entry-point for _code-writing_
ADRs by surface. Entries without an ADR backlink point at canonical convention
prose only — the rule lives in this document, not in a separate decision
artefact. All four coupling sites — the Hub Index here, the target-section body
in this document, the ARCHITECTURE.md "Where to Find Coding Rules" pointer
block, and the ARCHITECTURE.md flat Quick Reference table — must be updated
together when a code-writing ADR lands or changes.

---

## File Naming

| Category             | Convention | Examples                                            |
| :------------------- | :--------- | :-------------------------------------------------- |
| Components           | PascalCase | `CoachCardExpanded.astro`, `SegmentedControl.astro` |
| Data modules         | camelCase  | `coaches.ts`, `successStories.ts`                   |
| Utility functions    | camelCase  | `slugify.ts`, `isExternal.ts`, `counter.ts`         |
| Type files           | camelCase  | `components.ts`                                     |
| Test files           | camelCase  | `slugify.test.ts` (co-located with source)          |
| Test utilities       | camelCase  | `test-utils/assertions.ts` (shared helpers)         |
| Pages / routes       | kebab-case | `how-it-works/index.astro`, `[slug].astro`          |
| Component subfolders | camelCase  | `sections/howItWorks/`, `sections/coaches/`         |
| CSS files            | kebab-case | `global.css`, `fonts.css`                           |

**Note**: Pages _must_ use kebab-case (Astro URL routing). Component subfolders
use camelCase to align with their parent component names (e.g., `HowItWorks` →
`howItWorks/`). This is an intentional divergence, not an inconsistency.

**Page file structure**: Every page uses the `directory/index.astro` pattern,
even standalone pages without sub-pages:

```
src/pages/
├── index.astro                    # / (homepage — exception: root level)
├── coaches/index.astro            # /coaches
├── contact/index.astro            # /contact
├── contact/thanks.astro           # /contact/thanks (sub-page)
├── how-it-works/index.astro       # /how-it-works
├── privacy/index.astro            # /privacy
├── services/index.astro           # /services
├── success-stories/index.astro    # /success-stories
└── terms/index.astro              # /terms
```

This allows adding sub-pages later (e.g., `/coaches/[slug]`) without renaming
the parent file or breaking its Git history.

### Component Folder Structure

Components live under `src/components/` in four domain-based subfolders;
page-level wrappers (those that contain `<html>`, `<body>`, and a top-level
`<slot />` to wrap an entire page) live at `src/layouts/` per Astro's
project-structure convention. The rule of thumb is unambiguous:

| Location                     | Purpose                                                                                   | Examples                                                                                                                       |
| :--------------------------- | :---------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `src/layouts/`               | Page wrappers with `<html>`, `<body>`, top-level `<slot />`                               | `BaseLayout.astro`                                                                                                             |
| `src/components/layout/`     | Layout helper fragments used _within_ a layout or page; no `<slot />` that wraps the page | `BaseHead.astro`, `SEO.astro`, `ScrollAnimations.astro`                                                                        |
| `src/components/navigation/` | Site navigation, menus, routing-aware links                                               | `Header.astro`, `Footer.astro`, `DesktopMenu.astro`, `MobileMenu.astro`, `NavLink.astro`                                       |
| `src/components/sections/`   | Page sections, grouped by domain subfolder (`coaches/`, `services/`, `quiz/`, …)          | `Hero.astro`, `Services.astro`, `CoachDetailModal.astro`, `QuizModal.astro`                                                    |
| `src/components/ui/`         | Reusable primitives without layout assumptions                                            | `Button.astro`, `Modal.astro`, `TextLink.astro`, `FormSelect.astro`, `FilterBar.astro`, `SegmentedControl.astro`, `Logo.astro` |

**Decision heuristic.** If a component has `<slot />` and wraps an entire page →
`src/layouts/`. Everything else → `src/components/<subfolder>/`. The
domain-subfolder name communicates the component's architectural role; the file
location is the discovery surface for an AI-assisted edit looking for "where
does this kind of component live".

**Imports.** Use the `~/components/<subfolder>/<Name>.astro` path; the `~/`
alias resolves to `src/`. Direct imports only — no barrel files (see
[§ Imports](#imports)).

**Domain subfolders under `sections/`.** Domain-specific components live in a
subfolder under `sections/` named in camelCase (matching the section's
PascalCase parent), e.g., `sections/coaches/CoachDetailModal.astro`,
`sections/quiz/QuizModal.astro`. Generic shells like `Modal.astro` stay in `ui/`
— domain modals build on them.

> **History.** § Component Folder Structure consolidates
> [ADR-0007 — Organize Components into Domain-Based Subfolders](adr/_archive/0007-component-folder-structure.md),
> which records the original four-folder classification rationale, and
> [ADR-0008 — Clarify Distinction Between src/layouts/ and components/layout/](adr/_archive/0008-clarify-layouts-vs-components-layout.md),
> which amended ADR-0007 to align the page-wrapper location with Astro's
> project-structure convention. Both are preserved in `_archive/` for historical
> lookup.

---

## Script Entry-Point Naming

Every entry-point script directly under `scripts/` (every `.mjs` file at the top
level of `scripts/` that serves as the entry point for a pnpm-script invocation,
not under a subdirectory) carries one of three prefixes that encodes its runtime
role. The matching pnpm-script entry in `package.json` mirrors the prefix 1:1.
Test files co-located with their source (`<source>.test.mjs` next to
`<source>.mjs`) inherit the source's prefix and are not separately scoped — the
convention encodes runtime role, and a test file is not an entry point.

| Prefix       | Role                  | Exit-code semantics                                                | Justification rubric                                           | Examples today                                   |
| :----------- | :-------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------- | :----------------------------------------------- |
| `check-*`    | Sensor / quality gate | Exit 0 = policy satisfied; exit ≠ 0 = policy violated (blocking).  | Catch frequency — must catch what existing layers let through. | `check-conventions`, `check-biome-rule-baseline` |
| `generate-*` | Transformer / build   | Exit 0 = output written; exit ≠ 0 = generation failed.             | Build correctness — pipeline needs the output or does not.     | `generate-csp-hashes`                            |
| `query-*`    | Read-only lookup      | Exit code signals runtime status only; finding count never blocks. | Usage frequency — repeated invocation pays for the tool.       | `query-sonar-findings`                           |

The three rubrics are deliberately asymmetric. A sensor that does not catch
something the existing prevention layers would have let through has not earned
its build, regardless of how often it runs. A transformer earns its place when
the pipeline depends on its output, regardless of catch count. A lookup earns
its place through repeated maintainer use, regardless of whether it surfaces new
findings on any individual invocation. Evaluating a proposed script against a
single rubric (catch frequency only, say) reaches the wrong conclusion for two
of the three classes.

**Subdirectories under `scripts/` are unaffected.** `scripts/sonar-findings/`,
`scripts/conventions/`, and `scripts/biome-rules/` are named by domain or
endpoint, not by operation. The prefix convention applies only to entry-point
files directly under `scripts/`.

**Phase-2 classification step.** When the architect's Phase-2 concept proposes a
new entry-point script, the concept records which role-class the script belongs
to and the rubric the script earns its place against:

1. **Is the script a sensor (`check-*`)?** Record the observed bleed condition
   the script catches — a finding the existing prevention layers let through —
   and confirm the rubric is catch frequency.
2. **Is the script a transformer (`generate-*`)?** Record what the pipeline
   cannot do without the output and confirm the rubric is build correctness.
3. **Is the script a lookup (`query-*`)?** Record the usage frequency the tool
   is expected to earn and confirm the failure path that keeps the agent quality
   chain green on outages (exit-0 on every successful or transient-failure
   path).

If none of the three roles applies cleanly, the architect surfaces that fact to
the project owner before naming the script. Silently defaulting to one of the
prefixes ("call it `check-*` because the others are") is what produced the
historical `check-sonar-findings` defect and is forbidden by this convention.

**Enforcement is by review, not by a sensor.** No `check-script-naming.mjs`
exists. The convention is enforced by the architect's classification step at
Phase-2 and by Phase-4 review attention on new entry-point scripts. A sensor
that lints filenames would not earn its build under its own rubric — the review
surface is engaged enough and the entry-point set is small enough that the cost
of a sensor outweighs the marginal catch.

See [ADR-0050](adr/0050-script-entry-point-naming-convention.md) for the
decision history and the explicit revisit conditions.

A new entry-point script also needs a `.claude/settings.json` allow-list entry,
or every agent invocation of it triggers a permission prompt — see
[`docs/reference/claude-permissions.md` § Allow-List Rationale](reference/claude-permissions.md#packagejson-scripts-explicit-not-generic).

---

## SKILL Authoring

A **skill** is a committed, plain-Markdown carrier of one reusable cross-cutting
AI-working discipline. It lives at `.claude/skills/<skill-name>/SKILL.md`. A
skill is not a role: it has no context window and no model assignment. This
section carries the mechanical authoring rules and the consumption model; the
decision and the authority model live in
[ADR-0055](adr/0055-skill-layer-for-cross-cutting-disciplines.md).

**File location.** One directory per skill:
`.claude/skills/<skill-name>/SKILL.md`. The directory name is the skill name,
lowercase kebab-case. The directory holds exactly one `SKILL.md`.
Project-authored skills hold no additional files; vendored-from-plugin skills
may carry sibling supporting `.md` files when the upstream body's relative-path
cross-references depend on them — see the vendored-from-plugin sub-convention
below. `.claude/skills/` is committed to git — the same committed-infrastructure
tier as `.claude/agents/` — not gitignored.

**Frontmatter.** YAML frontmatter with exactly two fields, `name` and
`description`, and no others — no `tools`, no `model`:

- **`name`** — the lowercase kebab-case skill name, **equal to the directory
  name** (e.g. directory `.claude/skills/bash-command-construction/` carries
  `name: bash-command-construction`). Capped at 64 characters. The value is the
  identifier, not a human-readable title.
- **`description`** — the trigger surface. Third person, "Use when…" form. It
  describes _when to load_ the skill — the triggering conditions and observable
  symptoms — not _what the skill does_. Capped at 1024 characters. The wording
  is functionally load-bearing: it is what decides whether the skill
  auto-triggers.

**Body.** Plain Markdown carrying the discipline prose. No rigid section
template is imposed; an Overview / When to Use / Quick Reference / Common
Mistakes shape is a reasonable default but not enforced.

**One discipline per skill.** A skill carries exactly one cross-cutting
discipline. Role-specific operational prose — an agent's command catalogue, its
per-phase workflow — stays in that agent's prompt and is never folded into a
skill (see [ADR-0055](adr/0055-skill-layer-for-cross-cutting-disciplines.md) §
The authority model).

**English.** Every `SKILL.md` is English — the Bus-Factor convention for all
`.claude/` infrastructure artefacts.

**How a skill is consumed.** A skill reaches an AI context through one of two
mechanisms, and which one applies depends on the reader:

- **The Orchestrator (the main Claude Code session).** It auto-triggers a
  project skill from the skill's `description` and loads the body progressively
  — only when the discipline is relevant. The `description` field is what
  decides whether that auto-trigger fires, which is why its wording is
  load-bearing.
- **A subagent** (`architect`, `concept-reviewer`, `debt-auditor`,
  `implementer`, `reviewer`). A subagent does **not** auto-trigger skills. It
  consumes a skill via a `skills:` frontmatter field on its own definition in
  `.claude/agents/`: the field lists the skills the agent needs by `name`, and
  Claude Code preloads each listed skill's full body into the subagent's context
  at session start. The preload is deterministic and always-on for that subagent
  — there is no behavioural decision involved. The alternative subagent path,
  the `Skill` tool whitelisted in the agent's `tools:` list and explicitly
  invoked, is **not** used by this project: a load-bearing discipline must be
  delivered deterministically, not on a behavioural bet that the agent invokes
  the tool at the right moment.

Because a subagent definition loads only at session start, a change to a
`skills:` field takes effect only after the session is restarted.

The `SKILL.md` frontmatter shape — including the 64-character `name` cap and the
1024-character `description` cap stated above — is Anthropic's Agent Skills
format, not a project invention; both caps are documented in the
`anthropic-best-practices.md` reference bundled with the `superpowers` plugin's
`writing-skills` skill, the format authority
[ADR-0055](adr/0055-skill-layer-for-cross-cutting-disciplines.md) § The
authoring reference cites. This section is the project's convention for how to
author one. See
[ADR-0055](adr/0055-skill-layer-for-cross-cutting-disciplines.md) for the
decision, the authority model, and the subagent consumption mechanism.

<!-- DO NOT TIDY: this paragraph documents the deliberate asymmetry that vendored-from-plugin skill directories may carry supporting .md files alongside SKILL.md. Do NOT merge with the 'exactly one SKILL.md' clause above; do NOT delete as 'redundant'. See ADR-0055 and the .claude/skills/systematic-debugging/ directory shape. -->

**Vendored-from-plugin sub-convention.** A skill whose body originates outside
project authorship — typically vendored from an upstream plugin such as
`superpowers` — carries two structural markers absent on project-authored
skills. First, an HTML provenance comment is the first body element of the file:
for skills whose upstream source carries YAML frontmatter, the comment sits
immediately after the closing `---` of the frontmatter; for supporting files
whose upstream shape has no frontmatter, the comment sits at the literal first
byte of the file, above the H1. The comment records the source plugin, its
version, and the pinned source commit so a future maintainer recognises the file
as vendored prose and does not edit it under the project-authored shape's
assumptions. Second, a vendored skill's directory may carry sibling supporting
`.md` files when the upstream body cross-references them by relative path — the
four-file `.claude/skills/systematic-debugging/` directory (`SKILL.md` plus
`root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md`) is
the introductory example. Supporting files carry no YAML frontmatter, matching
their upstream shape, and the provenance HTML comment is their first body
element. Upstream auxiliary files outside the `.md` set
(`.sh`/`.ts`/`-example.*` artefacts, plugin authoring logs, internal pressure
tests) are not vendored; load-bearing technique content always lives in the
supporting `.md` files. A future stream that genuinely needs a referenced
non-`.md` artefact vendors it then; the cost is bounded. Each vendored skill
directory is listed in `.prettierignore` so the upstream Markdown survives
verbatim — `pnpm format` does not touch it, and a future upstream-rebase is a
direct `diff <upstream> <vendored>` modulo the provenance comment, with no
Prettier intermediate step.

---

## Naming Patterns in Data Modules

| Pattern          | Convention        | Examples                              |
| :--------------- | :---------------- | :------------------------------------ |
| ID arrays        | `{domain}Ids`     | `coachIds`, `categoryIds`, `storyIds` |
| Derived ID types | `{Domain}Id`      | `CoachId`, `StoryId`                  |
| Record lookups   | `{domain}ById`    | `coachesById`, `categoriesById`       |
| Section config   | `{domain}Section` | `coachesSection`, `servicesSection`   |
| Display labels   | `{domain}Labels`  | `sectionLabels`                       |

**Exception**: `ServiceCategory` does not follow `{Domain}Id` because a category
is semantically a classification, not an entity identifier. This is intentional.

---

## Exports

All data modules use **collected export blocks at the end of the file** — not
inline `export` at each declaration. This provides a clear public API summary
and makes it immediately visible what is internal vs. exported.

```typescript
// ✅ Collected exports (project convention)
const coachIds = [...] as const;
type CoachId = (typeof coachIds)[number];
const coachesById = { ... } satisfies Record<CoachId, CoachExpanded>;

export { coachIds, coachesById, coachesExpanded };
export type { CoachId, CoachExpanded };
```

```typescript
// ❌ Inline exports (not used in this project)
export const coachIds = [...] as const;
export type CoachId = (typeof coachIds)[number];
```

**Value exports** and **type exports** are in separate `export` / `export type`
blocks for clarity.

**Applies to**: `src/data/*.ts`, `src/utils/*.ts`, `src/types/*.ts`.

**Does not apply to**: Astro components (which export only `Props` via implicit
Astro convention).

> **History.** This convention consolidates
> [ADR-0013 — Use Named Exports for Data Modules](adr/_archive/0013-use-named-exports-for-data-modules.md),
> which records the original rationale (Astro convention, IDE auto-import,
> tree-shaking) and is preserved in `_archive/` for historical lookup.

---

## Imports

### Path Aliases

All imports use the `~` alias for `src/`:

```typescript
// ✅ Alias import
import { slugify } from '~/utils/slugify';
import type { CoachId } from '~/data/coaches';

// ❌ Relative import (only acceptable within the same directory)
import { slugify } from '../../utils/slugify';
```

### No Barrel Files

The project does **not** use `index.ts` re-exports. All imports point directly
to the source file:

```typescript
// ✅ Direct import
import { coachIds } from '~/data/coaches';

// ❌ Barrel import (prohibited)
import { coachIds } from '~/data';
```

**Rationale**: Barrel files degrade tree-shaking reliability, attract circular
dependencies, slow down TypeScript type resolution, and obscure the actual
dependency graph. Direct imports keep dependencies explicit — consistent with
the project's YAGNI approach.

### Import Ordering

Import ordering is **enforced by Biome** (`organizeImports: "on"` in
`biome.json`). No manual sorting required. The logical grouping Biome applies:

1. External packages (`astro:assets`, `vitest`)
2. Alias imports (`~/data/*`, `~/utils/*`, `~/types/*`)
3. Relative imports (same directory only)

Type-only imports use `import type` — enforced by TypeScript's
`verbatimModuleSyntax` and Biome.

This covers **all file types including `.astro`** — Biome parses the frontmatter
for import sorting even though Prettier handles `.astro` formatting. In the
developer workflow:

- **VS Code**: Biome's `source.organizeImports` code action fires on save
  (configured in `.vscode/settings.json` for all languages including `[astro]`)
- **CLI**: `pnpm format` runs `organize-imports` as its first step

---

## Internal Routes

All internal URLs are defined in `src/data/routes.ts` as typed constants. Pages,
CTAs, navigation, and components import from this module instead of using
hardcoded strings:

```typescript
// ✅ Central route reference
import { routes } from '~/data/routes';
primaryCta={{ label: 'Contact Us', href: routes.contact }}

// ❌ Hardcoded string (prohibited)
primaryCta={{ label: 'Contact Us', href: '/contact' }}
```

**Page routes** (`routes.home`, `routes.services`, etc.) are absolute paths.

**Anchor routes** (`homeAnchors.services`, `coachesAnchors.meetTheCoaches`,
etc.) are scoped to specific pages and include the `#` prefix. Each page's
anchors are a separate export to make the scope explicit.

**Rationale**: Eliminates string duplication across pages, data modules, and
components. When a route changes, only `routes.ts` needs updating — TypeScript
flags any consumers that reference removed or renamed exports.

---

## CTA Copy

Two CTA labels are fixed by convention; all other CTA copy stays
page-contextual.

- **Secondary links to `/services`** from pages other than the Services page
  itself use **"Explore Services"** as the label. This applies only to the
  _secondary_ slot — primary CTAs remain page-contextual (e.g.,
  `"Find Your Coach"`, `"Work With Us"`) and must not be normalized.
- **Quiz Modal triggers** — buttons that open the Quiz Modal — use **"Find Your
  Fit"**. This applies only to the trigger side. Internal quiz navigation
  (`Next`, `Back`, `Start Over`) and the quiz-result CTAs (`"See This Program"`,
  `"Get in Touch"`) are separate flows and are not covered by this convention.

**Rationale**: These two labels recur across multiple pages and were aligned
during a site-wide CTA copy review. Fixing them here prevents drift; leaving
primary CTAs free keeps each page's headline action specific to its context.

---

## Data Integrity: `as const satisfies Record<>` Pattern

Domain data with ID-based lookups uses the **const-array + Record + satisfies**
pattern to guarantee compile-time completeness:

```typescript
// 1. ID array — single source of truth
const coachIds = ['helle', 'gina', 'irene'] as const;

// 2. ID type — derived, never manually written
type CoachId = (typeof coachIds)[number];

// 3. Data record — satisfies guarantees completeness
const coachesById = {
  helle: { id: 'helle', ... },
  gina:  { id: 'gina', ... },
  irene: { id: 'irene', ... },
} as const satisfies Record<CoachId, CoachExpanded>;

// 4. Ordered array — derived, follows canonical order
const coachesExpanded = coachIds.map((id) => coachesById[id]);
```

**Why `satisfies` instead of `: Record<>`**: A type annotation widens literal
types to `string`. `satisfies` validates completeness while preserving literal
types — critical when downstream code derives union types from the data (e.g.,
`Step2OptionId` in `quiz.ts`).

**When to use**: Any dataset where IDs are referenced across files — wherever a
typo in a consumer should be a TypeScript error, not a silent runtime miss.

**When NOT to use**: Simple display arrays without cross-references
(testimonials, stats, USPs, FAQ items, navigation).

See [ADR-0017](adr/0017-domain-data-integrity-pattern.md) for the rationale.

### Placeholder-Prefix Convention is File-Local

Two coexisting placeholder-prefix conventions live in the data modules; each is
authoritative within its own file:

- `src/data/services.ts` uses the unbracketed `Placeholder ` prefix (precedent:
  the `competition-prep` entry's bios and copy strings).
- `src/data/servicesMission.ts` uses the bracketed `[PLACEHOLDER]` prefix
  (documented by `MissionBlock.astro`'s JSDoc).

New placeholder strings in either file match that file's existing convention.
The cross-file inconsistency is intentional: within-file consistency makes the
placeholder grep-discoverable against a single anchor per file. Do not migrate
one file's convention to match the other.

---

## Cross-Component DOM ID Registry (`MODAL_IDS`)

IDs that cross component boundaries — where one component renders the id and
another dispatches against it — are registered centrally in `src/data/ids.ts`
rather than repeated as string literals at each site.

```typescript
// src/data/ids.ts
export const MODAL_IDS = {
  quiz: 'quiz-modal',
  coachDetail: 'coach-detail-modal',
} as const;

export type ModalId = (typeof MODAL_IDS)[keyof typeof MODAL_IDS];
```

Consumer sites reference the registry:

```astro
<Modal id={MODAL_IDS.quiz}>...</Modal>
<!-- the definition side -->

<button commandfor={MODAL_IDS.quiz}>...</button>
<!-- a trigger -->
```

**Type safety — what the registry does and does not guarantee**: unknown IDs
(strings that are not registered in `MODAL_IDS`) are rejected at compile time
when the consuming prop is typed as `ModalId`. A hardcoded string that happens
to match a registered value is accepted — the type system enforces
_registration_, not _reference via the registry constant_. For full drift
protection, both sides (definition and trigger) must reference `MODAL_IDS.*`
rather than re-type the literal.

**When to use**: only for IDs that cross component boundaries. Component-
internal scoped IDs (a form field's `for`/`id` pair, an `aria-labelledby` chain
within one component) are out of scope — those stay local to their component,
where the drift surface is a single file and a registry indirection would add
noise without safety gain.

**Adding a new modal**: register the id in `MODAL_IDS` first, then define the
`<Modal id={MODAL_IDS.yourModal}>` element and update all triggers to reference
`commandfor={MODAL_IDS.yourModal}`. The registry is the canonical list;
consumers converge on it.

See [ADR-0027](adr/0027-invokers-api-modal-trigger-standard.md) for the
rationale.

---

## Component Composition

### Extract-First for AI-Assisted Development

Every identifiable UI section becomes its own typed component. Single-consumer
extraction is expected for the first instance of any new section and does not
require justification. Inline use is reserved for two narrow exceptions (see
[ADR-0034](adr/0034-extract-first-for-ai-assisted-development.md)):

1. **Layout wrapper around an already-extracted component.** A page-level
   `<section>` or `<div>` whose only job is to give padding, max-width, or
   background to a single existing component (e.g., a page-specific `<section>`
   around `<Cta>`) stays inline. Wrapping a wrapper adds a file without adding
   structure.
2. **Trivial single-element block with no logic, no typed data, and no reuse
   signal.** A one-line heading, a single `<p>` of static copy, or a decorative
   `<div>` does not warrant a file. The extraction threshold is that there is
   something to type — a data shape, a configuration object, or a repeatable
   pattern.

Everything else — heroes, cards, grids, carousels, section adapters over
`Content`, modals, form blocks, filter bars, navigation widgets — is extracted.
A wrapper that only forwards a slot is inlined (per CLAUDE.md post-change
cleanup rules).

Pages written under the prior inline-first rule (notably
`src/pages/success-stories/[slug].astro`) are not mass-refactored; adjustment
happens in separate scoped PRs.

### Section Components Wrap `Content.astro`

Section components (`Stats`, `Coaches`, `Usps`, `SuccessStories`) delegate their
layout to `Content.astro` and inject domain-specific content via slots:

```astro
<Content headline={headline} background={background}>
  <slot />
  <!-- Intro text (default slot) -->
  <Fragment slot="content">
    <ul class="grid ...">...</ul>
    <!-- Domain-specific grid -->
  </Fragment>
</Content>
```

This keeps layout logic (padding, max-width, section backgrounds) in one place.

This two-step forwarding chain — outer caller → adapter → `Content.astro` →
`SectionHeader` — is the load-bearing trigger for
[ADR-0036](adr/0036-content-aware-slot-detection-in-forwarded-slots.md), which
governs how slot presence is detected inside forwardable components.
[`SectionHeader.astro`](../src/components/ui/SectionHeader.astro) carries the
canonical live implementation.

The operational rule: when a component reads a slot's presence to gate visible
markup and that slot can be forwarded into the component by an intermediate
wrapper, do not use `Astro.slots.has(name)` — it returns `true` for
whitespace-only fragments such as the indentation around a forwarded `<slot />`,
which is enough to register a non-empty payload even when the outer caller
passed nothing. Render the slot and trim its output instead, then emit the
captured HTML through `<Fragment set:html>` so the slot is consumed exactly
once:

```astro
---
const slotHtml = (await Astro.slots.render('default')) ?? '';
const hasSlotContent = slotHtml.trim().length > 0;
---

{
  hasSlotContent && (
    <div class="...wrapper classes...">
      <Fragment set:html={slotHtml} />
    </div>
  )
}
```

### Session-Service Detail Pages Compose the Configurator

The `/services/[slug]` route composes a different bottom section depending on
the service's `pricingModel` discriminator. Subscription-mode services render
`ServicePricingBlock` (the three-tier subscription pricing block). Session-mode
services render `SessionConfigurator` in its place — the configurator owns its
own section header, section background, and per-card CTA strategy. The two
components are **siblings with disjoint responsibilities**, not render-modes of
a shared base: a future change to one does not implicitly couple to the other.
Future session-mode services follow the same configurator-replaces-pricing-block
rule. See [ADR-0051](adr/0051-session-service-detail-page-launch-gate.md) for
the launch-gate predicate split and composition contract.

### Dark Background Handling

Components that render on both light and dark section backgrounds accept a
`darkBackground` prop (or derive it via `isDarkBackground(background)`). Style
variants are computed as objects or ternaries in the frontmatter, not in the
template:

```typescript
// ✅ Style variants in frontmatter
const styles = darkBackground
  ? { title: 'text-white', ... }
  : { title: 'text-foreground-950', ... };
```

The `isDarkBackground()` utility in `src/styles/sectionStyles.ts` is the single
source of truth for which `SectionBackground` values are considered dark.

If you are choosing a variant rather than rendering on one, see
[§ Section Backgrounds](#section-backgrounds).

### Services Overview Coach Presentation

The Services overview opens with a mission-driven coach block, not a credential
strip. The presentation is deliberate, brand-positioning is load-bearing, and
the surface follows four rules:

1. **Mission-driven framing.** The three coaches are introduced as carriers of
   the brand mission, with one mission-connected sentence per coach. The heading
   and paragraph anchor the page in the team's mission rather than in service
   categories.
2. **No specialisation labels.** Per-coach credential lines (the
   `coach.credentialLine` field, rendered on success-story surfaces) are omitted
   here. The coaches are presented as a team, not as filterable specialists.
3. **Photos over initials.** Each coach is shown via portrait photo at a size
   that registers as recognition, not as decoration. Initial-circles or avatar
   placeholders are not used on this surface.
4. **No individual coach metrics; team-level stats anchor the close.** Per-coach
   numeric tiles (years coaching, competitions, clients-served) remain omitted —
   the coaches stay presented as a team, not as filterable specialists.
   Team-level stats render via the canonical `<StatsGrid>` tile sourced from
   `~/data/stats`, anchored after the per-coach attributed sentences as a
   credential anchor that the mission-driven prose introduces. The StatsGrid is
   the line at which numeric proof enters this surface; anything below stays
   mission-text-driven.

These rules govern `src/components/sections/services/MissionBlock.astro` and the
content shape in `src/data/servicesMission.ts`. Reintroducing any of the four
omitted elements is a brand-positioning change, not a tidy-up or a layout
iteration — consult the project owner before moving this surface toward a
conventional coach-card pattern.

---

## Component Reuse Annotations

Every component in `src/components/` carries a JSDoc block immediately above its
`type Props` declaration. The block has one mandatory description line, two
mandatory annotations (`@useWhen` and `@dontUseWhen`), and optional
cross-reference and example annotations. The block serves as a parseable reuse
signal for agents and as inline documentation for future readers via IDE
hover-tooltips.

The schema lives co-located with the source of truth — the component file itself
— so drift requires forgetting to update both the code and the JSDoc in the same
commit, which is mechanically harder than letting a separate inventory document
fall behind. See [ADR-0054](adr/0054-component-reuse-annotations.md) for the
rationale and the deferred-inventory alternative.

### Mandatory fields

- **First line** — a single sentence in the shape
  `X is a Y, with [discriminating attribute]`. The "is a Y" half is mandatory
  and answers the categorical question for an agent scanning the catalogue. The
  discriminating attribute is recommended when "is a Y" alone does not separate
  the component from a near-sibling. The longer "X does Y in context Z" shape is
  acceptable only when the discriminating attribute is itself behavioural and
  cannot be compressed into a single noun-phrase. Behaviour-context belongs in
  `@useWhen`, not the description.
- **`@useWhen`** — a single sentence describing the intent at which a caller
  picks this component. Vague entries ("Use when displaying a card") defeat the
  purpose; the value of this annotation is its discriminator against
  alternatives.
- **`@dontUseWhen`** — a single sentence describing the most common mistaken use
  case. Three shapes are acceptable as long as the entry **adds signal beyond
  `@useWhen`**: the inverse of `@useWhen` (default), a sibling-redirect that
  names the right pick, or the closest plausible mistake when no clear inverse
  or sibling exists. A `@dontUseWhen` that reads as a tautology of `@useWhen`
  ("Don't use when you don't need it") fails the discriminator and is rewritten.

### Optional fields

- **`@alternativeTo {ComponentName} — {one-sentence delineation}`** — used when
  a sibling component shares the surface but is the wrong pick under specific
  conditions. Multiple entries allowed, one per line. The named sibling is
  always a **component** and must exist in `src/components/` — an "alternative
  pick" is by definition another component competing for the same surface.
- **`@relatedTo {Target} — {composition or coupling relationship}`** — used when
  callers typically combine this component with another, or when this
  component's behaviour couples to another (e.g., the header-clearance padding
  in `navigation/Breadcrumb.astro` is calibrated to clear the
  `navigation/Header.astro` height). Multiple entries allowed. `@relatedTo`
  resolves against **four target surfaces**, because a component can
  legitimately couple to a data module, a controller script, or a page layout —
  not only to another component:
  1. **Component** — a PascalCase identifier (e.g., `SegmentedControl`),
     resolving against `src/components/**/<Name>.astro`.
  2. **Data module symbol** — a camelCase identifier (e.g., `coachesExpanded`,
     `statsSection`, `testimonials`, `sectionBackground`), resolving against an
     exported identifier of that exact name under `src/data/**` _or_
     `src/styles/**` (style-token lookup tables such as `sectionBackground` are
     data-shaped exported records that live under `src/styles/`).
  3. **Controller script** — a camelCase identifier ending in `Controller`
     (e.g., `servicesFilterController`), resolving against
     `src/scripts/<name>.ts`.
  4. **Layout** — a PascalCase identifier that resolves against
     `src/layouts/<Name>.astro` (e.g., `BaseLayout`).

  Resolution is deterministic by casing and suffix: a PascalCase name is checked
  first against `src/components/**`, then against `src/layouts/**`; a camelCase
  name ending in `Controller` is checked against `src/scripts/`; any other
  camelCase name is checked against `src/data/**` and `src/styles/**`. A target
  that resolves under none of the four paths is a malformed reference.

- **`@source tailwindplus`** or **`@source external`** — records that the
  component's markup is **design-derived** from a non-project source.
  `@source tailwindplus` marks a component whose `.astro` is a project-authored
  adaptation of a Tailwind Plus UI Block (see
  [ADR-0019](adr/0019-use-tailwindplus-elements-for-interactive-ui.md));
  `@source external` marks an adaptation of any other third-party design source.
  `@source` is about the _design lineage_ of the markup, not a runtime package
  import — a `@source tailwindplus` component is still authored and maintained
  in-project. The default for a component designed from scratch in-project is
  `own`, which is not annotated.
- **`@adr ADR-XXXX`** — used when the component's design is the subject of an
  ADR. Multiple entries allowed if more than one ADR applies. The named ADR must
  exist in `docs/adr/`.
- **`@example`** — a minimal usage snippet, three to six lines. Strongly
  recommended for `ui/`-primitives and non-trivial `sections/` components; omit
  for trivial components without configuration. Hover-tooltip rendering in VS
  Code makes this the highest-ROI optional field for human readers.

### Line width

Reuse-annotation lines wrap at 80 characters. A wrapped continuation repeats the
`*` comment prefix; for a `@tag` value the continuation is indented two further
spaces so the wrapped text aligns under the tag content, while the description
line's continuations use the bare `*` prefix. The Examples below show both.
Prettier does not reflow comment prose, so this wrap is a manual discipline.

### Examples

A `ui/`-primitive with siblings to disambiguate against:

````text
---
/**
 * JS-driven pill-style filter bar, with toolbar / aria-pressed semantics.
 *
 * @useWhen You need URL-state filtering across a server-rendered
 *   catalog with deep-link support.
 * @dontUseWhen You only need a local selection toggle with no URL
 *   state — use SegmentedControl, which is CSS-only via radio
 *   buttons and `:checked`.
 * @alternativeTo SegmentedControl — pick SegmentedControl for pure
 *   local selection without URL state, scroll side-effects, or
 *   deep-links.
 * @relatedTo servicesFilterController — reference consumer that
 *   wires up clicks, URL state, deep-links, and roving-tabindex
 *   keyboard navigation against the `data-{name}-button` /
 *   `data-{name}-group` selectors this primitive emits.
 * @adr ADR-0023
 * @example
 * ```astro
 * <FilterBar
 *   items={[{ id: 'all', label: 'All' }, { id: 'strength', label: 'Strength' }]}
 *   defaultValue="all"
 *   ariaLabel="Filter services by goal"
 *   name="category"
 * />
 * ```
 */
type Props = { ... };
---
````

A trivial primitive without obvious sibling-competitors keeps the block minimal:

```text
---
/**
 * Brand logo, with optional link to home.
 *
 * @useWhen You need the brand logo in a header, footer, or splash
 *   surface.
 * @dontUseWhen You need a generic image — use SmartImage instead.
 */
type Props = { ... };
---
```

### Drift control

When a component's intent shifts — its `@useWhen` no longer describes its actual
call sites — the annotation is updated in the same commit as the semantic
change. The implementer subagent treats an unannotated change as a self-rejected
output.

When a component is renamed or removed, the `@alternativeTo` and `@relatedTo`
references in _other_ components' annotations are updated in the same commit.
The same applies to a renamed data module symbol, controller script, or layout
named by a `@relatedTo` entry. A future sensor may automate this check; until
then, the copy-editor subagent's schema check catches the most common breakage
(dangling references that resolve under none of the four `@relatedTo` target
surfaces).

An `@example` that no longer compiles against the current Props is a worse
failure than no example. When changing a component's Props shape, update or
remove the `@example` in the same commit. The copy-editor's schema check
confirms presence, not validity — a future `check-component-examples.mjs` sensor
that type-checks examples against the live Props is deferred until drift is
observed.

See [ADR-0054](adr/0054-component-reuse-annotations.md) for the rationale, the
deferred-inventory alternative, and the deferred mechanical sensor.

---

## Section Backgrounds

Section components pick a background from a fixed token set. The system
underpins the visual rhythm of the marketing site and is enforced through the
typed `SectionBackground` union: a section that wants a non-default surface
declares it through the `<Section>` wrapper and the matching token, not through
ad-hoc class strings.

The six variants are `default`, `muted`, `teal`, `silver`, `sage`, and
`charcoal`. Each token resolves through utility maps in
`src/styles/sectionStyles.ts` (background classes, foreground class pairs, and
the `isDarkBackground()` predicate that classifies the dark variants for
adaptive components). The `<Section>` wrapper component is the call-site
boundary — it accepts a `background` prop typed as `SectionBackground`, looks up
the token, and applies the resolved classes uniformly so every section uses the
same lookup path.

The full surface specification — hex values, contrast ratios, the AA-revised
silver palette, the choreography rules for adjacent sections — lives in
[reference/color-system.md](reference/color-system.md). That file is the
canonical specification; this section names the rule for picking and rendering a
variant at the call-site.

If a component must adapt its own internal styling to whichever background it
sits on, see
[§ Component Composition → Dark Background Handling](#dark-background-handling).

See [ADR-0014](adr/0014-light-mode-section-background-system.md) for the
rationale; [ADR-0032](adr/0032-revise-silver-surface-for-aa.md) records the
silver revision for AA contrast.

---

## Client-Side Scripts

Module `<script>` is the **default** for all client-side JavaScript.
`<script is:inline>` is reserved for **Critical Early Execution** only — code
that must run before the browser finishes parsing the HTML. See
[ADR-0020](adr/0020-client-side-script-strategy-revised.md).

### Module Script Structure (default)

For simple components, the script lives inline in the `.astro` file:

```typescript
/** Initialize a single component instance. Must be idempotent. */
function initComponent(root: HTMLElement): void {
  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  // ... component logic with full TypeScript support
}

/** Find and initialize all instances on the page. */
function initAll(): void {
  document
    .querySelectorAll<HTMLElement>('[data-my-component]')
    .forEach(initComponent);
}

// Executes once when the module loads. The listener persists and fires
// on every View Transition navigation.
document.addEventListener('astro:page-load', initAll);
```

### Controller Extraction (complex components)

When a component's client-side logic exceeds ~100 lines or has multiple distinct
concerns (state management, DOM manipulation, event binding), extract the
controller into `src/scripts/`:

```typescript
// src/scripts/myController.ts — testable, focused functions
export function initMyComponent(root: HTMLElement): void { ... }

// Component.astro — thin script, just import + init
<script>
  import { initMyComponent } from '~/scripts/myController';
  document.addEventListener('astro:page-load', () => { ... });
</script>
```

**Current example**: `QuizModal.astro` imports from
`~/scripts/quizModalController.ts`. The controller is independently testable
with jsdom (see `quizModalController.test.ts`).

### `is:inline` Structure (Critical Early Execution only)

```javascript
(function () {
  // @inline — Critical Early Execution, see ADR-0020
  // Must run before HTML parsing completes to prevent [specific issue]
  // ...
})();
```

### Rules

**Both patterns:**

- **Idempotent initialization** — the `data-initialized` guard ensures
  re-calling init on an already-initialized element is a no-op
- **Multi-instance safe** — use `querySelectorAll` + per-root init, not
  `querySelector` (components must not assume they are singletons)
- **DOM API only** — never `innerHTML` for user-facing content (XSS prevention)
- **`replaceChildren()`** for clearing container content (not `while`-loops)

**Module scripts:**

- **`const`/`let`** — standard modern JavaScript
- **TypeScript** — typed DOM queries, typed JSON consumption
- **Dual-dispatch init** — components that must initialize on hard loads (cold
  loads from bookmarks, email links, social shares) when View Transitions may be
  unavailable call `bootstrapOnLoad(init)` from `~/utils/bootstrap`, which
  dispatches on both `DOMContentLoaded` (with `{ once: true }`) and
  `astro:page-load`. See ADR-0026 for rationale.
  ```typescript
  import { bootstrapOnLoad } from '~/utils/bootstrap';
  bootstrapOnLoad(() => {
    document
      .querySelectorAll<HTMLElement>('[data-component]')
      .forEach(initComponent);
  });
  ```
  Consumers must make the init function idempotent, typically via a
  `data-initialized` guard set synchronously at function entry. Async init
  functions must set the guard before their first `await` point — dual dispatch
  means the callback may re-enter while a prior invocation is still pending; a
  guard set after an async boundary would not close the re-entrancy window.
  Simpler components without hard-load requirements may use `astro:page-load`
  alone.
- **Event listener cleanup** — listeners on elements inside the component root
  are cleaned up implicitly by DOM swap. Listeners on global objects (`window`,
  `document`, observers) require explicit teardown via `astro:before-swap`

**`is:inline` scripts (legacy / Critical Early Execution):**

- **IIFE wrapper** — necessary because `is:inline` executes in global scope
  (module scripts have implicit scope isolation)
- **`let`/`const`** — all target browsers support them (`var` is no longer
  required)
- **Comment header** with `@inline` tag explaining why `is:inline` is needed

### Data Passing (Astro → Client)

Build-time data is serialized to a hidden `<template>` element:

```astro
<template id="my-data" data-json={JSON.stringify(data)}></template>
```

### Error Handling

JSON parsing from `<template>` elements follows this pattern:

```typescript
const dataEl = document.getElementById('my-data');
if (!dataEl) return;

const json = dataEl.getAttribute('data-json');
if (!json) return;

let data: MyDataType[];
try {
  data = JSON.parse(json);
} catch (e) {
  console.error('[ComponentName] Failed to parse data', e);
  return;
}
```

Three layers: null-check on element → null-check on attribute → try/catch with
component-prefixed error log. The type annotation on `JSON.parse` provides
compile-time safety but not runtime validation — the data is trusted because it
is generated at build time from typed data modules.

### Data Attribute Naming

Client-side scripts use `data-{domain}-{element}` attributes:

```html
data-coach-id="helle"
<!-- domain: coach, element: id -->
data-category-button="wellness"
<!-- domain: category, element: button (FilterBar pill) -->
data-category-group="wellness"
<!-- domain: category, element: group (container for filtered content) -->
data-quiz-step="1"
<!-- domain: quiz, element: step -->
```

The `FilterBar` primitive formalizes this pattern via the `name` prop, which
generates `data-{name}-button` attributes on its pills; the consumer template
(e.g. `ServicesCatalog`) pairs these with matching `data-{name}-group`
attributes on the filtered containers. See ADR-0023 for the decision tree
between FilterBar (URL state, deep-links) and SegmentedControl (pure local
selection).

---

## Cross-Page State Persistence

State that must survive a navigation between two pages — answers from a
multi-step flow, a draft contact-form selection, a UI preference scoped to a
feature — uses `sessionStorage` as the priority store and URL parameters as a
shared-link fallback. Clients without `sessionStorage` (private modes, disabled
storage) still get a working flow because the relevant context is mirrored into
the URL where it makes sense to expose.

The canonical utility is `src/utils/quizContext.ts`, which encapsulates the read
/ write / merge logic for the quiz answers shared between the Quiz Modal and the
Contact page. New cross-page persistence surfaces follow the same shape: a
single utility module per domain that owns the storage key, the read/write API,
and any URL-parameter projection. Consumer components do not hand-roll
`sessionStorage.getItem` calls.

The Quiz → Contact flow is the live instance. The pattern applies to any future
surface where a navigation event interrupts a multi-step action and the state
must be available on the next page without a server round-trip.

See [ADR-0021](adr/0021-session-storage-quiz-persistence.md) for the rationale.

---

## Server Endpoints and Hybrid Rendering

This section is forward-looking — there are no server endpoints in the codebase
today; the rule lands when the Stripe PR adds the first one.

The site is currently full SSG. The planned configuration is `output: 'server'`
with `prerender: true` as the page-level default, so all marketing pages stay
statically rendered and only opt-in routes execute on the server. Server
endpoints are reserved for the Stripe API integration; marketing pages remain
prerendered regardless of how the configuration changes around them. The
configuration switch ships in the same PR that introduces the first server
endpoint.

See [ADR-0022](adr/0022-hybrid-rendering-model.md) for the rationale.

---

## Filterable Catalog Pattern

A filterable catalog page (Services today; future filterable lists tomorrow)
follows a single end-to-end pattern: server-render every entry regardless of URL
parameters, mark up the toolbar with `role="toolbar"` plus `aria-pressed` state
on the pills, hand off to a client-side filter controller that hides
non-matching groups via the `.hidden` attribute, and prevent the deep-link flash
with an inline head-script that applies the URL-parameter filter before the main
script loads.

The toolbar markup uses `role="toolbar"` and per-pill `aria-pressed`, not
`role="tablist"`. The user's mental model on a filterable catalog is _filtering
a visible set_, not _selecting one of several mutually exclusive panels_; the
toolbar pattern also supports an "All" default view that the tablist pattern
rejects. [ADR-0024](adr/0024-category-filter-semantics.md) captures the semantic
decision.

The catalog-page architecture, the inline anti-flash head-script that prevents
content jump on deep-link landings, and the bootstrap path through
`bootstrapOnLoad` (see [ADR-0026](adr/0026-dual-dispatch-controller-init.md))
are documented in [ADR-0025](adr/0025-filterable-catalog-pages.md). The pattern
explicitly applies to future filterable surfaces — Success Stories by tag,
Coaches by specialty — so a new filterable list reads ADR-0025 first and reuses
the shape.

The canonical implementation lives at
`src/components/sections/services/ServicesCatalog.astro` (server-rendered
catalog plus inline anti-flash head-script) and
`src/scripts/servicesFilterController.ts` (client-side filter controller
bootstrapped via `bootstrapOnLoad`). New filterable catalogs mirror this pair.

---

## CSP Hash Strategy

The production Content-Security-Policy in `netlify.toml` allow-lists every
inline `<script>` and `<style>` block via per-block SHA-256 hashes — no
`'unsafe-inline'`. A post-build script (`scripts/generate-csp-hashes.mjs`) scans
`dist/**/*.html`, deduplicates the discovered hashes, and rewrites the
`script-src` and `style-src` directives in `netlify.toml` so the served policy
matches the build output exactly.

The script runs as an `astro:build:done` hook registered in `astro.config.mjs`,
which means the local `pnpm build` and the CI build both keep `netlify.toml` in
sync with the generated HTML. The `.github/workflows/csp-drift.yml` CI workflow
fails if the committed `netlify.toml` is out of sync with the build output —
that guard is the backstop against a developer who forgets to commit the
regenerated hashes.

When you add or change an inline `<script>` or `<style>` block (anywhere — a
component, a layout, a page, a Critical-Early-Execution `is:inline` block per
ADR-0020), run `pnpm build` locally and commit the resulting `netlify.toml` diff
alongside the source change. Skipping the build step means the `csp-drift.yml`
job blocks the PR.

See [ADR-0030](adr/0030-csp-strategy.md) for the rationale and the threat model.

---

## CSS Conventions

### Tailwind CSS vs. Custom Classes

**Default**: Use Tailwind utility classes directly in templates.

**Custom classes in `global.css`** are justified only when Tailwind cannot
express the pattern:

- Keyframe animations (`@keyframes` + `animation:`)
- Pseudo-element effects (`::after`, `::before` with gradient sweeps)
- Complex multi-property hover transitions
- Browser workarounds (`scrollbar-hide`)

**`@apply` is not used.** Tailwind's `@apply` extracts utilities into CSS
classes — this defeats the utility-first approach, creates an abstraction layer
that hides what styles are applied, and makes it harder to search for class
usage. If a pattern needs a custom class, write the CSS properties directly
instead of compositing utilities via `@apply`.

### Custom Class Naming

Custom utility classes in `global.css` use **kebab-case**:

```css
.hover-scale { ... }
.hover-shine { ... }
.animated-underline { ... }
.scrollbar-hide { ... }
```

### Animation Data Attributes

Scroll-reveal animations use `data-animate` with predefined values. See
[Animation System Reference](reference/animation-system.md) for the full list.

### `set:html` Safety

Every use of Astro's `set:html` directive has a `SECURITY` or `SAFETY` comment
confirming the content is from a trusted static source:

```astro
{/* SAFETY: icon content is statically defined in ~/data/icons.ts */}
<svg set:html={icon} />
```

> ⚠️ **Astro 6 parser strictness**: JSX comments (`{/* ... */}`) must be placed
> _before_ the element, not _inside_ the element's attribute list. The stricter
> JSX parser interprets braces between attributes as expressions, causing type
> errors.
>
> ```astro
> {/* ✅ Comment before element */}
> <svg class="size-6" set:html={icon} />
>
> {/* ❌ Comment inside attribute list — causes parse errors */}
> <svg class="size-6" {/* SAFETY: ... */} set:html={icon} />
> ```

If a new `set:html` usage is added without this comment, it should be flagged in
code review.

---

## TypeScript Conventions

### Style Guide Baseline

This project follows the
[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
as its baseline for TypeScript code style. Enforcement is automated at two
levels:

- **Biome** enforces formatting (semicolons, single quotes, trailing commas) and
  structural rules (`noDefaultExport`, `useConsistentArrayType`, `noConstEnum`,
  `useGuardForIn`, etc.). Run via `pnpm lint`.
- **`scripts/check-conventions.mjs`** covers rules Biome cannot express: no
  `parseInt`/`parseFloat`, no `interface` for object shapes, and camelCase file
  naming. The check functions live in `scripts/conventions/checks.mjs` (pure
  logic, independently testable); the CLI wrapper handles I/O and reporting. Run
  via `pnpm check:conventions`.

Both run as part of `pnpm check`.

The project deviates from Google's guide in two documented cases:

#### Deviation 1: `type` over `interface` for object shapes

Google recommends `interface` for object literal types. This project uses `type`
exclusively (consolidated from
[ADR-0009](adr/_archive/0009-use-types-for-component-props.md), which records
the original rationale).

**Rationale:**

- `type` supports unions and intersections natively — frequently needed for
  component props and discriminated unions (`ImageSource`, `CtaAction`).
- `interface` allows implicit declaration merging, which is undesirable for
  component props where accidental merging could introduce bugs.
- Consistent with the Astro/frontend ecosystem convention (Matt Pocock's Total
  TypeScript recommends `type` as default).

**Where `type` is required** (not a style choice): discriminated unions
(`ImageSource`, `CtaAction`), string literal unions (`ServiceCategory`,
`CoachId`, `SectionBackground`), and type aliases.

#### Deviation 2: `camelCase` file names instead of `snake_case`

Google's internal convention uses `snake_case` for TypeScript file names. This
project uses `camelCase` for `.ts` files and `PascalCase` for `.astro`
components (see [File Naming](#file-naming) above).

**Rationale:**

- Astro components must be PascalCase. Using `snake_case` for `.ts` files would
  introduce a third naming convention alongside PascalCase (`.astro`) and
  kebab-case (pages/routes).
- `camelCase` is the de-facto standard in the frontend ecosystem (React, Vue,
  Astro, Next.js).
- Google explicitly notes that its guide is _"specifically useful for people
  authoring code they intend to import into Google, but otherwise may not apply
  in your external environment."_

### Props Definitions

Component props use `type` (not `interface`) — see § TypeScript Conventions →
Deviation 1 (consolidated from ADR-0009):

```typescript
type Props = {
  /** Headline text */
  headline: string;
  /** Background variant */
  background?: SectionBackground;
};
```

### Image Handling

Content images use the `ImageSource` discriminated union and `SmartImage`
component per [ADR-0010](adr/0010-use-astro-image-component-consistently.md).
Small decorative images (≤ 64px, e.g., avatars) may use plain `<img>`.

> **History.** § TypeScript Conventions consolidates
> [ADR-0009 — Use `type` for Component Props](adr/_archive/0009-use-types-for-component-props.md)
> (the Deviation 1 source), which records the original rationale
> (union/intersection support, declaration-merging risk, IDE error precision)
> and is preserved in `_archive/` for historical lookup.

---

## Testing Conventions

Test files are **co-located** with their source:

```
src/utils/
├── slugify.ts
├── slugify.test.ts
├── isExternal.ts
├── isExternal.test.ts
├── counter.ts
└── counter.test.ts

scripts/conventions/
├── checks.mjs
└── checks.test.mjs
```

Vitest discovers tests in both `src/` (`.test.ts`) and `scripts/` (`.test.mjs`)
— see `vitest.config.ts` for the include patterns.

**Shared test helpers** live in `src/test-utils/` — use these before writing
inline assertion helpers to avoid duplication:

```typescript
import { assertDefined, assertNotNull } from '~/test-utils/assertions';

const el = modal.querySelector<HTMLInputElement>('.my-input');
assertNotNull(el); // Fails fast if null, narrows type to HTMLInputElement
el.checked = true; // No lint warning, no `!` needed
```

Tests should cover: JSDoc examples, edge cases, error cases, and real-world
values from the project's data modules.

**Vitest is the unit-test runner** for all `src/utils/*.ts`, `src/scripts/*.ts`,
`src/data/*.ts` data-integrity, and `scripts/**/*.mjs` tests. Configuration
lives at `vitest.config.ts`; the `~/` alias is declared there in parallel to
`tsconfig.json` so both compile and test see the same module resolution. The
runner is chosen for Vite-pipeline alignment: Astro is built on Vite, and using
a Vite-native test runner avoids a second TypeScript-transform pipeline and a
second path-alias declaration. `pnpm test` runs in watch mode for development;
`pnpm test:run` runs once for CI and pre-push verification. Component tests —
those whose failure mode is Prop-to-DOM rather than function-to-return-value —
use the Astro Container API per
[ADR-0037](adr/0037-adopt-astro-container-api-for-component-tests.md); the rule
for picking a unit-test pattern versus a Container-API pattern lives in
[§ Component Tests with Astro Container API](#component-tests-with-astro-container-api).

### Component-Level Accessibility Tests

Every `*.test.ts` file co-located with a component under `src/components/ui/` or
`src/components/navigation/` calls `expectNoA11yViolations` at least once per
rendered Prop variant. The helper runs axe-core over the Container-API render
and fails the test on any WCAG 2.1 AA violation — catching the AI-edit
regression class (a removed `aria-*`, a swapped semantic element, a dropped
`alt`) that prose review alone misses. See
[ADR-0052](adr/0052-component-level-accessibility-testing-with-axe-core.md) for
the rationale and the rejected alternatives.

The helper lives at `src/test-utils/a11y.ts` — the single sanctioned `axe-core`
call site (`rg "axe-core" src/` resolves to exactly one file):

```typescript
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

const html = await renderAstro(Button, { props: { href: '/contact' } });
await expectNoA11yViolations(html);
```

Signature:
`expectNoA11yViolations(html: string, options?: { disableRules?: readonly string[] }): Promise<void>`.
The helper bakes in the WCAG 2.1 AA tag set and a baseline of fragment-rendering
rule disables (page-level rules that would fire false positives on isolated
component fragments); per-call `disableRules` extend that baseline.

A per-test rule disable carries a single-line justification comment immediately
above the call, in the form
`// axe-disable: <rule-id> — <one-line justification>` (em-dash separator, no
trailing period, matching the codebase's `// @ts-expect-error — ...`
convention). A disable without an adjacent justification is a review finding.
When a single root cause justifies disabling multiple rules, the rule-ids go
comma-separated on one line with one shared justification
(`// axe-disable: <rule-a>, <rule-b> — <one-line justification>`).

Components under `src/components/sections/` and `src/components/layout/` are
**not** in this coverage floor — their accessibility is verified at
page-composition level rather than per-component.

### Test Fixture Identifiers and the Pre-Commit Gitleaks Hook

Test fixtures sometimes carry identifier-like strings — record keys, content
hashes, session tokens — anonymised from real-world API captures. The pre-commit
`gitleaks` hook runs the `generic-api-key` rule against every staged file,
including fixtures, and flags strings that combine **length ≥ ~17 characters**
_and_ sufficient substring entropy. Crossing both thresholds blocks the commit.

**Working pattern:** keep anonymised fixture identifiers short — ≤ 16 characters
works in practice — and prefer vowel-rich, low-entropy substrings when length
cannot be reduced. Empirical evidence captured against
`scripts/sonar-findings/fixtures/` shows the threshold behaviour:

| Identifier shape       | Length | Result   | Why                                   |
| :--------------------- | :----- | :------- | :------------------------------------ |
| `FIXTURE-ISSUE-NNNN`   | 18     | passes   | vowels keep entropy below threshold   |
| `FIXTURE-HOT-NNNN`     | 16     | passes   | short enough on its own               |
| `FIXTURE-HSPOT-NNNN`   | 18     | rejected | consonant cluster pushes entropy over |
| `FIXTURE-HOTSPOT-NNNN` | 20     | rejected | both thresholds crossed               |

If the hook rejects a planned identifier, **shorten before reaching for a
`.gitleaks.toml` allowlist entry** — config-side bypasses widen the suppression
surface project-wide and are heavier than choosing a different fixture name. The
same constraint applies to any future fixture set (Stripe webhooks, GitHub API
responses, OAuth callbacks, etc.), not just the Sonar capture that surfaced it.
See
[ADR-0042 § Hotspot extension](adr/0042-agent-side-sonarcloud-findings-query.md#hotspot-extension)
for the empirical episode.

> **History.** § Testing Conventions consolidates
> [ADR-0016 — Use Vitest for Unit Testing](adr/_archive/0016-use-vitest-for-unit-testing.md),
> which records the runner choice, Vite-pipeline alignment, and the rejected
> alternatives (Jest, `node:test`, Bun test). It is preserved in `_archive/` for
> historical lookup. The Container-API extension referenced above is
> [ADR-0037](adr/0037-adopt-astro-container-api-for-component-tests.md), which
> narrows ADR-0016's original "Out of Scope: Component tests" boundary —
> component tests with a rendering context are now in scope under the
> conventions in
> [§ Component Tests with Astro Container API](#component-tests-with-astro-container-api).

---

## Component Tests with Astro Container API

Use the Astro Container API when the failure mode under test is _Prop-to-DOM_ —
a regression that pure helper-function tests cannot catch because the bug lives
in the rendered template, not in a return value. The canonical example is a
Prop-conditional template branch that disappears when the Prop shape changes;
only a render-and-query test fails on that regression.

The shared render helper is `src/test-utils/renderAstro.ts`. It wraps the
Container API behind a typed entry-point that takes a component and its Props,
returns a parsed DOM, and lets the test query and assert against the rendered
output the same way a browser would. Co-located `*.test.ts` files import the
helper and write Prop-driven render-and-query tests next to the component.

Pure helper functions (predicates, formatters, builders) keep using plain Vitest
tests against the function's return value — Container-API tests are for the
Prop-to-DOM surface specifically.

See [ADR-0037](adr/0037-adopt-astro-container-api-for-component-tests.md) for
the rationale and the failure modes the Container API addresses.

For the complementary a11y assertion added alongside Container-API DOM
assertions, see
[§ Component-Level Accessibility Tests](#component-level-accessibility-tests).

---

## Dynamic Detail Routes

A dynamic detail route (`/<domain>/[slug]`) follows a four-rule pattern that
keeps the routing layer typed, the launch surface controlled, and the user
journey navigable:

1. **Typed `getStaticPaths`.** Every dynamic route exports a `getStaticPaths()`
   whose return type derives from the domain's ID-keyed data module. The
   `params.slug` and the page's `Astro.props` reach the template with full type
   information; an unknown slug is a TypeScript error, not a runtime miss.
2. **Co-located launch-gate predicate.** The data module that drives the route
   also exports a launch-gate predicate (e.g., `isLaunched`,
   `isPubliclyVisible`) that the route filters by. Drafts and unpublished
   entries do not generate static paths; flipping an entry to launched is a
   one-data-edit change.
3. **Co-located `<domain>DetailHref` helper.** A typed helper builds the detail
   URL from an entry's slug — pages and components import the helper instead of
   templating the URL inline. The helper lives in the same file as the data;
   renaming the URL pattern is a one-place change.
4. **Breadcrumb at the page top.** Detail pages render a breadcrumb at the top
   so the user can navigate back to the catalog. The breadcrumb shape and
   styling are reused across detail routes; new detail routes adopt the same
   component.

The canonical implementations are `src/pages/services/[slug].astro` and
`src/pages/success-stories/[slug].astro`. A new detail route mirrors the same
four rules and references the same helpers.

See [ADR-0038](adr/0038-dynamic-detail-route-pattern.md) for the rationale.

---

## Related Documentation

| Document                                          | Focus                          |
| :------------------------------------------------ | :----------------------------- |
| [CONTRIBUTING.md](../CONTRIBUTING.md)             | Workflow, commits, PR process  |
| [ARCHITECTURE.md](ARCHITECTURE.md)                | High-level decisions and ADRs  |
| [DEVELOPMENT.md](DEVELOPMENT.md)                  | Setup, tooling, daily workflow |
| [Animation System](reference/animation-system.md) | Scroll reveals, hover effects  |
| [Color System](reference/color-system.md)         | Design tokens, backgrounds     |
