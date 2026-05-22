# AI-Assisted Development — Agent Architecture

Overview of how AI-assisted work is organized in this project. Read this first
if you are taking over maintenance and need to understand how code,
documentation, and reviews are produced with Claude Code.

This document explains the structure. The actual behavior lives in the
individual agent definitions under `.claude/agents/` and in the permission
policy at `.claude/settings.json`. Those are the authoritative artefacts; this
document is the map.

---

## Why Agents

Early in the project, AI-assisted work happened in a single Claude Code session
that did everything — requirements, design, implementation, review. That
produced three recurring problems:

1. **Instruction drift.** The assistant would praise an architectural direction,
   then silently implement something else. A single context that carries both
   the plan and the implementation tends to smooth over its own contradictions.
2. **Scope creep.** The assistant would notice "related" issues during
   implementation and fix them unasked, turning a focused change into a large
   diff.
3. **Parallel-session confusion.** Two sessions working in the same repository
   would step on each other — one would change a branch while another was
   editing on it.

The structural response is role separation. Each phase of the work runs in a
dedicated agent with its own system prompt, its own tool whitelist, and its own
isolated context. An agent that implements cannot rewrite the plan it was
handed. An agent that reviews cannot edit the code it reviews. An agent that
writes requirements cannot introduce architectural decisions.

This document describes that system.

---

## The Orchestrator Model

You talk to exactly one entity: the main Claude Code session. This session reads
`CLAUDE.md` as its system prompt and acts as the **Orchestrator**. It is not a
separate agent file — it is the default session, configured by `CLAUDE.md`.

The Orchestrator:

- Talks to the project owner (you).
- Delegates work to specialized subagents via the `Task` tool.
- Consolidates subagent output and presents decisions to the owner.
- Maintains task state across phases (task IDs, ADR numbering, the debt
  register, worktree lifecycle for task docs).
- Prepares commits for signing — but does not sign or push.

It does **not** write production code, produce concept documents, review
implementations, or generate architectural decisions. All of that is delegated.

### How Delegation Works

When the Orchestrator delegates, it uses the `Task` tool to spawn a subagent.
The subagent:

- Starts with a **fresh, empty context**. It does not see the conversation
  between the Orchestrator and the owner.
- Loads its own system prompt from `.claude/agents/<name>.md`.
- Receives a short task prompt from the Orchestrator stating what to do and
  which input artefacts to read.
- Works to completion, producing Markdown artefacts as its primary output.
  Persistent artefacts (ADRs, debt entries) land on main; task-scoped artefacts
  (requirements, concept, review) live in the feature worktree only.
- Returns a summary to the Orchestrator, not the full transcript.

The fresh context is deliberate. It eliminates the possibility that an
implementer silently remembers what the owner discussed with the architect —
because the implementer was not there. Handover happens through written
documents, not through conversation.

---

## The Seven Subagents

| Agent                  | Phase    | Role                                                       | Model  |
| :--------------------- | :------- | :--------------------------------------------------------- | :----- |
| `requirements-analyst` | Phase 1  | Produces requirements documents, asks clarifying questions | opus   |
| `architect`            | Phase 2  | Produces concept documents and ADRs with commit plans      | opus   |
| `concept-reviewer`     | Phase 2  | Adversarial review of concept documents before Phase 3     | opus   |
| `implementer`          | Phase 3  | Executes concept documents commit-by-commit                | sonnet |
| `reviewer`             | Phase 4  | Reviews branches or file sets against standards            | opus   |
| `debt-auditor`         | —        | Systematic debt hunt within a defined category             | sonnet |
| `copy-editor`          | post-hoc | Opt-in text review for ADRs, concepts, public content      | sonnet |

### Phase-Aligned Agents

Four of the seven agents map directly to the four phases in `CLAUDE.md`:

**Phase 1 — `requirements-analyst`.** Takes a task description and produces
`.claude/work/<task-id>/01-requirements.md`. The analyst reads
`docs/ARCHITECTURE.md`, `docs/FEATURE_TEMPLATE.md`, and
`docs/REQUIREMENTS_GUIDE.md`, fills the Readiness Checklist, and surfaces open
questions to the owner. The analyst is read-only on code; it can only write
under `.claude/work/`.

**Phase 2 — `architect` + `concept-reviewer`.** The architect reads the
requirements document and produces `.claude/work/<task-id>/02-concept.md`, which
includes at least two structurally different solution approaches, the chosen
approach with justification, a grep-verified list of affected consumers, a
commit plan, and a self-critique. If the work requires a new architectural
decision, the architect writes the ADR directly under `docs/adr/`.

