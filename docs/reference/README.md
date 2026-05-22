# Reference Documentation

In-depth documentation for individual tools and subsystems. Each file explains
the configuration, behaviour, and operational detail of one tool or system — the
kind of detail that would overload the top-level guides. The task-first guides
(`docs/CONVENTIONS.md`, `docs/DEVELOPMENT.md`, `docs/MAINTENANCE.md`) link here
when a contributor needs the full picture.

## Contents

| File                    | Purpose                                                             | When to read                                                    |
| :---------------------- | :------------------------------------------------------------------ | :-------------------------------------------------------------- |
| `animation-system.md`   | Scroll-reveal, hover, and special-animation system                  | When adding or changing animated elements                       |
| `biome.md`              | Biome linter/formatter configuration and known limitations          | When adjusting lint/format rules or diagnosing Biome behaviour  |
| `claude-permissions.md` | Claude Code permission policy — allow/deny/ask patterns and matcher | When changing `.claude/settings.json` or debugging a prompt     |
| `color-system.md`       | Colour tokens, surface system, and contrast rules                   | When working with section backgrounds or adding colour tokens   |
| `commitlint.md`         | commitlint configuration and the Conventional Commits ruleset       | When a commit is rejected or the commit ruleset changes         |
| `renovate.md`           | Renovate Bot configuration and dependency-update workflow           | When adjusting dependency automation or reviewing a Renovate PR |
