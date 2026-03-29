# Team 4 Pro Coaching Website

[![Link Check](https://github.com/team4procoaching/website/actions/workflows/links.yml/badge.svg)](https://github.com/team4procoaching/website/actions/workflows/links.yml)
[![Semgrep](https://github.com/team4procoaching/website/actions/workflows/semgrep.yml/badge.svg)](https://github.com/team4procoaching/website/actions/workflows/semgrep.yml)

Official website for Team 4 Pro Coaching, built with
[Astro](https://astro.build).

## 🚀 Quick Start

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

> ⚠️ **Version Requirements**: This project enforces strict version pinning.
> Node.js must be exactly `24.12.0`. See
> [DEVELOPMENT.md](docs/DEVELOPMENT.md#-prerequisites) for detailed setup.

---

## 📦 Essential Commands

| Command      | Description                                  |
| :----------- | :------------------------------------------- |
| `pnpm dev`   | Start development server with hot-reload     |
| `pnpm build` | Build optimized production site              |
| `pnpm check` | Run all quality checks (Types, Lint, Format) |
| `pnpm fix`   | Auto-fix linting and formatting issues       |

Full command reference:
[DEVELOPMENT.md → Available Scripts](docs/DEVELOPMENT.md#-available-scripts)

---

## 🗂️ Project Structure

```text
src/
├── components/      # UI Components (.astro)
│   ├── layout/      #   Layout helper fragments (BaseHead, SEO)
│   ├── navigation/  #   Navigation (Header, menus, NavLink)
│   ├── sections/    #   Page sections (Hero, Features, etc.)
│   └── ui/          #   Reusable primitives (Button, Logo, etc.)
├── data/            # Typed data modules — structured business data and config (ADR-0011)
├── layouts/         # Page wrappers (BaseLayout)
├── types/           # Shared TypeScript types (ImageSource, ImageProp, etc.)
├── utils/           # Utility functions (slugify, etc.)
├── pages/           # File-based routing
└── styles/          # Global CSS (Tailwind directives)
```

---

## 🏗️ Tech Stack

| Category         | Technology                                                      |
| :--------------- | :-------------------------------------------------------------- |
| **Framework**    | [Astro](https://astro.build) (Static Site Generator)            |
| **Styling**      | [Tailwind CSS](https://tailwindcss.com) (Utility-First)         |
| **Code Quality** | [Biome](https://biomejs.dev) + [Prettier](https://prettier.io)  |
| **Package Mgr**  | [pnpm](https://pnpm.io) (via Corepack)                          |
| **Deployment**   | [Netlify](https://www.netlify.com) (Free tier, Deploy Previews) |
| **Security**     | Semgrep, GitGuardian, Socket.dev, Gitleaks                      |
| **Dependencies** | [Renovate](https://docs.renovatebot.com/) (Automated PRs)       |

---

## 🔒 Quality & Security

All pull requests are automatically validated:

- ✅ Security vulnerabilities (Semgrep SAST)
- ✅ Broken links (Lychee)
- ✅ Exposed secrets (GitGuardian)
- ✅ Supply chain risks (Socket.dev)
- ✅ Code quality (Biome, TypeScript)

**Scheduled Scans** (Mondays):
[Link Check](https://github.com/team4procoaching/website/actions/workflows/links.yml)
at 02:00 UTC •
[Semgrep](https://github.com/team4procoaching/website/actions/workflows/semgrep.yml)
at 04:30 UTC

---

## 📖 Documentation

| Document                                    | Purpose                                         |
| :------------------------------------------ | :---------------------------------------------- |
| **[DEVELOPMENT.md](docs/DEVELOPMENT.md)**   | Setup, tooling, daily workflow, troubleshooting |
| **[CONTRIBUTING.md](CONTRIBUTING.md)**      | Commit convention, PR process, code standards   |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Technical decisions, system design, ADR index   |
| **[MAINTENANCE.md](docs/MAINTENANCE.md)**   | Dependency updates, security ops, emergencies   |
| **[ADRs](docs/adr/)**                       | Architecture Decision Records                   |

### Reference Documentation

| Document                                      | Purpose                             |
| :-------------------------------------------- | :---------------------------------- |
| **[biome.md](docs/reference/biome.md)**       | Linting rules and code style config |
| **[renovate.md](docs/reference/renovate.md)** | Dependency update strategy          |

---

## 🔧 Editor Setup

**Recommended**: VS Code with suggested extensions (auto-prompted on open):

- Astro (`astro-build.astro-vscode`)
- Biome (`biomejs.biome`)
- Prettier (`esbenp.prettier-vscode`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for commit conventions and the PR
process.

**Key Rules**:

- Follow [Conventional Commits](https://www.conventionalcommits.org/) with scope
- All commits must be signed (GPG or SSH)
- All CI checks must pass before merge

---

## ❓ Need Help?

1. **Setup issues**:
   [DEVELOPMENT.md → Troubleshooting](docs/DEVELOPMENT.md#-troubleshooting)
2. **Contribution questions**: [CONTRIBUTING.md](CONTRIBUTING.md)
3. **Production emergencies**:
   [MAINTENANCE.md → Emergency Procedures](docs/MAINTENANCE.md#-emergency-procedures)
4. **General questions**: Create a GitHub Issue with `question` label
