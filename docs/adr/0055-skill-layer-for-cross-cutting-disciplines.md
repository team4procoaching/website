# Skill Layer for Cross-Cutting Disciplines

Date: 2026-05-21 (revised 2026-05-22 after the Gate G1 mechanism finding)

Extends: [ADR-0035](0035-adopt-subagent-architecture.md)

## ADR Warrant Check

- [x] **A — Contract**: this ADR creates a project-wide contract for where a
      cross-cutting AI-working discipline lives and which surface is
      authoritative for it. After this ADR, an extracted discipline has exactly
      one authoritative source — its `SKILL.md` under
      `.claude/skills/<skill-name>/` — and every agent that needs it preloads it
      via a `skills:` frontmatter field rather than carrying a paraphrased copy.
      Future contributors and AI-assisted edits that touch a migrated discipline,
      or that propose a new cross-cutting discipline, must honour this
      single-source rule. The contract spans `CLAUDE.md`, all five Bash-capable
      `.claude/agents/*.md` files, and `docs/AGENTS.md` — more than one surface,
      by construction.
- [x] **B — Asymmetry**: this ADR sets a deliberate asymmetry the existing
      `docs/AGENTS.md` § Evolving the System rule ("if they disagree, the agent
      prompt wins") would otherwise tidy the wrong way. For a discipline
      extracted to a `SKILL.md`, the agent prompt is **not** the winner — the
      `SKILL.md` is. The general rule still holds for everything else. This
      asymmetry cannot live as a comment on a single file: it is a rule about the
      relationship between three surface classes (`SKILL.md`, agent prompt,
      `CLAUDE.md`), so it needs a decision record and a sharpened paragraph in
      `docs/AGENTS.md`. A future maintainer reading only the unsharpened "agent
      prompt wins" rule would mis-resolve a `SKILL.md`-vs-prompt conflict.
- [x] **C — External revisit**: this ADR names a concrete, documented revisit
      trigger — **a future Claude Code release that changes subagent
      skill-loading behaviour.** The decision rests on the currently documented
      Claude Code mechanism: the main session auto-triggers project skills from
      their `description`, subagents do not, and a subagent reaches a skill via
      the `skills:` frontmatter field (preload) or the `Skill` tool. If a future
      release changes any of that — for example, by giving subagents reliable
      `description`-driven auto-trigger — the mechanism choice in § The subagent
      consumption mechanism is revisited. The revisit condition is a defined
      external event (a Claude Code release note), not a hypothetical.

## Status

Accepted

## Context

ADR-0035 established a seven-subagent architecture: each phase of AI-assisted
work runs in a dedicated agent with its own system prompt under
`.claude/agents/`, its own tool whitelist, and its own isolated context. ADR-0035
§ Consequences → Negative named a known failure mode of that architecture
directly:

> Seven role definitions under `.claude/agents/` must stay consistent with the
> broader architecture as CLAUDE.md, CONVENTIONS.md, and relevant ADRs evolve.
> Drift between agent prompts and the rest of the documentation is a real
> failure mode.

`docs/AGENTS.md` § Permission Policy states the design choice that produces the
drift surface: _"Agent prompts carry the rules in parallel, so the intent is
documented even where the mechanism has limits."_ That parallel restatement is
deliberate Defense-in-Depth — but it means the same discipline knowledge lives
in two-to-six places at once.

Three cross-cutting disciplines are currently restated across multiple agent
prompts:

- **Bash command construction** — full prose in `CLAUDE.md § Bash Command
  Construction`; condensed partial restatements in five agent prompts
  (`architect.md`, `concept-reviewer.md`, `debt-auditor.md`, `implementer.md`,
  `reviewer.md`).
- **Ephemeral workspace** — full prose in `CLAUDE.md § Ephemeral Workspace`;
  condensed restatements in the same five agent prompts.
- **Local tooling probes** — full prose in `CLAUDE.md § Local Tooling Probes`;
  restated in `architect.md` and `implementer.md`.

The restatements are not verbatim walls. Each is a condensed paraphrase ending
in an explicit `see CLAUDE.md § ...` cross-reference. The drift surface is
therefore "partial paraphrase vs. canonical prose", not "N identical copies".
But it is still a real drift surface: when the canonical `CLAUDE.md` prose is
sharpened, the paraphrases in the agent prompts are not, and `pnpm check`, CI,
and the pre-push reviewer do not detect prose drift between an agent prompt and
`CLAUDE.md`.

Anthropic's Agent Skills mechanism offers a structural fix. A skill is a
`SKILL.md` file with YAML frontmatter. Migrating the three duplicated
disciplines into skills collapses each drift surface to a single authoritative
file.

### The Gate G1 mechanism finding (why this ADR was revised)

This ADR's first version (committed before Phase 3 completed) framed *skill
auto-trigger reliability inside a subagent context* as "the openly unresolved,
pilot-gated decision point". A pilot spike was planned to test, empirically,
whether a repo-local `SKILL.md` auto-triggers into a subagent's context from its
`description`.

Before the spike ran, the question it was meant to test was checked against the
official Claude Code documentation (`code.claude.com/docs`). The documentation
**resolves the question outright** — it is not an open empirical question:

1. **The main session auto-triggers project skills** from their `description`.
   This holds for the main session (the Orchestrator).
2. **Subagents do NOT auto-trigger skills.** The documentation states this
   explicitly: a subagent cannot auto-trigger skills the way the main session
   does. A subagent reaches a skill only via:
   - the **`Skill` tool**, which must be explicitly present in the subagent's
     `tools:` whitelist (observed: a subagent without it returns
     `Error: No such tool available: Skill`); or
   - the **`skills:` frontmatter field** on the subagent definition, which
     preloads the full skill body into the subagent's context at session start.
3. Custom subagent definitions load **only at session start** — no hot-reload
   (skills themselves hot-reload; agent definitions do not).
4. A skill in a directory added via `--add-dir` is discovered (skills are the
   documented exception to `--add-dir`'s file-access-only rule), but a
   worktree-local skill is not discovered from a main-session CWD that does not
   walk into the worktree.

The consequence: the pilot-gate framing collapses. There is no probabilistic
"does it auto-trigger" property for a subagent — auto-trigger is simply not a
subagent capability. The decision is no longer *pilot-gated*; it is *resolved by
documentation*. This ADR is revised to record the resolved mechanism plainly.

### Decision drivers

- **Structural safety over reviewer discipline.** Consistent with ADR-0035's
  first decision driver. One authoritative `SKILL.md` per discipline removes the
  surface where a paraphrase silently drifts from canon. The drift cannot happen
  if there is only one copy.
- **AI-first working mode.** Most future work on this project is AI-generated. A
  single-source discipline carrier is better suited to an AI fleet than the same
  discipline paraphrased across five agent prompts.
- **Bus Factor.** A `SKILL.md` is a committed, plain-Markdown file. A
  replacement maintainer reads it the same way they read an agent prompt or an
  ADR. The skill layer adds no tribal knowledge.
- **Bounded blast radius.** This is a knowledge-deduplication change, not a
  re-architecture. The seven-subagent role model, the four-phase flow, and the
  load-bearing always-on rules are untouched.

### Evaluated approaches

1. **Status quo — keep the disciplines always-on in `CLAUDE.md` plus paraphrases
   in agent prompts.** Rejected: this is the current state, and it carries the
   drift surface ADR-0035 already flagged as a real failure mode.

2. **Move the disciplines into `docs/CONVENTIONS.md` and have agents reference
   the section.** Rejected: `CONVENTIONS.md` is code-writing convention. The
   Bash and ephemeral-workspace disciplines are AI-tooling disciplines, not
   coding conventions; relocating them there miscategorises them, and it does
   not change the load model.

3. **Adopt a skill layer: one `SKILL.md` per extracted discipline.** Chosen.
   Each migrated discipline gets exactly one authoritative file. How the agents
   *consume* that file is the mechanism question the Gate G1 finding resolved —
   see § The subagent consumption mechanism.

## Decision

The project adopts a **skill layer** for a deliberately bounded set of
cross-cutting AI-working disciplines. The layer extends — does not supersede —
the ADR-0035 subagent architecture.

### What a skill is, and what it is not

A skill is a `SKILL.md` file at `.claude/skills/<skill-name>/SKILL.md`,
committed to git. It carries one reusable cross-cutting discipline. Its YAML
frontmatter has exactly two required fields — `name` and `description` — and no
others (no `tools`, no `model`). This two-field shape was verified against the
installed reference skills in the `superpowers` plugin (see § The authoring
reference); the mechanical authoring rules — including the verified rule that
the `name` value is the lowercase kebab-case skill name, equal to the skill's
directory name — live in `docs/CONVENTIONS.md` § SKILL Authoring.

A skill is **not** a role. It has no context window and no model assignment. It
cannot replace, add to, merge, or split any of the seven subagents defined in
ADR-0035. The role architecture is untouched by this decision. A skill carries
knowledge into a role's context; it is not a role.

### The three migrated disciplines

Three disciplines move from always-on prose to skills:

| Skill                       | Source section in `CLAUDE.md` | Consumed by                                                      |
| :-------------------------- | :---------------------------- | :--------------------------------------------------------------- |
| `bash-command-construction` | § Bash Command Construction   | architect, concept-reviewer, debt-auditor, implementer, reviewer |
| `ephemeral-workspace`       | § Ephemeral Workspace         | every agent that writes scratch files (same five)                |
| `local-tooling-probes`      | § Local Tooling Probes        | architect, implementer, reviewer                                 |

All three share the same justification for skillification: each is cross-file
duplicated — restated across multiple agent prompts — and removing that
duplication is the payoff. The skill set's inclusion rule is a single test:
cross-file duplication. A discipline that is not cross-file duplicated does not
earn a skill (see § Why the scope stops at three).

### The subagent consumption mechanism

This section replaces the first version's "Trigger reliability — the openly
unresolved decision point". The Gate G1 finding resolved that question; what
follows is the resolved mechanism.

**Two reader classes, two mechanisms.**

- **The Orchestrator (the main Claude Code session).** It auto-triggers a
  project skill from the skill's `description`, and it reads `CLAUDE.md`
  directly. After the migration, `CLAUDE.md`'s three discipline sections become
  short pointers; the Orchestrator either auto-triggers the skill or follows the
  pointer. For the Orchestrator the skill loads progressively — only when
  relevant.
- **Subagents** (`architect`, `concept-reviewer`, `debt-auditor`, `implementer`,
  `reviewer`). They do **not** auto-trigger skills. Each consuming subagent
  definition carries a **`skills:` frontmatter field** listing the skills it
  consumes; Claude Code preloads those skills' full bodies into the subagent's
  context **at session start**. The discipline content is therefore
  deterministically present in the subagent's context every run — no behavioural
  decision by the subagent is involved.

**Why `skills:` preload and not the `Skill` tool.** The two subagent mechanisms
are `skills:` preload and the `Skill` tool (whitelisted, then explicitly
invoked). The project standardises on `skills:` preload because the disciplines
are **load-bearing** and `skills:` preload is **deterministic**: the content is
injected, full stop. The `Skill` tool requires the subagent to *decide* to
invoke it at the right moment — a behavioural-reliability property of exactly
the kind the Gate G1 investigation removed from the auto-trigger path.
`bash-command-construction` exists to stop erosion of the permission deny-list's
security value through repeated prompts; `ephemeral-workspace` exists to stop
silent cross-session data loss. A discipline whose failure erodes a security
control or loses data is delivered deterministically, not on a behavioural bet.

**The cost of `skills:` preload, recorded honestly.** Preload injects the *full*
skill body at session start, always-on for that subagent. A preloaded skill
(~45-112 lines) is larger than the short paraphrase (~8-30 lines) it replaces,
so a consuming subagent's *runtime context* can grow even though its prompt
*file* shrinks. This is a real, bounded cost — single-digit-percent of a
subagent's total context, minimised by listing in each `skills:` field only the
disciplines that agent actually consumes. The dedup goal (one authoritative
source) is delivered in full; the progressive-load goal is delivered for the
Orchestrator only, not for subagents. The trade-off is determinism for a
load-bearing discipline at the price of a bounded context increase, and it is
accepted deliberately. The Phase-2 concept document for this task
(`02-concept.md` § Honest Benefit & Cost Accounting and § Self-Critique) carries
the full weighing.

**The deterministic-mechanism validation.** Because subagent definitions load
only at session start, the project confirms the mechanism with one concrete
check after the agent definitions gain their `skills:` fields and the session is
restarted: a consuming subagent is dispatched and asked to quote a known line
from a preloaded skill's body. If it can, the preload works; if it cannot, the
`skills:` configuration is misconfigured and is corrected. This is a
deterministic yes/no — `skills:` preload has no "sometimes triggers" middle —
not a probabilistic spike. The method is specified in `02-concept.md`
§ Test Approach and is run by the Orchestrator pre-push, before the branch
reaches origin.

### Why the scope stops at three

The migration is bounded. The following stay always-on in `CLAUDE.md` by
deliberate decision and are **not** skillified:

- **`evaluating-refactoring` (the § Evaluating Refactoring Proposals block).**
  Considered for the skill set and **dropped** in the Phase-2 owner review. A
  grep of `.claude/agents/*.md` for the section heading returns **zero hits**:
  the discipline has no agent-prompt restatement, so there is no cross-file
  duplication and no dedup payoff. It stays as an always-on `CLAUDE.md` block.
- **Git State Discipline.** Load-bearing. A documented duplicate-merge on `main`
  resulted from one violation of this rule. It stays always-on.
- **Working Process / the four-phase flow, Critical Rules, Quick Fix vs.
  Feature classification, Orchestrator routing.** Methodology backbone and
  Orchestrator-identity content. Either load-bearing or index content; low or
  zero dedup payoff.
- **Pre-Push Gate.** An Orchestrator-driven operational sequence run at a known
  workflow boundary. It is not duplicated across agent prompts, so there is no
  dedup payoff. Stays always-on.
- **Delegation Pattern: Pass Objective Context** and **Delegation Pattern:
  Evaluate Subagent Returns.** Both are consumed exclusively by the Orchestrator
  and are not restated in any agent prompt. The deduplication argument does not
  apply. Both stay always-on.

A skill earns its place when it is cross-file duplicated — restated across
multiple agent prompts — so that collapsing it to one authoritative file is a
real dedup win. Under the `skills:`-preload mechanism the inclusion rule is, if
anything, sharper: preload makes a skill's always-on cost visible per consuming
subagent, so admitting a non-duplicated discipline as a skill would cost context
for no dedup gain.

### The authoring reference

The project uses the `writing-skills` skill from the `superpowers` plugin
(`claude-plugins-official` marketplace, a `url`-source entry pointing at
`github.com/obra/superpowers.git`) as the **`SKILL.md` format reference**. The
plugin is installed and verified: `superpowers` version **5.1.0**, pinned commit
`f2cbfbefebbfef77321e4c9abc9e949826bea9d7`, under
`~/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/`. The
superpowers version is recorded for reproducibility, the same way the Local
Tooling Probes convention records the pinned version of any probed tool.

> **Scope note on the authoring reference.** The first version of this ADR
> additionally cast `superpowers:writing-skills` as the *pilot-validation
> method* — a test-driven RED→GREEN loop run to gate the migration. The Gate G1
> finding removed the pilot: there is no probabilistic property to validate, so
> there is no RED→GREEN loop. `writing-skills` therefore serves only as a
> `SKILL.md` *format* reference here, not as a validation gate. The plugin is
> **not a Phase-3 dependency** of this task.

**Conscious divergence from `writing-skills`' own "Don't create for" guidance.**
`writing-skills` § "When to Create a Skill" carries an explicit "Don't create
for" list that names — among others — _project-specific conventions_ ("put in
`CLAUDE.md`") and _mechanical constraints_ ("if it's enforceable with
regex/validation, automate it"). Two of this ADR's three skills sit, on a
literal reading, in that list: `bash-command-construction` is bound to _this_
project's `.claude/settings.json` permission matcher, and `ephemeral-workspace`
is _this_ project's `.claude/tmp/` convention. The divergence is **conscious**:
these become skills not because they are model "skills" by `writing-skills`' own
cross-project criteria, but because each is duplicated across multiple agent
prompts and that cross-file duplication is precisely the drift surface this
decision exists to close. The project adopts `writing-skills` for its `SKILL.md`
format shape; the single-source deduplication motive overrides its general
"don't create for project-specific conventions" advice, which is framed for
cross-project reuse and does not anticipate using the `SKILL.md` format as a
single-source container. This paragraph records the divergence so a later reader
of `writing-skills` does not have to reverse-engineer it.

The other `superpowers` skills (for example `systematic-debugging`,
`verification-before-completion`) are capability additions independent of this
deduplication goal and are explicitly **out of scope** for this decision.

### The authority model

`docs/AGENTS.md` § Evolving the System currently states: _"Agent prompts are the
live behavior; this document is the map. If they disagree, the agent prompt
wins."_ That is a two-surface rule. For a cross-cutting discipline extracted to
a `SKILL.md`, two further surfaces appear — the `SKILL.md` itself and the
`CLAUDE.md` pointer — and the unsharpened rule produces two winners: the prompt
and the skill both claim authority.

The rule is sharpened into a single **ordered precedence rule** that partitions
the surface rather than carving out an exception:

1. **For the _content_ of a cross-cutting discipline that has been extracted to
   a `SKILL.md`** (currently `bash-command-construction`, `ephemeral-workspace`,
   `local-tooling-probes`), the `SKILL.md` is the single authoritative source.
   The agent definition references the skill through its `skills:` frontmatter
   field — which preloads the `SKILL.md` body into the subagent's context at
   session start — and `CLAUDE.md` carries a pointer; never a copy. If a
   pointer's or a summary's phrasing drifts from the `SKILL.md` body, the
   `SKILL.md` wins and the other surface is out of date.
2. **For everything else** — an agent's role-specific operational prose, its
   tool whitelist, its per-phase workflow, and every discipline _not_ extracted
   to a skill — the agent prompt is the live behaviour and `docs/AGENTS.md` is
   the map; if they disagree, the agent prompt wins.

Rule 1 governs _discipline content_; Rule 2 governs _agent behaviour_. They do
not overlap, because a skill never carries role-specific operational prose —
that is precisely what keeps a skill cross-cutting. A maintainer who hits an
apparent conflict resolves it by asking one question: "is this the content of an
extracted discipline, or is it how a role operates?" — the first answer routes
to Rule 1, the second to Rule 2. `docs/AGENTS.md` § Evolving the System carries
the same ordered precedence rule, naming the `skills:` frontmatter mechanism in
its Rule 1 exactly as above; this ADR and that document state the same authority
model. The ordered rule's *partition* is mechanism-agnostic — it held under the
first version's auto-trigger framing and holds unchanged under `skills:` preload,
because "the `SKILL.md` is authoritative for discipline content" does not depend
on how the content reaches a context — but its Rule 1 names the concrete
mechanism (`skills:` preload), so this ADR's revision and the matching
`docs/AGENTS.md` Rule 1 edit are made together in the same commit (see
`02-concept.md` § Commit Plan).

### Discipline vs. role-specific operational content

Only the generic, cross-cutting *discipline* moves into a skill. Role-specific
operational prose stays in the agent prompt. `implementer.md` is the clearest
case: it interleaves the generic Bash discipline (the compound-command rule, the
tmp-path rule, the heredoc rule) with **implementer-specific operational
content** that has no `CLAUDE.md` equivalent — the full allow/deny/ask command
catalogue, the commitlint pre-check, the Write-tool-for-configs commit-message
workflow, and the `COMMIT_EDITMSG` handoff. The skill carries the discipline;
the operational catalogue and the commit workflow are role-specific and stay in
`implementer.md`. This is the same partition the authority rule above draws:
Rule 1 content moves into the skill; Rule 2 content stays in the prompt.

### What does NOT change

- The seven-subagent role architecture from ADR-0035. No role added, removed,
  merged, or split.
- The four-phase flow and the Orchestrator model.
- The permission policy's substance. `.claude/settings.json` already permits
  reads under `.claude/` broadly; the skills directory is read like any other
  committed `.claude/` content. A `Write` to `.claude/skills/**` falls to the
  `ask` list, matching the existing `Write(.claude/agents/**)` posture. Adding a
  `skills:` field to an agent definition is an edit to `.claude/agents/**`,
  already `ask`-gated. No settings change is made.
- The always-on `CLAUDE.md` sections listed under § Why the scope stops at
  three — including § Evaluating Refactoring Proposals.
- The Bus-Factor English-artefact convention. Every `SKILL.md` is English.
- The committed-infrastructure posture: `.claude/skills/` is committed to git,
  the same tier as `.claude/agents/` and `.claude/settings.json`.

## Consequences

### Positive

- **Each migrated discipline has one authoritative source.** The drift surface
  ADR-0035 flagged collapses for the three migrated disciplines: one file to
  edit, no paraphrases to keep in sync. This benefit is independent of the
  consumption mechanism — it follows from there being one source file.
- **Progressive load for the Orchestrator.** `CLAUDE.md`'s three discipline
  sections become short pointers; the Orchestrator auto-triggers the skill only
  when relevant, and its always-on `CLAUDE.md` shrinks by those three sections.
- **The agent prompts shrink.** Each consuming agent prompt loses its multi-line
  discipline paraphrase; the discipline arrives via a one-line `skills:`
  frontmatter field instead.
- **Deterministic delivery to subagents.** `skills:` preload puts the discipline
  content in the subagent's context unconditionally — no behavioural bet on
  whether the subagent triggers or invokes the skill.
- **The convention is reproducible.** The mechanical `SKILL.md` authoring rules
  live in `docs/CONVENTIONS.md` § SKILL Authoring; the next contributor or AI
  agent adding a skill follows a documented shape.

### Negative

- **`skills:` preload grows subagent runtime context.** The full skill body
  (~45-112 lines) is injected at subagent startup, larger than the paraphrase it
  replaces. The cost is bounded (single-digit-percent of a subagent's total
  context) and minimised by per-consumer `skills:` lists, but it is real: for a
  subagent, the change converts an always-on duplicated paraphrase into an
  always-on single-source preload — it dedups, it does not shrink that
  subagent's runtime context. This is a deliberate, recorded trade-off:
  determinism for a load-bearing discipline at the price of bounded context.
- **Progressive load is Orchestrator-only.** The requirements goal named
  "progressively-loaded skills"; under the documented mechanism, true
  progressive load is delivered only for the main session. For subagents the
  load is preload (always-on). The dedup half of the goal is delivered in full;
  the progressive-load half is delivered for one of the two reader classes.
- **A new surface class to maintain.** `.claude/skills/` is one more place a
  future maintainer must know about. Mitigation: it is committed,
  plain-Markdown, documented in `docs/AGENTS.md` § What Lives Where and the
  `docs/CONVENTIONS.md` authoring section, and indexed in `docs/ARCHITECTURE.md`.
- **`skills:` fields and skills must be kept in sync by hand.** An agent's
  `skills:` field names skills by name; if a skill is renamed or removed, every
  `skills:` field that names it must be updated. Mitigation: the set is small
  (three skills, five agents), the authority rule makes the `SKILL.md` the
  single source, and a misnamed `skills:` entry is caught by the
  deterministic-mechanism validation.

### Risk mitigation

- **`skills:` preload does not deliver the skill body as documented.** Mitigated
  by the deterministic-mechanism validation (`02-concept.md` § Test Approach):
  after the agent definitions gain `skills:` fields and the session restarts, a
  consuming subagent is asked to quote a known line from a preloaded skill. The
  expected cause of a failure here is a deterministic misconfiguration — a
  typo'd skill name or a skill on a path the session cannot discover — fixable
  by correcting the `skills:` field or the skills-discovery path; the Pre-Push
  Gate does not push until the validation passes. If the validation fails with
  the `skills:` configuration confirmed correct, the failure is instead a
  genuine mechanism-vs-documentation gap, and it routes to the Warrant Check
  trigger C revisit rather than to a configuration fix.
- **Future Claude Code release changes subagent skill-loading behaviour.** Named
  revisit trigger (Warrant Check trigger C). If a release gives subagents
  reliable `description`-driven auto-trigger, the mechanism choice can be
  revisited toward true progressive load for subagents; if a release changes
  `skills:`-preload semantics, the consumption model is re-checked.
- **Convention drift on the next skill.** Mitigated by the `docs/CONVENTIONS.md`
  authoring section and the `concept-reviewer` pass that any future
  agent-architecture change must go through (`docs/AGENTS.md` § Evolving the
  System).

## Success criteria

- The three `SKILL.md` files exist under `.claude/skills/<skill-name>/`,
  committed to git, each carrying exactly one discipline, each with a `name`
  (lowercase kebab-case, equal to the directory name) and a `description`
  frontmatter field.
- Each consuming agent definition (`architect`, `concept-reviewer`,
  `debt-auditor`, `implementer`, `reviewer`) carries a `skills:` frontmatter
  field listing the disciplines it consumes, and its body no longer paraphrases
  those disciplines.
- A `grep` for the three migrated discipline section headings across
  `.claude/agents/*.md` returns no paraphrased prose blocks for the migrated
  disciplines — the discipline content lives only in the `SKILL.md` files.
- The deterministic-mechanism validation has run: a consuming subagent,
  dispatched after a session restart, demonstrably has a preloaded skill's body
  in its context.
- `docs/AGENTS.md` § Evolving the System carries the sharpened,
  precedence-ordered authority rule whose Rule 1 names the `skills:` frontmatter
  mechanism; `docs/CONVENTIONS.md` carries the `SKILL.md` authoring section
  including the `skills:`-preload consumption model; `docs/ARCHITECTURE.md` ADR
  Quick Reference carries the ADR-0055 row.
- A replacement maintainer can read this ADR, `docs/AGENTS.md`, and
  `docs/CONVENTIONS.md` and understand where a cross-cutting discipline lives,
  which surface is authoritative, and how a subagent consumes it.

## References

- [ADR-0035](0035-adopt-subagent-architecture.md) — the subagent architecture
  this ADR extends. ADR-0035 § Consequences → Negative names the agent-prompt
  drift surface that this ADR's skill layer is designed to remove. The
  relationship is `Extends`: ADR-0035's role architecture is intact and
  unchanged; this ADR adds a knowledge-deduplication layer beneath it. ADR-0035's
  References section carries a back-link to this ADR.
- [ADR-0050](0050-script-entry-point-naming-convention.md) — the precedent for
  splitting a convention across an ADR (decision) and `docs/CONVENTIONS.md`
  (mechanical how-to). This ADR follows the same split: ADR-0055 carries the
  decision, the authority model, and the consumption mechanism;
  `docs/CONVENTIONS.md` § SKILL Authoring carries the frontmatter and naming
  rules.
- `docs/AGENTS.md` § Evolving the System — the authority rule sharpened by this
  decision; it carries the same precedence-ordered rule, with Rule 1 naming the
  `skills:` frontmatter mechanism as in § The authority model above.
- `docs/CONVENTIONS.md` § SKILL Authoring — the mechanical authoring rules and
  the `skills:`-preload consumption model this decision establishes.
- `CLAUDE.md` — the three migrated discipline sections become skill pointers in
  the introducing PR. § Evaluating Refactoring Proposals stays always-on,
  untouched.
- `.claude/skills/<skill-name>/SKILL.md` — the new skill files.
- `.claude/agents/*.md` — the five Bash-capable agent definitions gain a
  `skills:` frontmatter field; their discipline paraphrases are removed.
- The `superpowers:writing-skills` skill — the `writing-skills` skill from the
  `superpowers` plugin (`claude-plugins-official` marketplace, `url`-source
  `github.com/obra/superpowers.git`), installed and verified at version 5.1.0,
  commit `f2cbfbefebbfef77321e4c9abc9e949826bea9d7` — the adopted `SKILL.md`
  format reference (the pilot-validation role from this ADR's first version is
  removed; see § The authoring reference).
