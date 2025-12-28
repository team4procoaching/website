# Team 4 Pro Coaching Website

[![Link Check](https://github.com/team4procoaching/website/actions/workflows/links.yml/badge.svg)](https://github.com/team4procoaching/website/actions/workflows/links.yml)
[![Semgrep](https://github.com/team4procoaching/website/actions/workflows/semgrep.yml/badge.svg)](https://github.com/team4procoaching/website/actions/workflows/semgrep.yml)

Official website for Team 4 Pro Coaching, built with
[Astro](https://astro.build).

## 🚀 Quick Start

### Prerequisites

- **Node.js**: managed via `.nvmrc` _Use `nvm use` to automatically switch to
  the correct version._
- **pnpm**: managed via Corepack (see `package.json` engines)
- **Git**: For version control

### Setup in 5 Minutes

```bash
# 1. Clone the repository
git clone https://github.com/team4procoaching/website.git
cd website

# 2. Activate correct Node.js version
# This reads from .nvmrc and ensures you are on the exact version required
nvm use

# 3. Enable Corepack to use the pinned pnpm version
corepack enable

# 4. Install dependencies
# Thanks to .npmrc, this strictly checks your Node/pnpm versions
pnpm install

# 5. Setup Git hooks (Husky)
pnpm prepare

# 6. Start development server
pnpm dev
```

The site will be available at `http://localhost:4321`

---

## 📦 Available Scripts

| Script                                | Description                                                                |
| :------------------------------------ | :------------------------------------------------------------------------- |
| **Development**                       |                                                                            |
| `pnpm dev`                            | Starts the development server with hot-reloading.                          |
| `pnpm build`                          | Builds the optimized production site.                                      |
| `pnpm preview`                        | Previews the production build locally.                                     |
| **Quality Assurance (Main Commands)** |                                                                            |
| `pnpm check`                          | Runs **all** static checks (Types, Linting, Format-Check). _Ideal for CI._ |
| `pnpm fix`                            | Runs **all** auto-fixes (Lint-Fix, Format-Write).                          |
| **Granular Checks**                   |                                                                            |
| `pnpm typecheck`                      | Runs TypeScript type checking (`astro check`).                             |
| `pnpm lint`                           | Checks for code quality issues using Biome (Read-only).                    |
| `pnpm format:check`                   | Checks if code is formatted correctly (Biome & Prettier).                  |
| **Granular Fixes**                    |                                                                            |
| `pnpm format`                         | Formats all code and saves changes (Biome & Prettier).                     |
| `pnpm lint:fix`                       | Auto-fixes linting issues using Biome.                                     |
| `pnpm organize-imports`               | Sorts and organizes imports explicitly.                                    |
| **Utilities**                         |                                                                            |
| `pnpm validate:renovate`              | Validates the Renovate Bot configuration.                                  |
| `pnpm prepare`                        | Installs Git hooks (Husky).                                                |

---

## 🏗️ Tech Stack

- **Framework**: [Astro](https://astro.build) - Static Site Generator
- **Package Manager**: [pnpm](https://pnpm.io)
- **Code Quality**: [Biome](https://biomejs.dev) (JS/TS/CSS) &
  [Prettier](https://prettier.io) (Astro/Markdown)
- **Git Hooks**: [Husky](https://typicode.github.io/husky/) +
  [lint-staged](https://github.com/lint-staged/lint-staged)
- **Commit Convention**:
  [Conventional Commits](https://www.conventionalcommits.org/)
- **Deployment**: [Netlify](https://www.netlify.com)

---

## 🔒 Quality & Security

This project maintains high code quality and security standards through
automated workflows and policies::

- **Security Scanning:** [Semgrep](https://semgrep.dev/),
  [GitGuardian](https://www.gitguardian.com/), [Socket.dev](https://socket.dev/)
- **Link Validation:** Automated link checking on all commits
- **Secret Detection:** [Gitleaks](https://github.com/gitleaks/gitleaks)
  (pre-commit) & [GitGuardian](https://www.gitguardian.com/) (CI)
- **Dependency Updates:** [Renovate](https://docs.renovatebot.com/) (automated
  PRs)
- **Signed Commits:**
  [Required](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)
  for all pull requests

### CI/CD Pipeline

All pull requests and commits to `main` are automatically checked for:

> ✅ Security vulnerabilities (Semgrep)  
> ✅ Broken links  
> ✅ Exposed secrets (GitGuardian)  
> ✅ Supply chain security (Socket.dev)

**Scheduled Scans**:

- [Link Check](.github/workflows/links.yml): Mondays at 02:00 UTC
- [Semgrep](.github/workflows/semgrep.yml): Mondays at 04:30 UTC

---

## 📖 Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Detailed development workflow
  and conventions
- **[Architecture Overview](docs/ARCHITECTURE.md)** - Technical decisions and
  tool choices
- **[Maintenance Guide](docs/MAINTENANCE.md)** - Keeping the project up-to-date
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to this
  project
- **[ADRs](docs/adr/)** - Architecture Decision Records

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of
conduct and the process for submitting pull requests.

### Key Conventions

- **Commits**: Follow
  [Conventional Commits](https://www.conventionalcommits.org/) with scope
  ```
  feat(navigation): add mobile menu
  fix(footer): correct social media links
  docs(readme): update setup instructions
  ```
- **Branches**: Create feature branches from `main`
- **Pull Requests**: Require signed commits and passing all CI checks
- **Code Style**: Auto-formatted via pre-commit hooks

---

## 📝 Editor Setup

**Recommended**: Visual Studio Code with these extensions:

- Astro (`astro-build.astro-vscode`)
- Biome (`biomejs.biome`)
- Prettier (`esbenp.prettier-vscode`)

Extensions are automatically suggested when opening the project in VS Code.

---

## 🔧 Troubleshooting

### pnpm not found

If `pnpm` is not recognized, enable Corepack (included with Node.js 16.9+):

```bash
corepack enable
corepack prepare pnpm@10.26.1 --activate
```

### Git hooks not working

If pre-commit hooks aren't running, reinstall Husky:

```bash
pnpm prepare
```

### Commit rejected by commitlint

Ensure your commit message follows Conventional Commits format with scope:

```bash
# ✅ Good
feat(hero): add background image
fix(contact): correct email validation

# ❌ Bad
added new feature
Fixed bug
```
