# Team 4 Pro Coaching Website

[![Link Check](https://github.com/team4procoaching/website/actions/workflows/links.yml/badge.svg)](https://github.com/team4procoaching/website/actions/workflows/links.yml)
[![Semgrep](https://github.com/team4procoaching/website/actions/workflows/semgrep.yml/badge.svg)](https://github.com/team4procoaching/website/actions/workflows/semgrep.yml)

Official website for Team 4 Pro Coaching, built with
[Astro](https://astro.build). For architecture, design system, and technical
decisions, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Quick Start

```bash
# Clone and enter
git clone https://github.com/team4procoaching/website.git
cd website

# Setup environment (Node 24.12.0 required)
nvm use && corepack enable

# Install and run
pnpm install && pnpm prepare && pnpm dev
```

The site will be available at `http://localhost:4321`.

This project enforces strict version pinning. Node.js must be exactly `24.12.0`.
See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed setup and
troubleshooting.

---

## Essential Commands

| Command      | Description                                  |
| :----------- | :------------------------------------------- |
| `pnpm dev`   | Start development server with hot-reload     |
| `pnpm build` | Build optimized production site              |
| `pnpm check` | Run all quality checks (Types, Lint, Format) |
| `pnpm fix`   | Auto-fix linting and formatting issues       |

Full command reference: [DEVELOPMENT.md](docs/DEVELOPMENT.md)

---

## Quality and Security

All pull requests are automatically validated:

- Security vulnerabilities (Semgrep SAST)
- Broken links (Lychee)
- Exposed secrets (GitGuardian)
- Supply chain risks (Socket.dev)
- Code quality (Biome, TypeScript)

Scheduled scans run Mondays:
[Link Check](https://github.com/team4procoaching/website/actions/workflows/links.yml)
at 02:00 UTC,
[Semgrep](https://github.com/team4procoaching/website/actions/workflows/semgrep.yml)
at 04:30 UTC.

---

## Editor Setup

Recommended: VS Code with suggested extensions (auto-prompted on open): Astro,
Biome, Prettier, Tailwind CSS IntelliSense. See
[DEVELOPMENT.md](docs/DEVELOPMENT.md) for configuration details.

---

## Contributing

Three non-negotiable rules for every change:

1. **Conventional Commits with scope** — validated by commitlint hook
2. **Signed commits** (GPG or SSH) — unsigned commits are rejected
3. **All CI checks pass** — merging is blocked until green

All work is submitted as a PR against `main`. Direct pushes are blocked.

For the full workflow, commit types, and PR process, see
[CONTRIBUTING.md](CONTRIBUTING.md). For environment setup and Git signing, see
[DEVELOPMENT.md](docs/DEVELOPMENT.md).

---

## Documentation

Start with **ARCHITECTURE.md** for the full picture — project structure, design
system, data flows, and all technical decisions. When you are ready to write
code, **CONVENTIONS.md** defines how. **DEVELOPMENT.md** gets your environment
running. **CONTRIBUTING.md** explains how to submit changes (commits, branches,
PRs).

| Document                                | Purpose                                      |
| :-------------------------------------- | :------------------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Project context, architecture, design system |
| [CONVENTIONS.md](docs/CONVENTIONS.md)   | Coding patterns, naming, export style        |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md)   | Setup, tooling, daily workflow               |
| [CONTRIBUTING.md](CONTRIBUTING.md)      | Commits, PRs, code standards                 |

For the complete documentation map (maintenance, decision guides, feature
templates, ADRs, reference docs, AI working instructions), see
[ARCHITECTURE.md → Documentation Map](docs/ARCHITECTURE.md#documentation-map).