When the proposed change touches one or more components in `src/components/`,
the architect cites each touched component's `@useWhen` and `@dontUseWhen`
annotations in the concept doc's consumer grep, and includes a draft JSDoc block
for any new component the concept introduces. See
[ADR-0054](adr/0054-component-reuse-annotations.md).

The concept-reviewer then runs an adversarial pass against the concept,
producing `.claude/work/<task-id>/02-concept-review.md`. It checks whether the
solution classes are genuinely distinct, whether the self-critique is real
rather than rhetorical, and whether hidden assumptions have been surfaced. Any
Blocker finding prevents Phase 3.

This two-step structure exists because a self-authored plan is weak evidence of
its own quality. The reviewer operates with its own fresh context and its own
adversarial system prompt.

**Phase 3 — `implementer`.** Reads the approved concept document and executes
the commit plan mechanically, one commit at a time. The implementer can write
code and stage files for commit, but cannot commit (the owner signs) and cannot
push. After each commit is staged, the implementer pauses for the owner to sign
and proceed.

The implementer runs on Sonnet, not Opus. The task is mechanical execution of a
plan, not planning. Using a smaller model here is both economical and
behaviorally correct — it reduces the temptation to improvise beyond the
concept.

Before creating or modifying a component file in `src/components/`, the
implementer reads its current JSDoc reuse block and the blocks of components
named in its `@alternativeTo` / `@relatedTo` tags. Annotation updates land in
the same commit as the semantic change; a modified component without an updated
annotation is a self-rejected output. See
[ADR-0054](adr/0054-component-reuse-annotations.md).

