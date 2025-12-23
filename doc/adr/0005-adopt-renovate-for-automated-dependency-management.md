# Enforce Strict Environment and Dependency Pinning

Date: 2025-12-23

## Status

Accepted

## Context

The project `team4procoaching-website` is based on the Astro framework and is
hosted on Netlify. As a solo developer with a background in statically typed
languages (Java/Go), maintaining a deterministic and reproducible build
environment is a core requirement.

Currently, the project faces risks related to environment inconsistency:

- **Environment Drift:** Discrepancies between the local development environment
  (Node.js/pnpm versions) and the Netlify build environment lead to "works on my
  machine" failures.
- **Implicit Resolution:** Default behaviors of `pnpm` (using `^` ranges) and
  Netlify (inferring versions) contradict the goal of mathematical build
  determinism.
- **Infrastructure Visibility:** Lack of access to the Netlify UI necessitates
  an explicit "Infrastructure as Code" approach for build configuration.

A strategy is required to enforce strict versioning across the entire toolchain
to ensure that if the code builds locally, it is guaranteed to build in
production.

## Decision

We have decided to enforce a **Strict Environment and Exact Versioning
Strategy** by configuring the tooling to fail fast on mismatches and explicitly
pinning all versions.

This strategy is implemented through four core mechanisms:

### 1. Strict Engine Validation

The `.npmrc` file is configured with `engine-strict=true`. This forces `pnpm` to
immediately abort installation if the active Node.js version does not match the
constraints defined in `package.json`. This prevents accidental usage of
incompatible runtimes.

### 2. Exact Dependency Pinning

To eliminate drift within the dependency tree, `save-exact=true` is enabled in
`.npmrc`. All dependencies added via CLI are saved with exact version numbers
(no `^` or `~` prefixes).

This ensures that the `package.json` acts as a precise manifest, installing the
exact same bytes in CI as in development.

### 3. Toolchain Canonicalization

The toolchain versions are explicitly defined to leverage Node.js Corepack and
Netlify's native support:

- **Node.js:** The canonical version is defined in `.nvmrc` (e.g., `20.12.0`).
- **Package Manager:** The exact `pnpm` version is pinned via the
  `packageManager` field in `package.json` (e.g., `pnpm@9.15.0`).

### 4. Explicit Deployment Configuration

The build pipeline is defined as code in `netlify.toml` rather than relying on
auto-detection. This includes:

- Explicit `command` and `publish` directory definitions.
- A strict `ignore` script that triggers builds not only on code changes but
  also on configuration changes (e.g., updates to `.nvmrc`, `.npmrc`, or
  `package.json`).

### Scope and Non-Goals

**In Scope:**

- Local development runtime configuration
- Netlify build pipeline configuration (Infrastructure as Code)
- Direct dependency management strategy

**Out of Scope:**

- OS-level dependencies (Netlify's underlying Linux distribution)

## Consequences

### Positive

- **Deterministic Builds:** The build process is mathematically reproducible
  across environments; version drift is structurally impossible.
- **Java/Go-like Stability:** Applies the rigor of compiled language build
  systems to the JavaScript ecosystem.
- **Infrastructure Transparency:** The entire build logic is visible in the
  repository (`netlify.toml`, `.npmrc`), requiring no knowledge of external UI
  settings.
- **Renovate Synergy:** Works seamlessly with the existing Renovate "bump"
  strategy to manage exact version updates via Pull Requests.

### Negative

- **Rigid Upgrades:** Upgrading Node.js requires synchronized edits to `.nvmrc`
  and `package.json`.
- **Developer Friction:** Developers cannot run `pnpm install` on a machine with
  an outdated Node version without switching versions first.
- **Strictness Overhead:** Quick experiments with different runtime versions
  require explicit configuration overrides.

### Risk Mitigation

- **Renovate Automation:** Renovate is configured to automatically propose
  updates for pinned dependencies, mitigating the manual effort of `save-exact`.
- **Netlify Ignore Logic:** The custom ignore script ensures that toolchain
  updates (e.g., Node version bump) correctly trigger a new deployment.

## Success Criteria

- **Green Builds:** Netlify deployments succeed consistently without manual
  intervention or environment variable overrides.
- **Version Parity:** The output of `node -v` and `pnpm -v` is identical in the
  local terminal and the Netlify build logs.
- **Auditability:** Every dependency change is traceable to a specific commit
  managed by Renovate.

## References

- [pnpm Docs: .npmrc configuration](https://pnpm.io/npmrc)
- [Netlify Docs: Managing Node.js versions](https://docs.netlify.com/configure-builds/manage-dependencies/#node-js-and-javascript)
- [Node.js Docs: Corepack](https://nodejs.org/api/corepack.html)
