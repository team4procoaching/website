# Adopt Subagent Architecture for AI-Assisted Development

Date: 2026-04-24

## Status

Accepted

## Context

Early in the project, AI-assisted work happened in a single Claude Code session
that covered all phases — requirements, design, implementation, and review. Over
several months of use, three recurring failure modes emerged:

1. **Instruction drift.** The assistant would praise an architectural direction
   during design sparring, then silently implement something different. A single
   context that carries both the plan and the implementation tends to smooth
   over its own contradictions. The project owner observed this repeatedly and
   documented it as a primary pain source.
2. **Scope creep.** The assistant would notice "related" issues during
   implementation and fix them unasked, turning a focused change into a large
   diff. Reviewers could not distinguish between the requested change and the
   opportunistic fixes.
3. **Parallel-session confusion.** Running two Claude Code sessions in the same
   repository produced branch-switching conflicts and inconsistent state. The
   assistant in one session was unaware of changes made by the assistant in the
   other.

A structural response was needed. Guidance and reminders in `CLAUDE.md`
repeatedly proved insufficient — the same failures recurred under slightly
different circumstances. The problem was not instruction quality but context
architecture: a single context that reads the plan is the same context that
writes the code, which is the same context that reviews the code.

### Decision drivers

- **Structural safety over reviewer discipline.** Prefer mechanisms that fail
  loud (tool-level denials, isolated contexts, written handover artefacts) over
  mechanisms that rely on remembering to follow a rule.
- **Bus Factor.** The architecture must be documented and operable by a
  replacement maintainer without tribal knowledge. Process rules must live in
  committed files, not in the current maintainer's memory.
- **Minimal overhead for trivial work.** A full pipeline for every typo fix is
  worse than no pipeline at all.
- **Owner retains final authority.** The owner signs commits, approves Phase
  transitions, and decides which findings to address. Agents propose; the owner
  disposes.

### Evaluated approaches

1. **Strengthen the single-session prompt.** Iterate on `CLAUDE.md` with more
   detailed rules, more explicit phase boundaries, more "think hard" injections.
   **Rejected** — this was the approach used for months before this decision.
   The failures were not rule omissions but structural: a single context can be
   instructed to stay disciplined across phases but cannot be forced to.

2. **Ad-hoc specialized prompts.** Maintain a library of role-specific prompt
   templates that the owner pastes into a Claude Code session for specific
   phases. **Rejected** — this requires manual prompt management, does not
   enforce tool boundaries, and does not produce written handover artefacts
   between phases.

3. **Subagent architecture with tool whitelists and written handover
   artefacts.** **Chosen.** Each phase runs in a dedicated agent with its own
   system prompt (`.claude/agents/<n>.md`), its own tool whitelist, and its own
   isolated context. Handovers between phases happen through Markdown documents
   under `.claude/work/<task-id>/` — gitignored and worktree-local, living only
   as long as the task does. A main session acts as Orchestrator: it talks to
   the owner, delegates to agents via the `Task` tool, and consolidates outputs.
   The permission policy at `.claude/settings.json` enforces tool boundaries
   that prompts alone could not.

## Decision

Work on this project is organized around seven specialized subagents plus an
Orchestrator role played by the main Claude Code session:

| Agent                  | Phase    | Role                                                       |
| :--------------------- | :------- | :--------------------------------------------------------- |
| `requirements-analyst` | Phase 1  | Produces requirements documents, asks clarifying questions |
| `architect`            | Phase 2  | Produces concept documents and ADRs with commit plans      |
| `concept-reviewer`     | Phase 2  | Adversarial review of concept documents before Phase 3     |
| `implementer`          | Phase 3  | Executes concept documents commit-by-commit                |
| `reviewer`             | Phase 4  | Reviews branches or defined file sets against standards    |
| `debt-auditor`         | —        | Systematic debt hunt within a defined category             |
| `copy-editor`          | post-hoc | Opt-in text polish for ADRs, concepts, public content      |

Full role definitions are in `.claude/agents/<n>.md`. The architecture overview
and its operational rules are in `docs/AGENTS.md`. The Orchestrator system
prompt plus Phase 3 implementation rules are in `CLAUDE.md`.

### Tool whitelist enforcement

`.claude/settings.json` defines a positive-list bash permission policy. Only
explicitly allowed commands run without prompting; state-changing git commands,
shell wrappers (`bash -c`, `eval`), foreign runtimes (perl, python, deno, bun,
make), awk (`system()` builtin), binary readers (xxd, od, dd, hexdump), and
reads and redirect-writes against `.env`, `secrets/`, `.git/config` are denied
at the tool level. Operations that can execute arbitrary code (`pnpm exec`,
`npx`, `node -e`, `git config`) require owner confirmation via `ask`.

### Commit signing boundary

`git commit` is denied at the tool level. The implementer stages files with
`git add` and writes the commit message to `.git/COMMIT_EDITMSG`. The project
owner signs with `git commit -S -F .git/COMMIT_EDITMSG`. This mirrors the
pre-existing signing requirement from `CONTRIBUTING.md` and makes the separation
structurally enforceable.

### Quick Fix escape hatch

Trivial single-location changes (one clearly defined change, no wording or
placement decisions, no new abstractions, describable in 1–3 sentences) skip
Phases 1 and 2. The Orchestrator delegates directly to the implementer with the
fix description as the concept. Phase 4 applies the documentation-surface
discriminator: Quick Fixes that touch documentation, JSDoc, ADR references, or
anchor strings trigger the reviewer as a pre-push gate; pure code or styling
Quick Fixes skip the reviewer. The Orchestrator classifies each Quick Fix at
dispatch time. This prevents the pipeline from becoming overhead for changes
that do not benefit from it.

