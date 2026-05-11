# Claude Code Permission System

Detailed documentation for the agent permission configuration
[`.claude/settings.json`](../../.claude/settings.json) and the conventions in
[`CLAUDE.md`](../../CLAUDE.md) that complement it.

## Table of Contents

- [Overview](#overview)
- [Security Stance](#security-stance)
- [Pattern-Matching Mechanics](#pattern-matching-mechanics)
- [Convention Hubs in CLAUDE.md](#convention-hubs-in-claudemd)
- [Allow-List Rationale](#allow-list-rationale)
- [Deny-List Rationale](#deny-list-rationale)
- [Ask-List Rationale](#ask-list-rationale)
- [Deliberate Loose Ends](#deliberate-loose-ends)
- [Iteration Log](#iteration-log)
- [Open Follow-ups](#open-follow-ups)
- [Related Documentation](#related-documentation)

---

## Overview

Claude Code agents — architect, implementer, reviewer, concept-reviewer,
debt-auditor — gate every tool call through `.claude/settings.json`. The file
defines three lists:

| List        | Behaviour                                                                         |
| ----------- | --------------------------------------------------------------------------------- |
| **`allow`** | Tool call executes silently. No prompt to the owner.                              |
| **`deny`**  | Tool call is blocked before execution. No prompt.                                 |
| **`ask`**   | Tool call pauses, owner is prompted, sees the exact command, approves or rejects. |

Patterns are matched against the **constructed tool call string**, not the
resolved filesystem state. `Bash(git diff *)` matches the literal command
`git diff <anything>`, not whatever git would actually do when run.

A tool call that matches none of the three lists falls through to the session's
`defaultMode`. We use `"defaultMode": "default"`, which means unmatched calls
prompt the owner. `acceptEdits` would auto-approve writes, which is too
permissive for production-document edits and is deliberately not used.

When an agent needs an operation the matcher doesn't recognise, the owner sees a
prompt with the verbatim command. This is the foundation of the security stance
below: the matcher is opinionated about what's silent, what's blocked, and what
surfaces.

---

## Security Stance

Four layers protect the repository:

1. **Pre-push hook** — `jscpd`, `lint`, `typecheck`, `tests`. Fires before any
   code leaves a local clone. Catches duplication, lint errors, type errors,
   test failures at the latest possible local moment.
2. **Owner-sign on commits** — `git commit -S -F <COMMIT_EDITMSG-path>` is
   executed by the owner, never the agent. The owner sees the staged diff and
   the commit message before signing. No agent can produce a signed commit on
   its own.
3. **CI on PR** — Quality Gate, SonarCloud, Semgrep, Links, GitGuardian,
   Socket.dev. The PR cannot merge until all checks pass.
4. **Permission layer** — `.claude/settings.json`. Catches tool calls before
   execution, ahead of all three layers above.

The permission layer is the **outermost** layer, but also the **least
critical**: the three layers above would catch most damage even if the
permission layer were entirely absent. Permission patterns exist primarily to
reduce friction (silence the prompts on safe operations) and to surface unusual
operations to the owner, not as the sole defence.

This stance has two implications:

- **Loosening allow-patterns is rarely catastrophic.** A misconfigured allow
  rule means the agent does something the owner didn't explicitly approve, but
  the three outer layers will still catch real damage. The risk is reduced
  _visibility_, not reduced _safety_.
- **Self-modification of the permission system must remain `ask`.**
  `Write(.claude/settings.json)` and `Write(.claude/agents/**)` are deliberately
  on `ask` because they affect future agent behaviour, and the outer layers
  cannot retroactively undo a permission change.

---

## Pattern-Matching Mechanics

The non-obvious rules the matcher follows. These are the failure modes that
required multiple iteration rounds to surface.

### Compound commands match segment-by-segment

`cd <path> && git diff <file>` is two segments. The matcher splits at `&&` and
applies the allow/deny/ask lists to each segment independently. A rule like
`Bash(git diff *)` does **not** cover the compound command — the `cd` segment
has no matching allow rule, so the whole call prompts.

Operators that split: `&&`, `||`, `;`, `|`, `|&`, `&`, and newlines.

**Consequence:** agents avoid compound commands and use the command's own
path-aware form instead. `git -C <path> diff` replaces `cd <path> && git diff`.
`pnpm --dir <path> run <script>` replaces `cd <path> && pnpm run <script>`.

See [§ Bash Command Construction](#convention-hubs-in-claudemd) below.

### `**/` glob covers cross-CWD path forms

Claude Code is started in the main project root, and feature worktrees are
registered via `--add-dir`. From main-CWD, a worktree-local file is at
`.claude/worktrees/<name>/.claude/tmp/foo.txt`, not `.claude/tmp/foo.txt`.

The matcher is configured for both forms:

- `.claude/tmp/**` matches the rare case Claude Code is started inside a
  worktree.
- `**/.claude/tmp/**` matches the default main-CWD case, where `**` swallows the
  worktree-prefix path segments.

Either path style is matched. Absolute paths (`C:/.../.claude/tmp/...`) are
**not** matched by relative patterns on Windows, because the drive letter prefix
is not a path segment the `**` glob recognises. Agents must use relative paths
or risk unnecessary prompts.

### Single `*` does not cross path separators

`Bash(cp * .claude/tmp/foo)` matches
`cp <single-segment-source> .claude/tmp/foo`, but not
`cp src/scripts/foo.ts .claude/tmp/foo` — the source path contains a `/`, which
a single `*` won't span.

Use `**` (no path separator restriction) or list specific path shapes when the
source can be in subdirectories.

### Heredoc bodies trigger the brace-quote heuristic

`cat > foo.json <<'EOF' {"key": "value"} EOF` lands a JSON config on disk. The
matcher inspects the heredoc body for shell-expansion patterns as a security
heuristic. Bodies containing `{`, `}`, or `"` produce the rejection reason
_"Contains brace with quote character"_ even when the output path is on the
allow list.

**Consequence:** configs (JSON, YAML, TOML, `.env`-style) and structured text
are written via the `Write` tool, which bypasses the heredoc heuristic entirely.
Heredoc is acceptable only for plain text without braces or quotes.

### Shell substitutions are matched literally

`$(git rev-parse --git-path COMMIT_EDITMSG)` is shell substitution: the shell
resolves it to a path at execution time. The matcher sees the **literal** string
before resolution, so the pattern must include the substitution syntax to match.

The settings include patterns like
`Bash(cp .claude/tmp/* "$(git rev-parse --git-path COMMIT_EDITMSG)")` to cover
this form, alongside the static path forms. The substitution form is preferred
in agent prompts because it works identically for both worktree and non-worktree
contexts.

### Edit and Write are separate tools

The `Edit` tool (string replacement in an existing file) and the `Write` tool
(create or overwrite a file) are separate permission targets. A pattern like
`Write(src/**)` does **not** cover `Edit(src/**)`. Both must be configured.

This caught us mid-iteration: the settings had Write patterns but no Edit
patterns. The implementer's edit-tool overwrite prompts (which we initially
dismissed as "edit-tool by design") were partly this lack of Edit-pattern
coverage. The current settings include Edit patterns symmetric to Write where
appropriate.

### Sub-agents prompt the owner like normal agents do

There was a working hypothesis at one point that sub-agents (architect,
implementer, etc., dispatched via the agent tool) cannot surface permission
prompts back to the owner and therefore auto-deny on any non-allow call. **This
is not true.** Sub-agent prompts reach the owner the same way main-agent prompts
do.

What can cause sub-agents to _appear_ to auto-deny is when the agent formulates
a call with an absolute path that no relative `**/` pattern catches — the
resulting prompt sometimes does not survive certain orchestration UI flows. The
root cause in observed cases has been pattern shape, not sub-agent capability.

---

## Convention Hubs in CLAUDE.md

The permission patterns work in tandem with conventions in
[`CLAUDE.md`](../../CLAUDE.md). The conventions are the agent-side discipline;
the patterns are the system-side enforcement. Neither is sufficient on its own.

| CLAUDE.md Section                         | Purpose                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **§ Bash Command Construction**           | Construction rules that keep tool calls inside the matcher's recognisable patterns. No `cd && cmd` chains, `git -C <path>` for cross-worktree git, one concern per tool call, Configs via Write not heredoc, Unix shell syntax even on Windows, `mkdir -p` not plain `mkdir`.                                    |
| **§ Ephemeral Workspace**                 | `<worktree>/.claude/tmp/` as the only legitimate scratch location. Never `/tmp`, `C:/tmp`, or `~/tmp` — those produce silent races between parallel sessions. Main-project-direct `.claude/tmp/` is also legitimate for pre-Phase-1 research.                                                                    |
| **§ Local Tooling Probes**                | When validating tool behaviour (jscpd thresholds, format mappings, performance), use the version pinned in `package.json` (via `pnpm <script>` or direct binary invocation), not `pnpm dlx <tool>@<version>`. Avoids drift against the pre-push hook and skips the Ask gate.                                     |
| **§ Git State Discipline**                | Verify state before non-trivial git operations. `git log origin/main -3` vs. `git log main -3`, branch name collision checks, stale tracking refs.                                                                                                                                                               |
| **§ Anti-Tunnel** _(in `implementer.md`)_ | Three triggers that stop runaway iterations: identical verification calls without intervening mutation, three rounds of point corrections on the same artefact, backslash-escalation in shell-string construction. With concrete report-back template and exit path via `Edit`/`Write` + codepoint verification. |

The conventions explain **why** the patterns are shaped as they are. The
patterns are the matcher-readable encoding of the conventions. Reading the
conventions without looking at the patterns leaves the _why_ clear but the _how_
fuzzy; reading the patterns without the conventions leaves the _how_ clear but
every choice looks arbitrary.

---

## Allow-List Rationale

Grouped by purpose, with the rationale for inclusion. Individual pattern
expansions follow obvious shape rules (`*` for single-segment, `**` for
path-spanning, `**/` for cross-CWD) and are not enumerated here — read the file
for the exact list.

### Read-only git

`git log`, `git show`, `git diff`, `git blame`, `git rev-parse`, `git status`,
`git branch`, `git show-ref`, `git ls-files`, `git worktree list`,
`git stash list`/`show`, `git fetch` (all read-only variants),
`git remote -v`/`show`, `git config --get*`/`--list`.

Plus the same set in `git -C <path> <subcommand>` form for cross-worktree reads
— see [§ Pattern-Matching Mechanics](#pattern-matching-mechanics) on why this
form is preferred over `cd <path> && git <subcommand>`.

Plus `git add` (and `git -C * add`), which is staging-only — the actual state
change happens at `git commit`, which is on Ask.

These are read-only inspection operations; they never mutate the repo.
Auto-allow is safe and removes substantial prompt friction.

### Package.json scripts (explicit, not generic)

Every `pnpm <script>` that's defined in `package.json` is allowed individually:
`install`, `build`, `dev`, `preview`, `test`, `test:run`, `check`,
`check:conventions`, `check:biome-rules`, `check:duplication`,
`check:sonar-findings`, `fix`, `typecheck`, `lint`, `lint:fix`, `format` and all
its sub-variants, `organize-imports`, `validate:renovate`, `prepare`.

**Generic `pnpm *` is deliberately not allowed.** A new script added to
`package.json` requires a settings update — that is the intended friction,
because new scripts are an intentional surface and should be reviewed once
before becoming silent.

`pnpm run *` is allowed as a slightly broader catch for less-common script
names. `pnpm --dir * run *` is allowed for cross-worktree script execution.
`corepack pnpm *` is allowed as the wrapper form.

### Direct tool invocations

`biome *`, `vitest *`, `astro <subcommand>`, `prettier *`, `tsc *`, `jq *`.
These are pinned dev-dependencies; running them directly is equivalent to
running them via a `pnpm` script, just without the script wrapper. Useful for
parameter sweeps the scripts don't accept.

### File exploration

`ls`, `cat`, `head`, `tail`, `wc`, `find` (read-only forms — `-name`, `-type`,
`-path`, but **not** `-exec`/`-execdir`/`-delete`), `grep`, `rg`, `sed -n`
(read-only), `cp`, `mkdir -p`, `echo`, `printf`, `pwd`, `which`, `tree`.

These don't modify repo state in damaging ways. `cp` is here because copying
into `.claude/tmp/` and into `COMMIT_EDITMSG` are routine; copies into sensitive
paths are caught by the deny list anyway.

### Ephemeral workspace paths

`Write(.claude/tmp/**)` and `Write(**/.claude/tmp/**)` — see
[§ Ephemeral Workspace](#convention-hubs-in-claudemd). The double-pattern form
catches both worktree-CWD (`.claude/tmp/...`) and main-CWD
(`<worktree>/.claude/tmp/...`).

The same shape for `.claude/work/**` (concept-doc and requirements storage) and
for `.claude/agents/` (deliberately _not_ allowed — see Ask list).

Plus the corresponding `Bash(cp * .claude/tmp/*)`, `Bash(* > .claude/tmp/*)`,
etc., for shell-level operations.

### COMMIT_EDITMSG installation

The two-stage commit workflow (Write to tmp, validate via commitlint, copy to
COMMIT_EDITMSG) requires several `cp` patterns:

- `cp .claude/tmp/* .git/worktrees/*/COMMIT_EDITMSG` and the `**/` cross-CWD
  variant
- `cp .claude/work/*/* .git/worktrees/*/COMMIT_EDITMSG` (for when the message
  file lives under a task-id work directory)
- The same shapes for non-worktree `.git/COMMIT_EDITMSG`
- The dynamic substitution form
  `cp .claude/tmp/* "$(git rev-parse --git-path COMMIT_EDITMSG)"`

Plus `Write(.git/COMMIT_EDITMSG)` and the worktree variant for the rare case the
implementer writes the message directly without the validation step. The
two-stage form is preferred — see [`CONTRIBUTING.md`](../../CONTRIBUTING.md) §
AI-Assisted Contributions.

### Web tools

`WebSearch` is allowed unconditionally — it has no side effects beyond returning
search results, and the alternative (every research query prompts) destroys
research-flow productivity.

`WebFetch` is **domain-allowlisted**, not unconditionally allowed. Fetches
against URL parameters can in principle exfiltrate data; the allowlist mitigates
that by restricting fetches to known documentation hosts:

- Sonar (`docs.sonarsource.com`, `community.sonarsource.com`,
  `blog.sonarsource.com`, `sonarcloud.io`)
- Stack ecosystem (`nodejs.org`, `pnpm.io`, `astro.build`, `tailwindcss.com`,
  `vitejs.dev`, `vitest.dev`, `biomejs.dev`, `prettier.io`, `eslint.org`,
  `commitlint.js.org`)
- Standards (`developer.mozilla.org`, `semver.org`, `conventionalcommits.org`,
  `web.dev`, `w3.org`, `wcag.com`)
- Code hosting (`github.com`, `raw.githubusercontent.com`, `stackoverflow.com`,
  `npmjs.com`, `www.npmjs.com`, `registry.npmjs.org`)

Fetches against other domains prompt. Adding a new domain to the allowlist is a
deliberate one-time review.

### Read-only `gh` operations

`gh pr list`, `gh pr view`, `gh pr status`, `gh pr checks`, `gh pr diff`,
`gh issue list`/`view`/`status`, `gh repo view`, `gh search prs`/`issues`,
`gh auth status`, `gh --version`.

These don't mutate GitHub state. PR creation, comments, merges, and
authentication changes are on the Deny list (not Ask) — those go through
explicit owner workflows, not agent automation.

---

## Deny-List Rationale

Grouped by what's being protected.

### Secrets and credential files

Read and write blocked on `.env`, `.env.*`, `./secrets/*`, `./secrets/**`, and
the analogous forms without `./` prefix.

`Bash` denies cover the indirect-access patterns: `cat .env*`, `head .env*`,
`tail .env*`, `grep * .env*`, `rg * .env*`, `less .env*`, `more .env*`,
`sed * .env*`, `tee .env*`, `touch .env*`. Plus the redirect forms: `* > .env`,
`* >> .env`, and `* > secrets/**`.

This is defence in depth. A naive agent shouldn't read secrets, and a
compromised agent shouldn't be able to write them out via creative shell forms.
The list covers the obvious patterns and the slightly-creative ones; entirely
creative workarounds (executable scripts checked into the repo, exotic aliases)
are not blockable at the permission layer alone — see the _spirit-vs-mechanics_
note in [`implementer.md`](../../.claude/agents/implementer.md).

### Git internal state

`Write(.git/HEAD)`, `Write(.git/index)`, `Write(.git/config)`,
`Write(.git/refs/**)`, `Write(.git/objects/**)`, `Write(.git/hooks/**)`,
`Write(.git/info/**)`, `Write(.git/logs/**)`, `Write(.git/packed-refs)`, plus
the same set under `.git/worktrees/*/`, plus the `**/` cross-CWD variants.

These are repository state files. Writing to them corrupts the repo or silently
rewrites history. The agent should never touch them — git operations like
`git commit`, `git rebase`, etc. go through git itself, which writes these files
as a side effect.

`Write(.git/COMMIT_EDITMSG)` is **deliberately not** on this deny list — it's on
the allow list, because writing a commit message is a routine agent operation.
COMMIT_EDITMSG is the only `.git/` file an agent ever writes directly.

State-changing git commands themselves (`git checkout`, `switch`, `merge`,
`rebase`, `reset`, `cherry-pick`, `branch -D`/`-d`, `push`, `pull`, `clean`,
`stash drop`/`pop`/`clear`, `update-ref`, `replace`, `filter-branch`, `am`,
`apply`, `tag -d`, `notes`, `reflog expire`, `commit`) are all on Deny,
including the `git -C <path>` forms.

`git commit` is on **Deny**, not Ask — because the owner-sign workflow goes
through `git commit -S -F <COMMIT_EDITMSG-path>` initiated by the owner
directly, not via an agent prompt. An agent attempting `git commit` is doing
something wrong.

### Shell wrappers and exec vectors

`bash -c`, `sh -c`, `zsh -c`, `eval`, `source`, `. *`. Plus `awk *` because
awk's `system()` builtin lets it exec arbitrary commands.

These break the permission model — the matcher inspects the command text, but a
shell wrapper hides the actual command inside a string argument. An agent that
wants to run `cat .env` could in principle do it via `bash -c "cat .env"` and
have only the `bash -c` form visible to the matcher.

`Bash(. *)` looks like a current-directory reference but is the `.`-builtin form
of `source`. Looks confusing, blocks correctly.

### Foreign runtimes

`perl`, `python`, `python3`, `deno`, `bun`, `make`, `env *`.

This project is Astro/Node/pnpm. No legitimate agent operation calls Perl,
Python, or Deno. `make` would invoke a Makefile that we don't have. `env *` is
the env-variable-injection form. All deny.

### Destructive operations

`rm -rf *`, `rm -r *`, `rm -f *`, `sudo *`, `curl *`, `wget *`, `chmod -R *`,
`chown *`.

`curl` and `wget` are on Deny because the agent has WebFetch (with domain
allowlist) for legitimate network reads. `curl <arbitrary>` is a
data-exfiltration vector that doesn't need to exist.

`rm -rf` is the obvious one. Note that single-file `rm <file>` is not on Deny;
it falls through to Ask via defaultMode, which is the right balance.

### Low-level byte readers against secrets

`xxd`, `od`, `dd`, `hexdump`. These could read binary content (e.g. a secrets
file that's not text). Generic deny.

### Source-agnostic redirect writes to sensitive paths

`* > .env`, `* >> .env`, `* > secrets/**`, `* > .git/**` (with specific
exceptions for COMMIT_EDITMSG), `* > package.json`, `* > pnpm-lock.yaml`,
`* > CLAUDE.md`. Plus the `>>` append forms.

These close the loophole _"any source command piped to a sensitive path"_.
Without these, `jq . x > package.json` or `tree > secrets/foo` or
`echo "..." > CLAUDE.md` would bypass the per-source allow rules.

### GitHub write operations

`gh pr create`, `gh pr merge`, `gh pr close`, `gh pr edit`, `gh pr review`,
`gh pr comment`, `gh pr checkout`, `gh issue create`/
`close`/`edit`/`comment`/`delete`, `gh repo create`/`delete`/`edit`,
`gh release create`/`delete`/`edit`, `gh workflow run`, `gh secret set`/
`delete`, `gh variable set`/`delete`, `gh auth login`/`logout`/`refresh`,
`gh api *`, `gh extension install`/`remove`/`upgrade`/`exec`,
`gh run cancel`/`delete`/`rerun`.

All GitHub write operations go through explicit owner workflows (`gh pr create`
etc. run by the owner directly), not through agent automation. The agent can
read GitHub state (see Allow list) but cannot write.

---

## Ask-List Rationale

The Ask list is the most interesting: these are operations where the agent's
intent matters, and the owner is the right judge.

### State-changing git (limited set)

`git commit *` and `git commit` — see Deny rationale above for why this is
somewhat anomalous. These are on Ask, not Deny, because historically the agent
has occasionally needed to invoke a non-signing commit (e.g. for amend-no-edit
reflows). The owner approves on demand; the actual signed-commit workflow goes
through `git commit -S -F` initiated by the owner outside the agent.

`git restore *`, `git rm *`, `git mv *` — staging-area changes that mutate
working tree files. Distinct from `git add *` (Allow) because they alter,
delete, or relocate files.

`git config *` — without the `--get` qualifier this is a write operation. Read
forms (`git config --get *`, `--get-all *`, `--list`, `-l`) are on Allow.

`git worktree add *`, `remove *`, `prune` — worktree lifecycle is owner
business. Agents work _in_ worktrees but don't create or destroy them silently.

`git stash *` — covers `push`, `pop`, `drop`, `clear`, etc.

### Generic `cp *`

`Bash(cp *)` is on Ask for all destinations not specifically allowed. Specific
Allow rules cover copies into `.claude/tmp/`, `.claude/work/`, and
COMMIT_EDITMSG paths. Other destinations prompt — copying files around the repo
is owner-visible by design.

### Package and module management

`pnpm add`, `pnpm remove`, `pnpm update`, `pnpm dlx`, `pnpm exec`.
`npm install`, `npm uninstall`, `npm update`, `npx *`.

These either install/modify dependencies or execute arbitrary code fetched from
the network. Owner approval is the right gate.

`pnpm dlx <tool>@<version>` is the form Local Tooling Probes (see
[Convention Hubs](#convention-hubs-in-claudemd)) tries to steer agents away
from. The Ask gate plus the convention together encourage the agent to use
locally-pinned tools when possible.

### Node execution

`node -e *`, `node --eval *`, `node -p *`, `node --print *`, generic `node *`.
Arbitrary JavaScript execution. Legitimate use cases include SonarCloud API
probings, encoding verification, codepoint inspection (see Anti-Tunnel Trigger 3
in `implementer.md`). The owner approves per-case.

### Destructive `find` variants

`find * -exec *`, `find * -execdir *`, `find * -delete*`. Plain `find` with
`-name`/`-type`/`-path` is on Allow because it's read-only. `-exec` runs
arbitrary commands on every match; `-delete` removes files. Both warrant
per-case approval.

### Sensitive document writes

`Write(CLAUDE.md)`, `Write(docs/CONVENTIONS.md)`, `Write(docs/ARCHITECTURE.md)`,
`Write(CONTRIBUTING.md)`, `Write(package.json)`, `Write(pnpm-lock.yaml)`.

These are project-shape documents. Edits to them affect every future contributor
(human or agent) and every future build. The owner reviews each edit. The agent
is welcome to edit ADRs (`docs/adr/*.md`), task docs (`.claude/work/**`), and
source code without prompting; these top-level documents are different.

### Self-modification of the agent system

`Write(.claude/agents/**)`, `Write(.claude/settings.json)`,
`Write(.claude/settings.local.json)`.

The agent **cannot** silently modify its own prompts or the permission rules
that govern it. Any change here is owner-approved per-edit. This is the most
important entry in the Ask list — it preserves the integrity of the permission
system itself across agent operations.

---

## Deliberate Loose Ends

Small inconsistencies that exist intentionally or by trade-off, documented so
they don't get cleaned up by mistake.

### `Bash(echo $*)` and similar — possibly inert patterns

The deny list includes `Bash(echo $*)`, `Bash(echo ${*)`, `Bash(printf $*)`,
`Bash(printf ${*)`. These were added in an early iteration with the intent of
blocking environment-variable echo as a credential-exfiltration vector (e.g.
`echo $SECRET_TOKEN`).

It's not clear these patterns actually work — `$` and `${` are not glob
metacharacters in the matcher's pattern language, so they may match literally
rather than semantically. The actual ENV protection comes from
`Bash(printenv*)`, `Bash(env)`, `Bash(set)`, `Bash(export)` deny rules, plus the
secrets-file read/write blocks.

**Status:** kept in the list because they do no harm, even if they may be inert.
An audit with harmless test commands (`echo $PATH`) would confirm or refute
their effectiveness. Not urgent — the multi-layered ENV protection works
regardless.

### `Bash(. *)` looks like a current-directory reference

The pattern matches the `.`-builtin (the shell's `source` equivalent), not a
literal dot followed by anything. Misleading at first read but correct in
effect.

### Two pattern forms for the same destination

For every cross-CWD destination, both the relative form
(`Write(.claude/tmp/**)`) and the wildcard form (`Write(**/.claude/tmp/**)`)
appear in the allow list. This is redundant if the agent is always in main-CWD,
but the redundancy is deliberate — it covers the rare case Claude Code is
started inside a worktree (where the relative form is correct) and the default
case (where the wildcard form is correct).

The matcher's behaviour with `**` on absolute Windows paths
(`C:/.../.claude/tmp/...`) is unreliable, which is why the convention in
CLAUDE.md instructs agents to use relative paths exclusively.

### `defaultMode: "default"` not `"acceptEdits"`

`acceptEdits` would auto-approve all unmatched writes, which would include
`Write(CLAUDE.md)` etc. — defeating the deliberate Ask gating. We use
`"default"`, which means unmatched calls prompt the owner. This is more friction
in exchange for guaranteed visibility on novel operations.

### Edit-tool overwrite prompts are accepted

Re-creating an existing file (`02-concept.md`, `01-requirements.md`,
`COMMIT_EDITMSG`) prompts the owner via the Edit-tool's own logic, independent
of the settings file. We accept these prompts because they mark genuinely
destructive operations (overwriting iteration history) where a brief owner check
is the right friction.

### Edit-tool path matcher on Windows

The Edit tool's permission check uses absolute paths on Windows, even when the
agent prompt formulates a relative path. This produces occasional false-positive
prompts for paths that should match existing Write patterns. Not blockable from
the settings side — a Claude Code matcher edge case. Workaround: report at the
next upstream-issue cycle.

---

## Iteration Log

Five iterations of tuning produced the current state, summarised below.

| Iteration | Trigger                                                                                                                                  | Key change                                                                                                                                                     | Empirical effect                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **I1**    | 60–70 prompts per session, mostly `cd <worktree> && git diff` chains                                                                     | § Bash Command Construction in CLAUDE.md; `git -C <path>` patterns                                                                                             | 60–70 → 11 prompts in 74-call session                          |
| **I2**    | Output redirects to `C:/tmp/` produced silent race conditions between parallel sessions                                                  | § Ephemeral Workspace in CLAUDE.md; `.claude/tmp/` patterns; gitignore entry                                                                                   | 11 → 9 prompts on 373-call session                             |
| **I3**    | Cross-worktree tmp paths prompted from main-CWD; heredoc-JSON triggered brace-quote heuristic; concept-reviewer ran fresh tooling probes | `**/.claude/tmp/**` patterns; Write-instead-of-heredoc convention; concept-reviewer boundary                                                                   | 9 → ~5 prompts on similar-size sessions                        |
| **I4**    | `mkdir -p` with absolute Windows paths prompted; `pnpm dlx jscpd@<version>` drifted against the pinned hook version                      | Explicit `mkdir -p` patterns; § Local Tooling Probes establishing version-pinning discipline                                                                   | Prompt density stabilised around 1–2%                          |
| **I5**    | WebFetch was unconfigured; COMMIT_EDITMSG workflow was on `cp`-with-Heredoc; implementer hit encoding-tunnels with no exit               | Web-tool domain allowlist; `.git/` deny narrowed from blanket to state-files; COMMIT_EDITMSG two-stage workflow corrected; § Anti-Tunnel three-trigger section | 9-prompts-in-373-calls baseline carried into multi-stream work |

The reduction from ~85% prompt density to ~1.5% over five iterations is not a
loosening of security — it is structural fixes to matcher-pattern shape, agent
conventions for command construction, and one workflow correction
(COMMIT_EDITMSG). Every gate that was on Ask for security reasons remains on
Ask.

Those headline figures span very different session sizes: the ~85% was a
~74-call session; the low-single-digit-percent range comes from multi-stream
sessions of several hundred to roughly 1700 calls. Absolute prompt counts
(single digits up to the low twenties) matter less than the trend — see the
per-iteration figures in the table above. One measurement bucks the curve: a
~48-call pre-Phase-1 research session ran ~12.5%, because it hit
then-unconfigured `WebFetch` calls and a main-project-direct tmp path, both
closed in I5. And the percentage is a rough productivity signal, not a target: a
low number on a session that silently tunnelled (see § Anti-Tunnel in
[`implementer.md`](../../.claude/agents/implementer.md)) is not a good session.

---

## Open Follow-ups

Optional, not urgent — listed so they aren't rediscovered from scratch.

- **A PreToolUse hook as an escalation layer.** If further compound-command edge
  cases surface that pattern-shape discipline can't absorb, a PreToolUse
  auto-approve hook (e.g.
  [`oryband/claude-code-auto-approve`](https://github.com/oryband/claude-code-auto-approve))
  is the next lever. Not needed at the current ~1–2% prompt density.
- **A `check:duplication:perf` package.json script** for clean jscpd performance
  measurement without the current PowerShell workaround — see § Local Tooling
  Probes in [`CLAUDE.md`](../../CLAUDE.md) for why probes run against the
  version pinned in `package.json`.
- **An ADR for the cross-worktree `--add-dir` workflow** if that setup stays
  stable; it currently lives only as convention in `CLAUDE.md` and the agent
  prompts.
- **An ADR for anti-tunnel-via-identical-verification** if the three-trigger
  convention in `implementer.md` proves itself — the perception trigger ("two
  identical verifications with no intervening mutation = loop") is a reusable
  discipline other projects could adopt.
- **Audit the possibly-inert `echo $*` / `printf $*` deny patterns** with
  harmless test commands — see § Deliberate Loose Ends above.

---

## Related Documentation

- [`CLAUDE.md`](../../CLAUDE.md) — agent discipline conventions (Bash Command
  Construction, Ephemeral Workspace, Local Tooling Probes, Git State Discipline)
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) § AI-Assisted Contributions — the
  agent commit workflow and the COMMIT_EDITMSG path conventions
- [`.claude/agents/implementer.md`](../../.claude/agents/implementer.md) — the
  most permission-relevant agent, including the Anti-Tunnel section
- [`.claude/agents/architect.md`](../../.claude/agents/architect.md) — Local
  Tooling Probes guidance for jscpd and similar
- [`.claude/agents/concept-reviewer.md`](../../.claude/agents/concept-reviewer.md)
  — the no-fresh-probings boundary
- [Claude Code documentation](https://docs.claude.com/en/docs/claude-code/settings)
  — upstream reference for the permission system (subject to change as Claude
  Code evolves)