**Phase 4 — `reviewer`.** Reads the implemented branch and produces
`.claude/work/<task-id>/04-review-r<n>.md`. Findings are classified as Blocker,
Major, Minor, or Nit. The reviewer is read-only on code. The reviewer runs
before push, so any Blocker or Major finding is caught before the branch hits
origin — see [`CLAUDE.md` § Pre-Push Gate](../CLAUDE.md#pre-push-gate) for the
operational sequence.

### Non-Phase Agents

**`debt-auditor`.** Systematic hunt for a specific category of technical debt
across the repository (architecture conformance, TypeScript quality, component
consistency, documentation drift, tests/CI coverage). The Orchestrator triggers
it with a category, the auditor produces findings in
`docs/debt/audit-<date>-<scope>.md`. Hand-written follow-up bundles outside a
formal audit live under `docs/debt/notes-<date>-<scope>.md`. The debt register
at `docs/debt/REGISTER.md` consolidates findings across audits. See
[ADR-0048](adr/0048-debt-report-filename-convention.md).

**`copy-editor`.** Text-only review for documents that will outlive the
immediate task — ADRs, long concept documents, requirements documents,
public-facing content, top-level documentation. The copy-editor works on
language (precision, consistency, register, readability) and never on content.
Invoked opt-in by the Orchestrator, only after concept-review is clean. Not part
of the Phase-2 pipeline.

When the copy-editor runs on a stream that touches one or more components in
`src/components/`, it validates the JSDoc reuse-block schema (mandatory fields
present, single-sentence form, well-formed cross-references — `@alternativeTo`
resolving to a component, `@relatedTo` resolving under the four target surfaces
in CONVENTIONS § Component Reuse Annotations). See
[ADR-0054](adr/0054-component-reuse-annotations.md).

### Trigger Disambiguation

Two pairs of agents have overlapping surface area; the disambiguation lives in
the trigger:

- **`reviewer` (audit mode) vs. `debt-auditor`.** If the input is a concrete
  list of files to check against standards, that is the reviewer in audit mode.
  If the input is a category of problem to find across the repo, that is the
  debt-auditor. Concrete list → reviewer; category → auditor.
- **`architect` writes ADRs vs. `copy-editor` edits ADRs.** The architect
  authors the substance of an ADR during Phase 2. The copy-editor, if triggered,
  edits the language of a finished ADR afterwards. The copy-editor never changes
  technical content.

---

## How a Task Flows Through the System

A full feature task follows all four phases:

```
Owner → Orchestrator → requirements-analyst
                          ↓
                       .claude/work/<task-id>/01-requirements.md
                          ↓
         Orchestrator ← Owner (answers open questions)
                          ↓
         Orchestrator → architect
                          ↓
                       .claude/work/<task-id>/02-concept.md
                       docs/adr/NNNN-<slug>.md (if needed)
                          ↓
         Orchestrator → concept-reviewer
                          ↓
                       .claude/work/<task-id>/02-concept-review.md
                          ↓
                      [if Blockers: back to architect]
                          ↓
         Orchestrator ← Owner (approval)
                          ↓
         Orchestrator → implementer
                          ↓
                       staged commits + .git/COMMIT_EDITMSG
                          ↓
         Owner (signs each commit)
                          ↓
         Orchestrator → reviewer
                          ↓
                       .claude/work/<task-id>/04-review-r1.md
                          ↓
                      [if Blockers/Majors: back to implementer]
                          ↓
         Owner (git push -u origin HEAD)
                          ↓
         Owner (merges PR)
                          ↓
         Orchestrator (removes the feature worktree; task docs vanish with it)
```

### Quick Fixes Skip Phases 1 and 2

A **Quick Fix** — one clearly defined change at one location, no wording or
placement decisions, no new abstractions, describable in 1–3 sentences — goes
directly from Orchestrator to implementer. The Orchestrator passes the fix
description as the concept. No separate requirements or concept document is
produced. Phase 4 applies the documentation-surface discriminator: Quick Fixes
that touch documentation, JSDoc, ADR references, or anchor strings trigger the
reviewer as a pre-push gate; pure code or styling Quick Fixes skip the reviewer.
The Orchestrator classifies each Quick Fix at dispatch time.

This is the escape hatch for trivial changes. It is not a performance
optimization; it is a recognition that the full pipeline is overkill for typo
fixes and obvious single-file corrections.

### Documentation Artefacts

Every feature task produces documentation under `.claude/work/<task-id>/` inside
the feature worktree (gitignored, never committed to main):

| File                   | Phase | Produced By            |
| :--------------------- | :---- | :--------------------- |
| `01-requirements.md`   | 1     | `requirements-analyst` |
| `02-concept.md`        | 2     | `architect`            |
| `02-concept-review.md` | 2     | `concept-reviewer`     |
| `04-review-r<n>.md`    | 4     | `reviewer`             |

Task IDs follow `YYYY-MM-DD-<kebab-slug>`. The Orchestrator removes the feature
worktree post-merge, and the task docs vanish with it. Persistent artefacts
(ADRs, debt register entries, code) live on main; task docs do not.

---

## Permission Policy

`.claude/settings.json` defines the bash permission policy. It uses a
**positive-list** approach: only explicitly allowed commands run without
prompting. Everything else falls through to `ask` (owner confirms) or `deny`
(hard block).

The allow list covers the pnpm scripts defined in `package.json`, read-only git
operations, file exploration commands, and direct tool invocations (biome,
vitest, astro, prettier, tsc, jq). State-changing git commands, shell wrappers
(`bash -c`, `eval`), foreign runtimes (perl, python, deno, bun, make), binary
readers (xxd, od, dd, hexdump), and destructive operations are denied. Reads and
redirect-writes against `.env`, `secrets/`, `.git/config`, and `package.json`
are denied via source-agnostic patterns.

Operations that can execute arbitrary code (`pnpm exec`, `npx`, `node -e`,
`git config`, `git add`) are on `ask` — they are legitimate but require owner
confirmation.

This policy is defense-in-depth, not a sandbox. It closes the known paths.
Creative workarounds (executable scripts, exotic aliases) cannot be fully
prevented through a permission file alone. Agent prompts carry the rules in
parallel, so the intent is documented even where the mechanism has limits. For
the three cross-cutting disciplines extracted to skills (see § Evolving the
System and ADR-0055), the rule lives once in its `SKILL.md` and the agent prompt
carries a `skills:` frontmatter field that preloads it, rather than a parallel
copy; the parallel-copy statement holds for every other discipline.

---

## Commit Workflow

The project owner signs every commit. The implementer prepares:

1. Stages the files for one commit with `git add`.
2. Writes the commit message to `.git/COMMIT_EDITMSG` (file-based, not via
   heredoc — Windows/GitBash adds leading whitespace that commitlint rejects).
3. Runs `pnpm test` and `pnpm build` to verify the state.
4. Reports to the Orchestrator that the commit is ready.

The Orchestrator surfaces this to the owner, who runs:

```bash
git commit -S -F .git/COMMIT_EDITMSG
```

After signing, the owner confirms and the implementer proceeds to the next
commit.

Commit messages follow the conventions in `CONTRIBUTING.md`: Conventional
Commits with mandatory scope, English, max 72-char subject. The implementer does
not rewrite these rules in its prompt — `CONTRIBUTING.md` is the single source
of truth.

---

## What Lives Where

**`CLAUDE.md` (repo root).** System prompt for the Orchestrator. Also contains
Phase 3 implementation guidance (critical rules, coding conventions quick
reference) because the implementer reads `CLAUDE.md` as well.

**`docs/REQUIREMENTS_GUIDE.md`.** Detailed working instructions for the
`requirements-analyst`. The analyst's own system prompt is short; the process
details live here so they can be updated without redeploying the agent.

**`docs/AGENTS.md`** (this document). Overview of the architecture. Read first
when taking over maintenance or onboarding a replacement.

**`docs/FEATURE_TEMPLATE.md`.** The Readiness Checklist used by the
requirements-analyst to structure its output.

**`docs/DECISION_GUIDES.md`.** Reusable decision frameworks (Modal vs. Page,
When to Use MDX) consulted during Phase 2.

**`.claude/agents/*.md`.** The seven subagent system prompts, each with YAML
frontmatter (name, description, tools, model, and — for the Bash-capable agents
— skills) followed by the role-specific instructions. These are the
authoritative definitions of agent behavior.

**`.claude/skills/<skill-name>/SKILL.md`.** Committed-infrastructure carriers of
cross-cutting AI-working disciplines, one discipline per skill. The main session
auto-triggers a skill from its `description` metadata; a subagent consumes a
skill via a `skills:` frontmatter field on its definition, which preloads the
skill body into that subagent's context at session start (subagents do not
auto-trigger). For the content of an extracted discipline the `SKILL.md` is
authoritative — see § Evolving the System. Authored to the convention in
`docs/CONVENTIONS.md` § SKILL Authoring; the decision is recorded in ADR-0055.

