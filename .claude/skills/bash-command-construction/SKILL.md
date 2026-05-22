---
name: bash-command-construction
description:
  Use when constructing any Bash command in this project — especially before
  running git or pnpm in a worktree, before joining commands with &&/||/;/| or a
  newline, before creating a file via heredoc, or before formulating a tmp-path
  redirect. Triggers on compound commands, cross-worktree paths, mkdir, and any
  command that may hit the permission policy.
---

# Bash Command Construction

## Overview

The permission policy in `.claude/settings.json` is matched **per subcommand**.
A compound command joined with `&&`, `||`, `;`, `|`, or a newline is split, and
each segment must match an allow rule on its own. A rule like `Bash(git diff *)`
does **not** cover `cd <path> && git diff ...` — the `cd` segment lacks a
matching rule for that compound, and the project owner sees a permission prompt.
Repeated prompts in a long session are not a tooling inconvenience; they degrade
the security value of the deny-list because attention to each individual prompt
drops.

**Core principle:** construct every command so each segment matches an allow
rule on its own — sidestep the matcher's weak spots rather than relying on them.

## When to Use

Apply this discipline whenever you are about to issue a Bash command, and
especially when any of these are true:

- The command runs `git`, `pnpm`, `node`, `prettier`, or `tsc` in another
  worktree or a non-default directory.
- The command would join two or more concerns with `&&`, `||`, `;`, `|`, or a
  newline.
- The command creates a directory (`mkdir`) or a file via heredoc.
- The command writes to or redirects into a path under `.claude/tmp/`.
- A prior command was denied and you are tempted to reformulate it.

This discipline applies to every agent that has Bash access (architect,
concept-reviewer, debt-auditor, implementer, reviewer).

## The Construction Rules

1. **Never construct `cd <path> && <command>`.** Use the command's own
   path-aware flag instead:
   - `git -C <path> <subcommand>` for any git read.
   - `pnpm --dir <path> <script>` when a pnpm script must run in another
     worktree (still `ask`-gated, by design).
   - For `node`, `prettier`, `tsc` etc., run from the directory the project
     owner started Claude Code in. If a different cwd is genuinely needed,
     report back — the project owner adds the directory via `--add-dir` or
     `/add-dir`.

2. **Worktrees are added at session start, not navigated into mid-session.**
   When a task spans multiple worktrees (common for `.claude/worktrees/*`), the
   project owner registers them with `claude --add-dir <worktree-path>` at
   startup or `/add-dir <path>` inside the session. Agents reference those paths
   directly via absolute path or `git -C`, never via `cd ... &&`.

3. **One concern, one tool call.** When the goal is "show me X then Y", issue
   two separate Bash calls. The permission system treats them as independent
   rule matches, and a single approval (`Yes, don't ask again`) covers all
   future invocations of that pattern. Compound commands force the project owner
   to re-approve every variant of the chain.

4. **No shell wrappers.** No `bash -c "..."`, no `sh -c "..."`, no `eval`, no
   `source`, no `. <file>`. These are denied by `.claude/settings.json` for
   security reasons; constructing them wastes a tool turn on a guaranteed
   denial. If a sequence of commands genuinely needs to run as a group, that is
   a signal to extract a `package.json` script (already on the allow list) or
   report the need back to the project owner.

5. **Quoted paths.** Quote a path only when it actually contains spaces.
   Unnecessary quoting interacts poorly with the matcher on Windows. Forward
   slashes are fine for git paths on Windows; backslashes hit additional matcher
   edge cases — avoid them.

6. **Failed permission ≠ retry.** If a command is denied, do not reformulate to
   bypass the deny rule. Report the block back to the orchestrator with the
   exact command text. The deny-list is a deliberate boundary, not a matcher
   quirk.

7. **`mkdir` always uses `-p`.** Plain `mkdir <dir>` is not on the allow list —
   only `mkdir -p` is. Writing it forces a prompt, and the command fails anyway
   if the directory already exists. `mkdir -p` is idempotent and matches the
   policy.

8. **Configs and structured text use the `Write` tool, not heredoc.** When the
   agent needs to create a JSON, YAML, TOML, or `.env`-style file, it goes
   through the `Write` tool rather than `cat > file <<'EOF' ... EOF`. Two
   reasons: (a) the Write path matches `Write(.claude/tmp/**)` and
   `Write(**/.claude/tmp/**)` directly, while heredoc goes through the Bash
   matcher, and (b) heredocs containing `{`, `}`, or `"` trigger Claude Code's
   expansion-obfuscation heuristic (visible as the rejection reason _"Contains
   brace with quote character"_). Even otherwise-allowed paths prompt under that
   heuristic. The Write tool sidesteps the heuristic entirely. Heredoc is only
   acceptable for plain text without braces or quotes — and even then, Write is
   preferred for consistency.

9. **Use Unix shell syntax in Bash, not Windows cmd syntax.** GitBash on Windows
   runs Bash, not cmd. Use `2>/dev/null` (not `2>NUL`), forward-slash paths (not
   backslash), and POSIX-style command substitution. Backslashes and
   `NUL`-redirection happen to work in some contexts but interact poorly with
   the matcher and obscure intent for a future maintainer on macOS or Linux.

## Why This Matters

These rules exist because Claude Code's matcher is documented to split compound
commands but, as of `2.1.x`, has known edge cases around quoted paths, certain
operators, and Windows path semantics that produce false prompts even on
individually-allowed segments. The construction discipline above sidesteps the
matcher's weak spots rather than relying on them.

For the full catalogue of allow/deny/ask patterns and the matcher mechanics they
encode, see
[`docs/reference/claude-permissions.md`](../../../docs/reference/claude-permissions.md).
