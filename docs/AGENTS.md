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
         Orchestrator (drops the worktree on a successful platform — see § Worktree Lifecycle)
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

_Canonical source for the Quick-Fix criteria and flow:
[`CLAUDE.md` § Quick Fix vs. Feature](../CLAUDE.md#quick-fix-vs-feature). On
disagreement, the `CLAUDE.md` side wins._

### Documentation Artefacts

Every feature task produces documentation under `.claude/work/<task-id>/` inside
the feature worktree (gitignored, never committed to main):

| File                   | Phase | Produced By            |
| :--------------------- | :---- | :--------------------- |
| `01-requirements.md`   | 1     | `requirements-analyst` |
| `02-concept.md`        | 2     | `architect`            |
| `02-concept-review.md` | 2     | `concept-reviewer`     |
| `04-review-r<n>.md`    | 4     | `reviewer`             |

Task IDs follow `YYYY-MM-DD-<kebab-slug>`. The Orchestrator attempts to remove
the feature worktree post-merge; see § Worktree Lifecycle for the disposition
path and the Windows-cleanup-unreliable note. Persistent artefacts (ADRs, debt
register entries, code) live on main; task docs do not.

---

## Worktree Lifecycle

Every non-trivial task runs in its own Git worktree under
`.claude/worktrees/<task-slug>/`. The reason is parallel sessions: the project
owner routinely runs several Claude Code instances against the same repository
at once (different tasks, different branches), and a single working tree cannot
serve more than one branch at a time. Worktrees give each session an isolated
checkout that does not collide with the others, and they keep `main` untouched
during in-flight work — branch switches in the main checkout would sabotage any
other session that is editing files there.

This section is the canonical source for the create-register-work-dispose
mechanics. Other documents (`CONTRIBUTING.md`, `docs/DEVELOPMENT.md`,
`CLAUDE.md`, the skill files under `.claude/skills/`, the debt register) point
at this section rather than restating the mechanics.

### Creating a Worktree

A new worktree is created with `git worktree add`, branched off the current
`origin/main`:

```bash
git worktree add -b <branch-name> .claude/worktrees/<task-slug> origin/main
```

The path convention is `.claude/worktrees/<task-slug>/`, where `<task-slug>`
matches the kebab-case slug used in the task ID. The directory is gitignored on
main; the worktree lives outside the tracked tree.

**Upstream gotcha on the first push.**
`git worktree add -b <branch> ... origin/main` sets the new branch's upstream to
`origin/main`, not to a remote branch of the same name (which does not exist
yet). The first push therefore needs `-u` to create the remote branch and
re-point the upstream:

```bash
git push -u origin HEAD
```

Plain `git push` fails on the first attempt because the configured upstream is
`origin/main` and a direct push to `main` is blocked.
`git push origin HEAD:main` would technically push but targets `main` directly —
that is the direct-push-to-main failure mode, not the intended flow. Always use
`-u origin HEAD` on the first push.

### Registering with the Claude Harness

A worktree path the project owner wants Claude Code to operate against has to be
registered with the harness. At session startup:

```bash
claude --add-dir <absolute-worktree-path>
```

Inside a running session:

```
/add-dir <absolute-worktree-path>
```

Registration teaches the permission matcher about the path. The matcher's allow
rules use a `**/.claude/...` glob shape that resolves correctly across
registered directories — see
[`docs/reference/claude-permissions.md` § `**/` glob covers cross-CWD path forms](reference/claude-permissions.md#-glob-covers-cross-cwd-path-forms)
for the matcher mechanics. Unregistered paths trigger permission prompts for
otherwise-allowed reads and writes because the matcher cannot resolve them
against the configured allow patterns.

### Working Inside a Worktree

Most session work runs from the main project root with the worktree registered
via `--add-dir`, not from inside the worktree directory. Commands that need to
target the worktree use the tool's own path-aware flag rather than
`cd <worktree> && ...`:

```bash
git -C <worktree-path> <subcommand>
pnpm --dir <worktree-path> <script>
```

These shapes match the permission allow list on their own. The
`cd <path> && <command>` construction does not — it is split per segment by the
matcher and triggers a prompt for the `cd` segment. See the
[`bash-command-construction` skill](../.claude/skills/bash-command-construction/SKILL.md)
for the full discipline.

**COMMIT_EDITMSG path gotcha.** A worktree's `.git` is a pointer file
(`gitdir: ...`), not a directory. `git commit -F .git/COMMIT_EDITMSG` does not
resolve the indirection and fails. The correct form resolves the worktree's
gitdir first:

```bash
git -C <worktree-path> rev-parse --git-path COMMIT_EDITMSG
```

The path that command prints is the file the commit message belongs in. See
[`CONTRIBUTING.md` § AI-Assisted Contributions](../CONTRIBUTING.md#ai-assisted-contributions)
for the full implementer commit-handoff sequence.

**`.env.local` is per-worktree.** The file lives outside the tracked tree, so a
new worktree starts without it. Tooling that reads secrets from `.env.local`
(currently the Sonar live-tooling scripts) fails until the file is copied across
from the main checkout. The fix is a one-time `cp` from the main project root
into the new worktree.

**Post-rebase `node_modules` staleness.** Rebasing a worktree onto a `main` that
introduced a new devDependency leaves `node_modules` out of date. The symptom is
`pnpm check` failing with `Cannot find module ...` on files outside the
changeset. The fix is `pnpm --dir <worktree> install` after the rebase, before
debugging anything that looks like a typecheck failure.

**Foreground dispatch for worktree-writing subagents.** Subagents that write
inside the worktree (`.claude/work/`, `docs/adr/`, `src/`) or run ask-gated
commands have to launch in the foreground. Background dispatches cannot answer
the permission prompts the worktree path-matching may surface, and the agent
stalls without visible failure.

### Disposing of a Worktree

Two disposition paths, depending on the task outcome:

**Merged path.** Once the PR squash-merges on `main`, the local worktree is no
longer needed:

```bash
git worktree remove <worktree-path>
git branch -D <branch-name>          # optional, once the squash-merged work is on main
```

**Abandoned path.** When the task is dropped without a PR, the same
`git worktree remove` call disposes of the directory and the task docs vanish
with it (`.claude/work/<task-id>/` is worktree-local). Any work worth keeping
should be copied into a debt entry or a follow-up ADR before the disposition
attempt — once the worktree is gone, the task docs are too.

**Windows-cleanup-unreliable note.** On the project owner's Windows setup,
`git worktree remove` fails for a measurable fraction of merged worktrees
(typically a file-lock or permission-denied error from the underlying
filesystem). The de-facto policy is to accept stale worktrees as durable — they
are gitignored and inert, and the next `git fetch --prune` plus a manual sweep
clears the registry whenever the owner gets to it. Worktree cleanup is not part
of routine post-merge hygiene on this platform.

`--force` is the escape hatch when the worktree refuses to remove despite being
safe to drop:

```bash
git worktree remove --force <worktree-path>
```

It bypasses the safety check that the worktree has no uncommitted changes; use
it only after confirming the worktree's state is genuinely disposable.

**Anchor stability reminder.** Cross-document links target the
`#worktree-lifecycle` anchor of this section and the four sub-anchors
(`#creating-a-worktree`, `#registering-with-the-claude-harness`,
`#working-inside-a-worktree`, `#disposing-of-a-worktree`). Renaming any of these
headings requires a repo-wide grep across the consumer set (`CONTRIBUTING.md`,
`docs/DEVELOPMENT.md`, `CLAUDE.md`,
`.claude/skills/ephemeral-workspace/SKILL.md`, `docs/debt/REGISTER.md`,
`docs/debt/REGISTER.template.md`) and a co-ordinated update of every consumer
before the rename lands.

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
  on main and dropped together with the worktree when its disposition succeeds
  (see § Worktree Lifecycle). To pick up an in-flight task, switch to its
  feature worktree; the task docs come with it.

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