**`.claude/settings.json`.** The permission policy. Changes here affect all
sessions in the repository.

**`docs/task-templates/`.** Templates for the Markdown artefacts agents produce
during a task: `01-requirements.template.md`, `02-concept.template.md`,
`02-concept-review.template.md`, `04-review.template.md`. The `README.md` in the
folder explains the numbering (no `03-` template because Phase 3 produces
commits, not a Markdown artefact) and which templates live elsewhere (ADR
template in `docs/adr/`, debt register template in `docs/debt/`).

**`docs/debt/REGISTER.template.md`.** Template for the debt register. The live
register is at `docs/debt/REGISTER.md` once the first audit produces findings.
Per-report files live alongside as `audit-<date>-<scope>.md` (systematic
findings) or `notes-<date>-<scope>.md` (hand-curated bundles); see
[ADR-0048](adr/0048-debt-report-filename-convention.md).

**`docs/adr/_archive/`.** Archived ADRs that are no longer part of the active
reference set — superseded, deprecated, or consolidated into a living document.
See [`docs/ARCHITECTURE.md` → ADR Lifecycle](ARCHITECTURE.md#adr-lifecycle) for
the criteria and process.

---

## Working with the System as the Project Owner

You have one conversation — with the Orchestrator. Within that conversation, you
make decisions at phase boundaries:

- After Phase 1: answer the analyst's open questions.
- After Phase 2 architect: accept or refine the concept.
- After Phase 2 concept-review: decide whether Major findings go back for rework
  or are accepted.
- Phase 2 approval: confirm Phase 3 may begin.
- Per commit in Phase 3: sign or request changes.
- After Phase 4: merge or return to implementer.

Between those decision points, agents do their work. You see summaries, not the
full transcripts. You can always interrupt, ask for clarification, or request an
agent be re-invoked with different instructions. Agents are not addressed
directly — you ask the Orchestrator, the Orchestrator delegates.

For Quick Fixes, the full pipeline is skipped. State the fix explicitly and mark
it as a Quick Fix; the Orchestrator goes straight to the implementer.

---

## Replacing the Maintainer

If you are reading this because you have taken over from the previous
maintainer, here is what you need to know to keep the system running.

The artefact set you inherit is bimodal:

- **Persistent artefacts on main.** ADRs (`docs/adr/`), the debt register
  (`docs/debt/`), top-level docs (`CLAUDE.md`, `docs/AGENTS.md`,
  `docs/CONVENTIONS.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`, …), agent
  prompts (`.claude/agents/`), the permission policy (`.claude/settings.json`),
  and task templates (`docs/task-templates/`). These outlive any single task.
- **Task-scoped artefacts in feature worktrees.** Requirements, concept,
  concept-review, and review documents for in-flight tasks live under
  `.claude/work/<task-id>/` inside their feature worktree. They are gitignored
  on main and removed when the worktree is dropped post-merge. To pick up an
  in-flight task, switch to its feature worktree; the task docs come with it.

Both modes are read-only Markdown. There is no tribal knowledge held outside
these files.

1. **The architecture is the agents, not the maintainer.** Every process rule
   lives in `CLAUDE.md`, `.claude/agents/*.md`, `.claude/settings.json`, or
   `docs/REQUIREMENTS_GUIDE.md` — all on main. Per-task reasoning lives in the
   feature worktree alongside the code being changed.
2. **Start with a small task.** Pick a Quick Fix from the open work, run it
   through the Orchestrator, observe how the implementer behaves. One real task
   teaches more than reading the agent prompts in isolation.
3. **Permission prompts are expected.** The `ask` list is long by design. If a
   legitimate command triggers a permission prompt, approve it and consider
   whether the pattern belongs in the allow list permanently.
4. **Phase 1 and Phase 2 require extended thinking.** The Orchestrator is
   supposed to include `think hard` in the task prompt when invoking those
   agents. If you see rushed planning output, check that the Orchestrator did
   so.
5. **Commit signing is non-negotiable.** The `.claude/settings.json` denies
   `git commit` at the tool level. The implementer prepares commits, you sign.
6. **Trust the artefacts, not the chat.** When something needs to carry across
   phases or sessions, it must be in a Markdown file — committed to main for
   persistent artefacts (ADRs, debt entries), or under `.claude/work/<task-id>/`
   in the feature worktree for task-scoped artefacts that live only as long as
   the task does. Chat content is ephemeral.

If the system stops working as documented, the first question is not "has
something broken" but "has something drifted from the documented architecture."
Compare the live `.claude/` contents with what this document describes. Drift is
the most common failure mode.

---

## Evolving the System

Changes to the agent architecture itself follow the same process as any other
architectural change: an ADR under `docs/adr/`, reviewed before adoption. The
foundational decision is recorded in
[ADR-0035](adr/0035-adopt-subagent-architecture.md); future changes extend,
supersede, or narrow that decision the same way any other ADR evolves. The
agents can review themselves in this sense — use the `concept-reviewer` to
evaluate proposed changes to `.claude/agents/*.md` before committing them.

Specifically, do not:

- Add new agents without justifying the role separation.
- Broaden the permission policy without considering the failure mode being
  enabled.
- Move rules between agent prompts, this document, `CLAUDE.md`, and
  `.claude/skills/*/SKILL.md` without being clear about which is authoritative.
  Authority is resolved by an ordered rule, not case by case:
  1. **For the _content_ of a cross-cutting discipline that has been extracted
     to a `SKILL.md`** (currently `bash-command-construction`,
     `ephemeral-workspace`, `local-tooling-probes`; see ADR-0055), the
     `SKILL.md` is the single authoritative source. The agent definition
     references the skill through its `skills:` frontmatter field — which
     preloads the `SKILL.md` body into the subagent's context at session start —
     and `CLAUDE.md` carries a pointer; never a copy. If a pointer's or a
     summary's phrasing drifts from the `SKILL.md` body, the `SKILL.md` wins and
     the other surface is out of date.
  2. **For everything else** — an agent's role-specific operational prose, its
     tool whitelist, its per-phase workflow, and every discipline _not_
     extracted to a skill — the agent prompt is the live behaviour and this
     document is the map; if they disagree, the agent prompt wins and this
     document is out of date.

  Rule 1 governs _discipline content_; Rule 2 governs _agent behaviour_. They do
  not overlap: a skill never carries role-specific operational prose (that is
  what keeps it cross-cutting), so a conflict is always resolvable by asking "is
  this the content of an extracted discipline, or is it how a role operates?" —
  the first answer routes to Rule 1, the second to Rule 2.

Do:

- Narrow the allow list in `.claude/settings.json` if a command turns out not to
  be needed.
- Sharpen agent prompts based on observed failures. Each iteration should either
  add a structural safeguard or remove a rule that proved unnecessary.
- Record significant changes to the architecture as ADRs. Future maintainers
  should not have to reverse-engineer why the system is the way it is.
