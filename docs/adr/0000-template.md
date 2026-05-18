# {Short, descriptive title}

Date: {YYYY-MM-DD}

{Optional metadata — include only when this ADR fully supersedes one or more
prior ADRs. Add one line per superseded ADR. For partial supersession, document
the scope on the superseded ADR's Status line instead (see the
partially-superseded Status variant below).}

Supersedes: [ADR-XXXX](XXXX-....md)

## ADR Warrant Check

Mark at least one trigger; otherwise this is not an ADR but a commit message,
JSDoc note, or [`docs/CONVENTIONS.md`](../CONVENTIONS.md#when-to-write-an-adr)
entry.

- [ ] **A — Contract**: the decision creates or changes a contract future code
      must honour _project-wide_.
- [ ] **B — Asymmetry**: the decision sets a deliberate asymmetry a future
      contributor or AI-assisted edit would otherwise tidy back to symmetry.
- [ ] **C — External revisit**: the decision has a _named, documented_ revisit
      trigger.
- [ ] **D — Promise/Code Asymmetry**: the concept document for a stream
      promised X but the implementation that landed is Y, and the divergence
      is not yet resolved on either side.

Not triggers: large diff, type-system involvement, placeholder-content removal,
a paragraph of justification, "the architect found this decision interesting".

## Status

{Accepted | Proposed | Deferred | Deprecated | Superseded by
[ADR-XXXX](XXXX-....md) | Accepted (partially superseded by
[ADR-XXXX](XXXX-....md) for {scope}) | Consolidated into {target document
section, e.g., `docs/CONVENTIONS.md#imports`}}

Use `Deferred` when a decision has been worked through but is intentionally
postponed — the reasoning is recorded so the decision is ready to revive later.
Document the defer reason and any revisit trigger in a `## Notes` section.

Use `Consolidated into [target]` when the ADR's substance has been fully
absorbed into a living document (typically `docs/CONVENTIONS.md` or `CLAUDE.md`)
and the historical reasoning is no longer worth carrying forward as a separate
ADR. The ADR is moved to `docs/adr/_archive/`. See
[`docs/ARCHITECTURE.md` → ADR Lifecycle](../ARCHITECTURE.md#adr-lifecycle) for
the criteria.

## Context

{What is the problem? Why is a decision needed now?}

### Decision drivers

{Optional — explicit list of priorities that shaped the decision. Most useful
when multiple competing concerns need balancing.}

- {Driver 1 (e.g., "Maintain static performance for marketing pages")}
- {Driver 2 (e.g., "Minimize operational complexity")}

### Evaluated approaches

1. **{Option A}** — {brief description}. {Why rejected or chosen.}
2. **{Option B}** — {brief description}. {Why rejected or chosen.}
3. **{Option C}** — {brief description}. **Chosen.**

## Decision

{What is the chosen solution? How will it be implemented?}

### What does NOT change

{Optional — for decisions that change something fundamental (rendering model,
data format, script strategy), explicitly list what remains unaffected. This is
the most important trust-building section for readers and AI tools.}

- {Unaffected concern 1}
- {Unaffected concern 2}

### Scope and non-goals

{Optional — use when the boundary between this ADR and related decisions needs
explicit clarification.}

**In scope:**

- {What is explicitly covered by this decision?}

**Out of scope:**

- {What is explicitly excluded to prevent misunderstandings?}

## Consequences

### Positive

- {Benefit 1}
- {Benefit 2}

### Negative

- {Drawback / cost / complexity}
- {Drawback / cost / complexity}

### Risk mitigation

{Optional — how do we address the negative consequences or residual risks? Omit
if the negatives are self-contained and need no mitigation strategy.}

- {Mitigation 1}

## Success criteria

{Optional — measurable conditions that indicate this decision was successful.
Omit if success is self-evident (e.g., "Stripe payments work"). Use when the
decision introduces a migration, a performance target, or a process change.}

- {Measurable condition 1 (e.g., "Page load under 2s")}
- {Measurable condition 2 (e.g., "Zero `is:inline` scripts remain except...")}

## Documentation Updates

This ADR requires updates to the following documents in the same commit (or
series of commits) as the ADR itself. The author lists them here when writing
the ADR; the implementer makes the updates as part of the ADR's introduction.

If no updates are required, write "None" with a one-line justification.

**Commonly affected documents — check each for relevance:**

- `docs/ARCHITECTURE.md` → ADR Quick Reference entry, plus the section that
  summarizes the affected concern (data flows, page maps, design system, etc.)
- `docs/AGENTS.md` → if the change affects orchestrator behaviour, agent
  responsibilities, the phase flow, the "What Lives Where" inventory, or
  introduces/removes a documentation artefact under `docs/`
- `CLAUDE.md` → Critical Rules (if the ADR introduces a hard rule), Conventions
  Quick Reference (if the ADR changes a coding convention)
- `docs/CONVENTIONS.md` → the section corresponding to the ADR's domain
  (imports, components, scripts, styles, data, etc.)
- `docs/CONVENTIONS.md#topic-hub-index` → if the ADR introduces a new
  code-writing surface (a new component pattern, a new data domain, a new
  service module) that contributors need to discover task-first
- `CONTRIBUTING.md` → only if the ADR changes the commit, branch, or PR workflow
- Other ADRs → if this ADR supersedes, partially supersedes, or refines them,
  update their Status line accordingly; if their cross-references should now
  point to this ADR, update those too

**Updates required by this ADR:**

- {`path/to/file.md#anchor` — what changes}
- {e.g., `docs/CONVENTIONS.md#component-composition` — add render-and-trim
  guidance, replacing the previous `Astro.slots.has` example}

Use Markdown anchors (`#section-slug`) to link to the specific section being
updated, not just the file. The anchor matches the slug of the target section's
header. This makes the updates concrete and verifiable in review.

## References

- {Links to documentation, related ADRs, or articles}
