---
name: ephemeral-workspace
description:
  Use when an agent needs a temporary file — jscpd snapshots, exported diffs,
  comparison fixtures, scratch outputs, commit-message drafts. Triggers on any
  write to a scratch path, on the choice between a worktree path and a system
  path, and before redirecting command output to a non-source file.
---

# Ephemeral Workspace

## Overview

Agents that need temporary files (jscpd snapshots, exported diffs, comparison
fixtures, scratch outputs) write them to `<worktree-root>/.claude/tmp/`,
**never** to `/tmp`, `C:/tmp`, `~/tmp`, or any system-level scratch path.

**Core principle:** scratch state belongs inside the worktree it serves, so it
is session-isolated, auto-cleaned, visible, and cross-platform-consistent.

## When to Use

Apply this discipline whenever you are about to create a file that is not part
of the deliverable, and especially when any of these are true:

- The file is a jscpd snapshot, an exported diff, a comparison fixture, or any
  scratch output.
- The file is a commit-message draft awaiting `commitlint` validation.
- You are about to redirect a command's output to a file.
- You are choosing between a worktree-relative path and a system path like
  `/tmp` or `C:/tmp`.

## Why a Worktree-Local Path

1. **Worktree isolation.** Each worktree under `.claude/worktrees/<name>/` has
   its own `.claude/tmp/`. Parallel Claude sessions in different worktrees
   cannot collide on the same filename. System paths like `C:/tmp` are not
   session-isolated and silently overwrite each other — the second session's
   diff snapshot overwrites the first's mid-evaluation, producing data loss
   without any error.
2. **Automatic cleanup.** When the worktree is removed after PR merge, the tmp
   files go with it. No orphan state, no manual sweep of system directories.
3. **Visibility.** The project owner sees what the agent produced, in the same
   tree as the rest of the work. System paths are out-of-sight.
4. **Cross-platform consistency.** Works identically on Windows, macOS, Linux.
   No `C:/tmp` vs. `/tmp` divergence in agent output.

`.claude/tmp/` is gitignored. It does not exist by default — the agent creates
it on demand with `mkdir -p .claude/tmp/<subdir>`. There is no `.gitkeep`: the
directory's existence carries no meaning beyond its contents, and an empty tmp
dir need not survive in version control.

## Allowed Operations

Allowed operations on `.claude/tmp/`:

- `mkdir -p .claude/tmp/<subdir>` — always with `-p`, never plain `mkdir`.
- `cp <source> .claude/tmp/<name>` and `cp -r <source> .claude/tmp/<name>`.
- Output redirects: `<command> > .claude/tmp/<name>` and
  `<command> >> .claude/tmp/<name>`.
- Plain `rm .claude/tmp/<file>` for single-file removal.
- `Write` and `Edit` tool calls into `.claude/tmp/**`.

Bulk cleanup of the tmp directory (`rm -rf .claude/tmp/*` and similar) is denied
by `.claude/settings.json` to prevent flight-pattern bypasses (e.g.,
`rm -rf .claude/tmp/../<important>`). Sweeping the tmp directory is the project
owner's responsibility, not the agent's. Most of the time it sweeps itself when
the worktree is removed.

## Path Construction

When constructing a redirect to an ephemeral file, the path is relative to the
current working directory. The agent does not formulate `C:/...` or `/...` for
tmp paths.

**The project owner runs Claude Code in the main project root, with feature
worktrees registered via `--add-dir`.** From this CWD, the worktree-local tmp
directory is at `.claude/worktrees/<worktree-name>/.claude/tmp/<...>`, not
`.claude/tmp/<...>`. The matcher is configured for both forms — the relative
`.claude/tmp/**` pattern for the rare case Claude Code is started inside a
worktree, and the broader `**/.claude/tmp/**` pattern for the default Main-CWD
case. Either path style is matched; absolute paths (`C:/.../.claude/tmp/...`)
are not, and prompt unnecessarily.

**Main-project-direct tmp is also legitimate.** When the work is not bound to a
feature worktree (pre-Phase-1 research, cross-stream notes, ad-hoc exploration
that does not belong to any task-id), the tmp directory at
`<main-project-root>/.claude/tmp/<...>` is the right home. The matcher covers it
via the same `.claude/tmp/**` and `**/.claude/tmp/**` patterns; the gitignore
covers it via the `.claude/tmp/` line. The hygiene rules (no parallel session
collision, no orphan state, no system-path use) apply identically. The only
difference is that main-project tmp does not auto-clean when the worktree is
removed — the project owner is responsible for sweeping it manually if it
accumulates.

The same applies to `cp` source paths: the source can be anywhere in the project
tree, but the destination is always one of the matched tmp forms.

## Why This Matters

Pattern shapes and rationale for the `.claude/tmp/` and `.claude/work/` allow
rules are documented in
[`docs/reference/claude-permissions.md`](../../../docs/reference/claude-permissions.md)
§ Allow-List Rationale.