### What does NOT change

- `CONTRIBUTING.md` commit conventions (Conventional Commits with mandatory
  scope, signed commits, branch-based workflow).
- `CLAUDE.md` Critical Rules for Phase 3 implementation (routes, scripts, data
  integrity, exports, barrels, readonly props, images, tests).
- The existing ADRs. None are superseded by this decision.
- `docs/CONVENTIONS.md` coding conventions.
- Existing documentation under `docs/` (CONVENTIONS.md, DEVELOPMENT.md,
  MAINTENANCE.md, FEATURE_TEMPLATE.md, DECISION_GUIDES.md, reference/).
- The human-facing workflow: the project owner can still contribute changes
  without invoking any agent.

### Scope and non-goals

**In scope:**

- The seven subagent definitions under `.claude/agents/`.
- The permission policy at `.claude/settings.json`.
- The overview document `docs/AGENTS.md`.
- Templates under `docs/task-templates/` and the debt register template at
  `docs/debt/REGISTER.template.md`.
- Cross-reference updates in `README.md`, `docs/ARCHITECTURE.md`,
  `docs/DEVELOPMENT.md`, `docs/REQUIREMENTS_GUIDE.md`, and `CONTRIBUTING.md`.
- Language convention: all `.claude/` and `docs/` artefacts in English; project
  owner chat with the Orchestrator remains in the owner's working language.

**Out of scope:**

- Migrating historical review reports under `.claude/reviews/` or plans under
  `.claude/plans/` to the new `.claude/work/` structure. Those remain where they
  are; the new structure applies to tasks going forward.
- Retroactively producing concept documents for already-merged work.

## Consequences

### Positive

- **Instruction drift is structurally prevented.** An agent that implements
  cannot see the design conversation — it reads only the written concept
  document. What the owner and the Orchestrator discussed during design sparring
  is not in the implementer's context.
- **Scope creep is constrained.** The implementer's tool whitelist permits edits
  only to files, not broad refactoring. Findings outside the concept's scope are
  reported back, not silently fixed.
- **Parallel sessions no longer interfere.** Each agent runs in an isolated
  context; session state does not leak between Orchestrators.
- **Handover is written down.** ADRs and debt-audit reports are persistent
  Markdown under version control. Task-scoped documents (requirements, concept,
  concept-review, review) live in the feature worktree only — gitignored under
  `.claude/work/<task-id>/` and removed with the worktree post-merge. A
  replacement maintainer reconstructs persistent reasoning from main and
  in-flight task reasoning from any feature worktrees they inherit.
- **Permission policy is defense-in-depth.** State-changing git commands, shell
  escapes, and secret-file access are denied at the tool level — not only
  instructed against.

### Negative

- **Per-task overhead.** A full-pipeline feature task now requires multiple
  agent invocations and explicit owner decisions at phase boundaries. For
  trivial changes this would be prohibitive, which is why the Quick Fix escape
  hatch exists.
- **Coordination complexity.** The Orchestrator must maintain task state across
  phases, assign task IDs, number ADRs without collisions, and manage the
  feature-worktree lifecycle (task docs are worktree-local and disappear with
  the worktree on merge). This is more Orchestrator-side work than a
  single-session approach demands.
- **Agent prompt maintenance.** Seven role definitions under `.claude/agents/`
  must stay consistent with the broader architecture as CLAUDE.md,
  CONVENTIONS.md, and relevant ADRs evolve. Drift between agent prompts and the
  rest of the documentation is a real failure mode.
- **`ask` prompts add interruption.** The owner sees permission prompts for
  operations the implementer legitimately needs (e.g., `git add`, occasional
  `pnpm exec`). This is the price of defense in depth and is by design.

### Risk mitigation

- **Agent prompt drift.** The `copy-editor` agent and periodic `reviewer` passes
  in audit mode against `.claude/agents/*.md` can catch drift. AGENTS.md
  explicitly states that the agent prompts are the authoritative live behavior
  and AGENTS.md itself is the map — if they disagree, the prompt wins and
  AGENTS.md is updated.
- **Permission policy too tight.** The positive list is designed to be extended.
  If a legitimate command repeatedly triggers an `ask` prompt without any real
  risk, it is moved to `allow` in a follow-up patch.
- **Pipeline perceived as overhead for small work.** The Quick Fix escape hatch
  and the owner's discretion to skip Phase 4 on minor tasks keep the system from
  becoming bureaucratic.

## Success criteria

- A task completed end-to-end through the pipeline produces requirements,
  concept, concept-review, and review artefacts under `.claude/work/<task-id>/`
  inside the feature worktree — gitignored, and removed when the worktree is
  deleted post-merge.
- Instruction-drift incidents (architecture praised, then implemented
  differently) no longer occur, because the implementer cannot see what the
  architect was praised for.
- A replacement maintainer can read `docs/AGENTS.md`, the ADRs, and the agent
  definitions, and operate the system without tribal knowledge transfer.
- The Quick Fix path handles trivial changes without invoking Phases 1 and 2,
  keeping the pipeline from becoming friction for simple work.

## References

- `docs/AGENTS.md` — operational overview of the architecture.
- `CLAUDE.md` — Orchestrator system prompt and Phase 3 working rules.
- `docs/REQUIREMENTS_GUIDE.md` — detailed instructions for the
  `requirements-analyst` agent.
- `.claude/agents/*.md` — individual agent system prompts.
- `.claude/settings.json` — permission policy.
- `CONTRIBUTING.md` — commit conventions and signing requirements (unchanged by
  this decision).
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) — extract-first
  component policy, which the agent architecture supports by lowering the cost
  of producing typed components.
