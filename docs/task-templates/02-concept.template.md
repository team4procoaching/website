# Concept: <Task Title>

**Task ID:** <task-id> **Requirements:**
`.claude/work/<task-id>/01-requirements.md` **Date:** <YYYY-MM-DD> **Status:**
Draft | Approved

## Solution Classes Considered

### Approach A: <n>

- **Core idea:** ...
- **Concrete meaning:** ...
- **When right:** ...
- **When not:** ...

### Approach B: <n>

- **Core idea:** ...
- **Concrete meaning:** ...
- **When right:** ...
- **When not:** ...

<Further approaches as needed. If only one is plausible: say so
explicitly and justify.>

## Chosen Approach

<Which approach wins. Which specific property decided it.>

## Affected Files

| Path      | Change          | Short description |
| --------- | --------------- | ----------------- |
| `src/...` | new/edit/delete | ...               |

## Reused Patterns

<Which existing components, utilities, types are reused. References to concrete
files.>

## New Abstractions

<Every new type, component, utility, module. For each: why it must be new
instead of extending an existing one.>

## Consumers of Changed Values

<Grep-based list of all callers of changed/removed/renamed values.>

```bash
# Executed grep command:
# <command>
```

```
# Output:
<output>
```

## Structural Health Check

<Per existing file the plan touches: assessment against CONVENTIONS
and ADRs. Findings addressed or explicitly deferred.>

<If a touched `.astro` file exposes or forwards a slot (grep-decidable via
`<slot` or `Astro.slots` in the file): does the concept apply ADR-0036
(render-and-trim over `Astro.slots.has` for forwardable visible-gate slots)?>

## Documentation Updates

This concept may require updates to project documentation beyond the code
changes. List them here so the implementer covers them in the commit plan and
the reviewer can verify completeness.

If no documentation updates are required, write "None" with a one-line
justification.

**Commonly affected documents — check each for relevance:**

- `docs/ARCHITECTURE.md` → if the change affects project structure, page maps,
  data flows, design system tokens, or the ADR Quick Reference
- `CLAUDE.md` → Critical Rules (if a hard rule changes), Conventions Quick
  Reference (if a coding convention changes)
- `docs/CONVENTIONS.md` → the section corresponding to the changed domain
  (imports, components, scripts, styles, data, etc.)
- `docs/CONVENTIONS.md#topic-hub-index` → if the change introduces a new
  code-writing surface (a new component pattern, a new data domain, a new
  service module) that contributors need to discover task-first
- `docs/adr/` → a new ADR if the change introduces an architectural decision;
  updates to existing ADR Status lines if this concept supersedes or refines
  them
- `CONTRIBUTING.md` → only if the change affects the commit, branch, or PR
  workflow
- `docs/REQUIREMENTS_GUIDE.md`, `docs/DECISION_GUIDES.md`,
  `docs/FEATURE_TEMPLATE.md` → only if the change affects the
  requirements-analyst or design-sparring process itself

**Updates required by this concept:**

- {`path/to/file.md#anchor` — what changes}

Use Markdown anchors (`#section-slug`) to link to the specific section being
updated, not just the file. The anchor matches the slug of the target section's
header.

## Commit Plan

### Commit 1: <subject>

- **Scope:** <files, what changes>
- **Rationale:** <why a separate commit>

### Commit 2: <subject>

- **Scope:** ...
- **Rationale:** ...

<Documentation updates from the section above are part of the commit plan, not a
separate post-hoc step. Either fold them into the commit that introduces the
related code change, or list them as their own commit when the documentation
change stands on its own.>

## Test Approach

<Which tests are new, which existing tests are adjusted. Which behavioral
properties are covered.>

## Self-Critique

<The strongest counter-argument against this plan.>

<Your response to it.>
