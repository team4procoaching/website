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

## Commit Plan

### Commit 1: <subject>

- **Scope:** <files, what changes>
- **Rationale:** <why a separate commit>

### Commit 2: <subject>

- **Scope:** ...
- **Rationale:** ...

## Test Approach

<Which tests are new, which existing tests are adjusted. Which behavioral
properties are covered.>

## Self-Critique

<The strongest counter-argument against this plan.>

<Your response to it.>
