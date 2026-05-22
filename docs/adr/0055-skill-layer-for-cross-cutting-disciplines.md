# Skill Layer for Cross-Cutting Disciplines

Date: 2026-05-21

Extends: [ADR-0035](0035-adopt-subagent-architecture.md)

## ADR Warrant Check

- [x] **A — Contract**: this ADR creates a project-wide contract for where a
      cross-cutting AI-working discipline lives and which surface is
      authoritative for it. After this ADR, an extracted discipline has exactly
      one authoritative source — its `SKILL.md` under
      `.claude/skills/<skill-name>/` — and every agent prompt that needs it
      carries a reference, not a copy. Future contributors and AI-assisted edits
      that touch a migrated discipline, or that propose a new cross-cutting
      discipline, must honour this single-source rule rather than restating the
      prose. The contract spans `CLAUDE.md`, all seven `.claude/agents/*.md`
      files, and `docs/AGENTS.md` — more than one surface, by construction.
- [x] **B — Asymmetry**: this ADR sets a deliberate asymmetry the existing
      `docs/AGENTS.md` § Evolving the System rule ("if they disagree, the agent
      prompt wins") would otherwise tidy the wrong way. For a discipline
      extracted to a `SKILL.md`, the agent prompt is **not** the winner — the
      `SKILL.md` is. The general rule still holds for everything else. This
      asymmetry cannot live as JSDoc on a single file: it is a rule about the
      relationship between three surface classes (`SKILL.md`, agent prompt,
      `CLAUDE.md`), so it needs a decision record and a sharpened paragraph in
      `docs/AGENTS.md`. A future maintainer reading only the unsharpened
      "agent prompt wins" rule would mis-resolve a `SKILL.md`-vs-prompt conflict.
- [x] **C — External revisit**: this ADR names a concrete, documented revisit
      trigger — the outcome of the `bash-command-construction` pilot spike. If
      the pilot demonstrates that skills do **not** auto-trigger reliably inside
      a narrow-whitelist subagent context in the project's Claude Code version,
      the decision is revisited: either the remaining two migrations are
      cancelled and the disciplines stay always-on, or the skill layer ships
      with a mandatory per-agent hard-invocation pointer as the trigger
      mechanism. The revisit condition is a defined empirical event, not a
      hypothetical. A second, longer-horizon revisit trigger is named in
      § Consequences → Risk mitigation: a future Claude Code release that
      changes subagent skill-loading behaviour.

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
`SKILL.md` file with YAML frontmatter; its `description` field is the
auto-trigger surface — Claude reads skill descriptions and progressively loads
the skill body into context when the situation matches. A skill has no own
context window and no model assignment. It cannot be a role; it can only carry a
role's reusable discipline knowledge into that role's context when triggered.

This makes a skill the correct home for a cross-cutting discipline and a wrong
home for a role. Migrating the three duplicated disciplines into skills
collapses each drift surface to a single authoritative file.

### Decision drivers

- **Structural safety over reviewer discipline.** Consistent with ADR-0035's
  first decision driver. One authoritative `SKILL.md` per discipline removes the
  surface where a paraphrase silently drifts from canon. The drift cannot happen
  if there is only one copy.
- **AI-first working mode.** Most future work on this project is AI-generated.
  A skill that progressively loads only into the context that needs it is
  better suited to an AI fleet than always-on prose that every agent carries
  whether or not it is relevant to the current task.
- **Bus Factor.** A `SKILL.md` is a committed, plain-Markdown file. A
  replacement maintainer reads it the same way they read an agent prompt or an
  ADR. The skill layer adds no tribal knowledge.
- **Bounded blast radius.** This is a knowledge-deduplication change, not a
  re-architecture. The seven-subagent role model, the four-phase flow, and the
  load-bearing always-on rules are untouched.

### Evaluated approaches

1. **Status quo — keep the disciplines always-on in `CLAUDE.md` plus paraphrases
   in agent prompts.** Rejected: this is the current state, and it carries the
   drift surface ADR-0035 already flagged as a real failure mode. The
   Defense-in-Depth value of the paraphrases is real, but it is bought with a
   maintenance liability that grows every time a discipline is sharpened.

2. **Move the disciplines into `docs/CONVENTIONS.md` and have agents reference
   the section.** Rejected: `CONVENTIONS.md` is code-writing convention, read by
   the implementer and reviewer. The Bash and ephemeral-workspace disciplines
   are AI-tooling disciplines, not coding conventions; relocating them there
   miscategorises them. It also does not change the load model — the content is
   still always-on for whoever reads `CONVENTIONS.md`, and still restated in the
   agent prompts.

3. **Adopt a skill layer: one `SKILL.md` per extracted discipline, agent prompts
   reference it.** Chosen. Each migrated discipline gets exactly one
   authoritative file; the agent prompts carry a reference instead of a
   paraphrase; the content loads progressively into whichever role's context
   actually needs it. The trade-off is that skill auto-trigger reliability
   inside a subagent context is not yet empirically confirmed for this project's
   Claude Code version — see § Decision → Trigger reliability and § Consequences.

## Decision

The project adopts a **skill layer** for a deliberately bounded set of
cross-cutting AI-working disciplines. The layer extends — does not supersede —
the ADR-0035 subagent architecture.

### What a skill is, and what it is not

A skill is a `SKILL.md` file at `.claude/skills/<skill-name>/SKILL.md`,
committed to git. It carries one reusable cross-cutting discipline. Its YAML
frontmatter has exactly two required fields — `name` and `description` — and no
others (no `tools`, no `model`); the `description` field is the auto-trigger
surface. This two-field shape was verified against the installed reference
skills in the `superpowers` plugin (see § The authoring method); the mechanical
authoring rules — including the verified rule that the `name` value is the
lowercase kebab-case skill name, equal to the skill's directory name — live in
`docs/CONVENTIONS.md` § SKILL Authoring.

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
| `local-tooling-probes`      | § Local Tooling Probes        | architect, reviewer                                              |

`bash-command-construction` is the **pilot** (see § Trigger reliability). All
three disciplines share the same justification for skillification: each is
cross-file duplicated — restated across multiple agent prompts — and removing
that duplication is the payoff. The skill set's inclusion rule is a single test:
cross-file duplication. A discipline that is not cross-file duplicated does not
earn a skill (see § Why the scope stops at three).

### Why the scope stops at three

The migration is bounded. The following stay always-on in `CLAUDE.md` by
deliberate decision and are **not** skillified:

- **`evaluating-refactoring` (the § Evaluating Refactoring Proposals block).**
  Considered for the skill set and **dropped** in the Phase-2 owner review. A
  grep of `.claude/agents/*.md` for the section heading returns **zero hits**:
  the discipline has no agent-prompt restatement, so there is no cross-file
  duplication and no dedup payoff. The owner applied the same
  "no cross-file duplication → not a skill" test that already kept
  `pre-push-gate`, `delegating-with-context`, and `evaluating-subagent-returns`
  always-on, declining to admit `evaluating-refactoring` on a
  progressive-load-only argument. It stays exactly as it is — an always-on
  `CLAUDE.md` block, untouched by this decision.
- **Git State Discipline.** Load-bearing. A documented duplicate-merge on `main`
  resulted from one violation of this rule. A missed auto-trigger here is more
  expensive than the always-on context cost. It stays always-on.
- **Working Process / the four-phase flow, Critical Rules, Quick Fix vs.
  Feature classification, Orchestrator routing** (Agent Architecture table,
  Trigger Disambiguation, Orchestrator Responsibilities, Thinking Discipline,
  Language Convention, Technical Debt routing, Conventions Quick Reference,
  Documentation Map). Methodology backbone and Orchestrator-identity content.
  Either load-bearing or index content; low or zero dedup payoff.
- **Pre-Push Gate.** An Orchestrator-driven operational sequence run at a known
  workflow boundary. "The branch is ready for its first push" is a workflow
  state, not a text-matchable trigger phrase, so there is no clean auto-trigger
  surface. It is not duplicated across agent prompts, so there is no dedup
  payoff. Stays always-on.
- **Delegation Pattern: Pass Objective Context** and **Delegation Pattern:
  Evaluate Subagent Returns.** Both are consumed exclusively by the Orchestrator
  and are not restated in any agent prompt. The deduplication argument does not
  apply, and the Orchestrator always reads `CLAUDE.md` in full, so progressive
  load buys nothing. Both stay always-on.

A skill earns its place when it is cross-file duplicated — restated across
multiple agent prompts — so that collapsing it to one authoritative file is a
real dedup win. Always-on content that is load-bearing, index-shaped,
Orchestrator-only, or simply not duplicated does not meet that bar.
`evaluating-refactoring` is the clearest case of the last category: a discrete,
situational discipline whose progressive-load profile would fit a skill, but
which carries no duplication to remove — and the owner deliberately kept the
inclusion rule a single consistently-applied test rather than admit a
progressive-load-only exception.

### The authoring method

The project adopts the `superpowers:writing-skills` skill — the `writing-skills`
skill from the `superpowers` plugin in the `claude-plugins-official`
marketplace — as the skill-authoring and pilot-validation method. The plugin is
**installed and verified** at the time this ADR is written: `superpowers`
version **5.1.0**, pinned commit `f2cbfbefebbfef77321e4c9abc9e949826bea9d7`,
installed under
`~/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/`. The
plugin is a top-level entry in the `claude-plugins-official` marketplace as a
`url`-source plugin pointing at `github.com/obra/superpowers.git` — the
marketplace attribution above is verified against the marketplace's
`marketplace.json`. The superpowers version is recorded here for
reproducibility, the same way the Local Tooling Probes convention records the
pinned version of any probed tool; if the plugin is updated, the authoring
method is re-checked against the new version before it is relied on.

`superpowers:writing-skills` frames skill authoring as test-driven (a RED →
GREEN cycle adapted to process documentation): observe an agent **without** the
skill fail or under-perform on the target task (RED, the baseline), then write
the skill (GREEN), then verify the skill now triggers and the agent succeeds.
This method is used to author all three skills and, critically, to run the pilot
spike. The concrete spike — baseline scenarios, the two subagent contexts it
runs in, and the explicit pass/fail criterion — is specified in the Phase-2
concept document for this task (`02-concept.md` § Test Approach).

**Conscious divergence from `writing-skills`' own "Don't create for" guidance.**
`writing-skills` § "When to Create a Skill" carries an explicit "Don't create
for" list that names — among others — _project-specific conventions_ ("put in
`CLAUDE.md`") and _mechanical constraints_ ("if it's enforceable with
regex/validation, automate it"). Two of this ADR's three skills sit, on a
literal reading, in that list: `bash-command-construction` is bound to _this_
project's `.claude/settings.json` permission matcher — a mechanical constraint —
and `ephemeral-workspace` is _this_ project's `.claude/tmp/` convention. The
divergence is **conscious**, not an oversight. These disciplines become skills
not because they are model "skills" by `writing-skills`' own criteria, but
because each is duplicated across multiple agent prompts
(`bash-command-construction` across five) and that cross-file duplication is
precisely the drift surface this decision exists to close. The project adopts
`writing-skills` for its test-driven authoring loop and `SKILL.md` format shape;
the deduplication motive overrides its general "don't create for
project-specific conventions" advice, which is framed for cross-project reuse
and does not anticipate using the `SKILL.md` format as a single-source
container. This paragraph records the divergence as a deliberate decision so a
later reader of `writing-skills` does not have to reverse-engineer it.

The other `superpowers` skills (for example `systematic-debugging`,
`verification-before-completion`) are capability additions independent of this
deduplication goal and are explicitly **out of scope** for this decision. They
get their own scoping if and when the owner triggers that stream.

### The authority model

`docs/AGENTS.md` § Evolving the System currently states: _"Agent prompts are the
live behavior; this document is the map. If they disagree, the agent prompt
wins."_ That is a two-surface rule. For a cross-cutting discipline extracted to
a `SKILL.md`, two further surfaces appear — the `SKILL.md` itself and the
`CLAUDE.md` pointer — and the unsharpened rule produces two winners: the prompt
and the skill both claim authority.

The rule is sharpened into a single **ordered precedence rule** that partitions
the surface rather than carving out an exception:

1. **For the *content* of a cross-cutting discipline that has been extracted to
   a `SKILL.md`** (currently `bash-command-construction`, `ephemeral-workspace`,
   `local-tooling-probes`), the `SKILL.md` is the single authoritative source.
   The agent prompt and `CLAUDE.md` carry a *reference* to the skill, never a
   copy; if a reference's phrasing drifts from the `SKILL.md` body, the
   `SKILL.md` wins and the reference is out of date.
2. **For everything else** — an agent's role-specific operational prose, its
   tool whitelist, its per-phase workflow, and every discipline *not* extracted
   to a skill — the agent prompt is the live behaviour and `docs/AGENTS.md` is
   the map; if they disagree, the agent prompt wins.

Rule 1 governs *discipline content*; Rule 2 governs *agent behaviour*. They do
not overlap, because a skill never carries role-specific operational prose —
that is precisely what keeps a skill cross-cutting. A maintainer who hits an
apparent conflict resolves it by asking one question: "is this the content of an
extracted discipline, or is it how a role operates?" — the first answer routes
to Rule 1, the second to Rule 2. `docs/AGENTS.md` § Evolving the System carries
this exact ordered text; this ADR and that document state identical precedence
language.

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
Rule 1 content moves; Rule 2 content stays.

### Trigger reliability — the openly unresolved decision point

**Whether Agent Skills auto-trigger reliably inside a subagent context with a
narrow tool whitelist, in this project's current Claude Code version, is not
known at the time this ADR is written.** This is the load-bearing risk of the
whole decision and it is recorded here as openly unresolved, not papered over.

The entire deduplication premise depends on a skill *reliably* loading into a
subagent's context when that subagent — running on a narrow tool whitelist, in
an isolated context — hits the situation the skill covers. There is direct
upstream evidence that subagent skill-loading is a distinct case: the
`superpowers` plugin's own bootstrap skill `using-superpowers` opens with a
`<SUBAGENT-STOP>` block instructing a dispatched subagent to skip it. The plugin
authors themselves treat the subagent case specially — so "skills behave the
same in subagents" cannot be assumed, and the pilot exists to test exactly that.

The decision is therefore **pilot-gated**:

- **Pilot:** `bash-command-construction`, validated in **two** subagent
  contexts — `implementer` (the widest tool whitelist) and `architect` (a
  genuinely narrow-whitelist agent) — so the spike brackets the
  narrow-whitelist risk the requirements doc names, rather than testing only
  the most favourable subagent.
- **Method:** the `superpowers:writing-skills` test-driven loop (observe failure
  without the skill, write the skill, verify it now triggers), against
  superpowers 5.1.0.
- **Pass criterion:** the skill auto-triggers — without a hard-invocation
  pointer in the agent prompt — across a defined set of Bash-construction
  trigger scenarios, in both contexts, on a reproducible basis. The pilot's
  pass/fail criterion is specified in detail in the Phase-2 concept document for
  this task.
- **Gate:** the remaining two skills (`ephemeral-workspace`,
  `local-tooling-probes`) migrate **only after** the pilot passes.

**Fallback if the pilot fails:** the skill files still exist as the single
authoritative source (the dedup of canonical prose still holds), but the
auto-trigger is not relied upon. Each consuming agent prompt keeps a **single
line** of hard-invocation pointer — e.g., _"Before constructing any Bash
command, invoke the `bash-command-construction` skill."_ — as Defense-in-Depth,
and the `CLAUDE.md` discipline sections become a hybrid: a one-line pointer to
the authoritative `SKILL.md` plus the discipline prose retained inline as an
always-on mirror, because a failed auto-trigger means the Orchestrator (which
reads `CLAUDE.md` directly, not via the `Skill` tool) still needs the prose.
This is still an improvement over the status quo (one authoritative file, a
one-line pointer instead of a multi-line paraphrase in each agent prompt) but a
materially smaller win than reliable auto-trigger — it does not fully shrink
`CLAUDE.md`. The concrete shape of this fallback commit is pre-drawn in the
Phase-2 concept document (`02-concept.md` § Commit Plan → Commit 3, FAIL path).
If even hard-invocation proves unreliable, the disciplines stay always-on in
`CLAUDE.md` and the migration is cancelled — the revisit condition in Warrant
Check trigger C.

### What does NOT change

- The seven-subagent role architecture from ADR-0035. No role added, removed,
  merged, or split.
- The four-phase flow and the Orchestrator model.
- The permission policy's substance. `.claude/settings.json` already permits
  reads under `.claude/` broadly; the skills directory is read like any other
  committed `.claude/` content. A `Write` to `.claude/skills/**` falls to the
  `ask` list, matching the existing `Write(.claude/agents/**)` posture; no
  settings change is made.
- The always-on `CLAUDE.md` sections listed under § Why the scope stops at
  three — including § Evaluating Refactoring Proposals.
- The Bus-Factor English-artefact convention. Every `SKILL.md` is English.
- The committed-infrastructure posture: `.claude/skills/` is committed to git,
  the same tier as `.claude/agents/` and `.claude/settings.json`.

## Consequences

### Positive

- **Each migrated discipline has one authoritative source.** The drift surface
  ADR-0035 flagged collapses for the three migrated disciplines: one file to
  edit, no paraphrases to keep in sync.
- **Progressive load.** Discipline content loads into the context that needs it
  rather than sitting always-on in every agent's prompt — the
  `local-tooling-probes` discipline, for instance, is relevant only to the two
  agents that run probes. (This positive is realised in full only if the pilot
  passes; see § Negative.)
- **The agent prompts shrink to references.** Each consuming agent prompt
  replaces a multi-line discipline paraphrase with a short skill reference (a
  pointer if the pilot passes, a one-line hard invocation if it does not).
- **The convention is reproducible.** The mechanical `SKILL.md` authoring rules
  live in `docs/CONVENTIONS.md`; the next contributor or AI agent adding a skill
  follows a documented shape, the same way ADR-0050's script-naming convention
  routes through `CONVENTIONS.md`.

### Negative

- **Trigger reliability is unconfirmed at decision time.** This is the load-
  bearing risk. The pilot gate and the hard-invocation fallback are the
  mitigation, but the ADR ships before the empirical question is settled. This
  is a deliberate, recorded uncertainty, not an oversight.
- **A new surface class to maintain.** `.claude/skills/` is one more place a
  future maintainer must know about. Mitigation: it is committed, plain-Markdown,
  documented in `docs/AGENTS.md` § What Lives Where and the `docs/CONVENTIONS.md`
  authoring section, and indexed in `docs/ARCHITECTURE.md`.
- **Two-winner risk during the transition.** Until every agent prompt is
  reduced to a reference, a migrated discipline briefly has both a `SKILL.md`
  and prompt prose. Mitigation: the implementation removes the prompt
  paraphrases in the same PR commit that adds the corresponding skill reference;
  the sharpened authority rule in `docs/AGENTS.md` resolves any residual
  conflict by the ordered precedence rule above, not case by case.
- **Partial migration if the pilot fails.** If the pilot fails, the project is
  left with either three skills plus hard-invocation pointers and a `CLAUDE.md`
  that still carries the discipline prose inline, or no skills and the
  disciplines back in always-on prose. The full-auto-trigger end state is not
  guaranteed by this ADR — it is gated.

### Risk mitigation

- **Skill does not auto-trigger inside the subagent.** Mitigated by the pilot
  spike before any non-pilot migration, the two-context spike that brackets the
  narrow-whitelist case, and the one-line hard-invocation fallback that keeps the
  discipline enforced even without auto-trigger.
- **Future Claude Code release changes subagent skill-loading behaviour.** A
  release that newly enables, or newly breaks, subagent skill auto-trigger is a
  named revisit trigger. If a release breaks a previously-passing trigger, the
  hard-invocation fallback is re-applied; if a release newly enables reliable
  triggering after a failed pilot, the migration can be re-attempted.
- **Convention drift on the next skill.** Mitigated by the `docs/CONVENTIONS.md`
  authoring section and the `concept-reviewer` pass that any future agent-
  architecture change must go through (`docs/AGENTS.md` § Evolving the System).

## Success criteria

- The three `SKILL.md` files exist under `.claude/skills/<skill-name>/`,
  committed to git, each carrying exactly one discipline, each with a `name`
  (lowercase kebab-case, equal to the directory name) and a `description`
  frontmatter field.
- A `grep` for the three migrated discipline section headings across
  `.claude/agents/*.md` returns only skill references, not paraphrased prose
  blocks, for each consuming agent.
- The `bash-command-construction` pilot has run via the
  `superpowers:writing-skills` method in both the `implementer` and the
  `architect` context, with a recorded pass-or-fail verdict against the defined
  criterion. If it failed, the recorded fallback (hard-invocation pointer plus
  `CLAUDE.md` inline mirror, or cancelled migration) is the shipped state.
- `docs/AGENTS.md` § Evolving the System carries the sharpened, precedence-
  ordered authority rule; `docs/CONVENTIONS.md` carries the `SKILL.md` authoring
  section; `docs/ARCHITECTURE.md` ADR Quick Reference carries the ADR-0055 row.
- A replacement maintainer can read this ADR, `docs/AGENTS.md`, and
  `docs/CONVENTIONS.md` and understand where a cross-cutting discipline lives,
  which surface is authoritative, and how to add a new skill.

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
  decision and the authority model; `docs/CONVENTIONS.md` § SKILL Authoring
  carries the frontmatter and naming rules.
- `docs/AGENTS.md` § Evolving the System — the authority rule sharpened by this
  decision; it carries the precedence-ordered text identical to § The authority
  model above.
- `docs/CONVENTIONS.md` § SKILL Authoring — the mechanical authoring rules this
  decision establishes (added in the introducing PR).
- `CLAUDE.md` — the three migrated discipline sections become skill references
  in the introducing PR. § Evaluating Refactoring Proposals stays always-on,
  untouched.
- `.claude/skills/<skill-name>/SKILL.md` — the new skill files.
- The `superpowers:writing-skills` skill — the `writing-skills` skill from the
  `superpowers` plugin (`claude-plugins-official` marketplace, `url`-source
  `github.com/obra/superpowers.git`), installed and verified at version 5.1.0,
  commit `f2cbfbefebbfef77321e4c9abc9e949826bea9d7` — the adopted
  skill-authoring and pilot-validation method.
