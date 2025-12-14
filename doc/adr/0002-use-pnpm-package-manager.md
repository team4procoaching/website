# Use pnpm as Package Manager

Date: 2025-12-14

## Status

Accepted

## Context

For the new Astro JS project hosted on Netlify, we need to decide on a package manager to handle dependencies. The project requires efficient setup, fast build times, and long-term maintainability.

The default choice with Node.js is **npm**, which is widely known and pre-installed. However, as the project grows, npm often suffers from slower installation times and large disk usage due to its flat `node_modules` structure.

We evaluated **pnpm** as an alternative. Key factors for the decision included:
* **Hosting Environment:** Netlify supports pnpm natively (via `pnpm-lock.yaml` detection) and caches the store effectively.
* **Performance:** Local development speed and CI/CD build duration.
* **Code Hygiene:** Prevention of access to undeclared dependencies.

## Decision

We will use **pnpm** as the exclusive package manager for this project.
We will enforce this decision by committing the `pnpm-lock.yaml` file to the repository and utilizing the `packageManager` field in `package.json` (potentially via Node.js Corepack).

## Consequences

**Positive:**
* **Performance:** Significantly faster dependency installation in both local and CI/CD environments (Netlify) due to the global content-addressable store.
* **Storage Efficiency:** Drastically reduced disk space usage because packages are hard-linked from a global store rather than copied per project.
* **Reliability:** Strict dependency resolution prevents "Phantom Dependencies" (importing packages not explicitly defined in `package.json`), ensuring the application works consistently across different environments.
* **Netlify Integration:** Automatic detection and caching of the pnpm store leads to faster rebuilds on the platform.

**Negative:**
* **Onboarding:** Developers unfamiliar with pnpm need to perform a one-time setup (e.g., `corepack enable` or `npm install -g pnpm`) and learn strictly declared dependency management.
* **Compatibility:** Very rare edge cases with older packages that rely on the flat `node_modules` structure of npm (hoisting), though this is largely mitigated in the modern ecosystem.
