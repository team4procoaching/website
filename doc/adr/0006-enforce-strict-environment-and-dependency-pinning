# Enforce Strict Environment and Dependency Pinning

Date: 2025-12-23

## Status

Accepted

## Context

I am developing an Astro-based web application as a solo developer with a
background in strictly typed languages (Java/Go). The application is deployed
via Netlify using `pnpm`.

Although I am currently the sole contributor, the project faces the following
stability and maintenance challenges common in the JavaScript ecosystem:

1.  **Environment Drift:** There is a risk that the local development
    environment (Node.js version, pnpm version) differs from the Netlify build
    environment, leading to "works on my machine" deployment failures.
2.  **Implicit Versioning:** The default behavior of `pnpm` (using `^` ranges)
    and Netlify (using default Node versions if unspecified) relies on implicit
    resolution, which contradicts the principle of deterministic builds.
3.  **Infrastructure as Code:** Since I do not have access to the Netlify UI,
    the entire build configuration must be explicitly defined in version
    control.

I require a strategy that ensures mathematically deterministic builds across all
environments, treating the runtime configuration with the same rigor as compiled
code.

## Decision

I decide to enforce a **Strict Environment and Exact Versioning Strategy**. I
will configure the tooling to fail fast rather than guess, and explicitly pin
all versions.

**Implementation Details:**

1.  **Strict Package Management (.npmrc):**
    - `engine-strict=true`: Installation will fail immediately if the running
      Node.js version does not match the `engines` field in `package.json`.
    - `save-exact=true`: Dependencies added via CLI are saved with exact version
      numbers (no `^` or `~`), ensuring the exact same bytes are installed in
      CI.
    - `auto-install-peers=true`: Simplifies dependency management for Astro
      integrations.

2.  **Explicit Toolchain Versions (package.json & .nvmrc):**
    - **Node.js:** The canonical version is defined in `.nvmrc` (e.g.,
      `20.12.0`). Netlify reads this automatically.
    - **pnpm:** The exact version is defined via the `packageManager` field in
      `package.json` (e.g., `"packageManager": "pnpm@9.15.0"`). This triggers
      Node's Corepack to use the correct binary on Netlify.

3.  **Deployment Configuration (netlify.toml):**
    - Build commands (`command`, `publish`) are explicitly defined, not
      inferred.
    - The `ignore` script is updated to trigger new builds not just on code
      changes, but also on changes to `.nvmrc`, `.npmrc`, `package.json`, or
      `netlify.toml`.

4.  **Automated Updates:**
    - Dependency updates are managed exclusively via **RenovateBot** using the
      `bump` range strategy. This maintains the "exact version" policy while
      automating the upgrade process via Pull Requests.

### Scope and Non-Goals

**In Scope:**

- Configuration of the local development runtime.
- Configuration of the Netlify build pipeline via configuration files.
- Strategy for adding and updating direct project dependencies.

**Out of Scope:**

- OS-level dependencies (Netlify's underlying Linux distribution), assumed to be
  compatible.

## Consequences

### Positive

- **Deterministic Builds:** If the code builds locally, it is virtually
  guaranteed to build on Netlify, as the toolchain versions (Node & pnpm) and
  dependency tree are identical.
- **Java/Go-like Stability:** Brings the stability and predictability of
  compiled language build systems to this project.
- **Infrastructure as Documentation:** The build process is fully transparent in
  the code (`netlify.toml`, `.npmrc`), requiring no knowledge of external UI
  settings.

### Negative

- **Rigid Upgrades:** Upgrading Node.js is a multi-step process involving edits
  to `.nvmrc` and `package.json`.
- **Developer Friction:** I cannot simply run `pnpm install` on a machine with
  an outdated Node version; I am forced to switch to the correct version first.

### Risk Mitigation

- **Renovate Configuration:** To balance the manual effort of strict pinning,
  Renovate is configured to automatically propose updates.
- **Netlify Ignore Logic:** The custom ignore script in `netlify.toml` prevents
  missed deployments when only configuration files (like `.nvmrc`) change.

## Success Criteria

- **Green Builds:** Netlify deployments succeed without manual intervention or
  environment variable overrides.
- **Version Parity:** The output of `node -v` and `pnpm -v` is identical in the
  local terminal and the Netlify build logs.
- **Traceability:** Every dependency change is traceable to a specific commit
  managed by Renovate.

## References

- [pnpm .npmrc configuration](https://pnpm.io/npmrc)
- [Netlify: Managing Node.js versions](https://docs.netlify.com/configure-builds/manage-dependencies/#node-js-and-javascript)
- [Node.js Corepack](https://nodejs.org/api/corepack.html)
