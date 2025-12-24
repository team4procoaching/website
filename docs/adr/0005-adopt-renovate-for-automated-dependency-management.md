# Adoption of RenovateBot for Automated Dependency Management

Date: 2025-12-18

## Status

Accepted

## Context

The project `team4procoaching-website` is based on the Astro framework and is
hosted on GitHub. Dependency management is handled via PNPM.

To keep the codebase secure, stable, and up-to-date, an automated solution for
dependency updates is required. Manual updates are time-consuming and increase
the risk of dependency drift, version mismatches, and conflicts with complex
peer dependencies (especially within the Astro ecosystem).

Two main solutions were evaluated:

1.  **Dependabot** – GitHub’s native dependency update solution
2.  **RenovateBot** – A widely used open-source dependency automation tool
    maintained by Mend

Additionally, there is a strong requirement to:

- mitigate **supply chain attacks** (e.g., malware or compromised npm packages),
- reduce **operational noise** caused by excessive pull requests,
- and ensure controlled, reviewable automation without disrupting the
  development workflow.

Tools such as **Socket.dev** are considered for supply chain security
enforcement.

## Decision

We have decided to adopt **RenovateBot** in combination with the **Socket.dev
GitHub App** as the sole solution for automated dependency management and
security gating.

**Dependabot will not be enabled** for this repository and is explicitly
excluded from dependency updates and security alerting to avoid duplicated
signals and unclear ownership.

Renovate configuration is managed via a `renovate.json` file in the repository
root, implementing the following core strategies:

### 1. Grouping

Related dependencies are bundled into logical update groups (e.g., `astro` core
with `@astrojs/*` integrations, linting and formatting tools). This minimizes
the number of pull requests, prevents version skew, and avoids incompatible
partial upgrades.

### 2. Supply Chain Protection (Stability Days)

All dependency updates are subject to a mandatory **3-day stability period**
before PR creation. This reduces exposure to faulty or malicious day-0 npm
releases and allows the ecosystem (npm, GitHub, Socket.dev) to surface issues.

### 3. Security Override

Known critical security vulnerabilities (CVEs) bypass the stability delay and
generate immediate pull requests.

CVE-based vulnerability handling and supply-chain risk detection are treated as
separate concerns:

- **Renovate** handles version updates and CVE-triggered upgrades.
- **Socket.dev** blocks malicious or compromised packages even if no CVE exists.

### 4. Noise Reduction

To avoid notification fatigue:

- Updates are scheduled **once per week (Monday mornings)**.
- Renovate’s **Dependency Dashboard Issue** is used as the primary control and
  visibility mechanism.

### 5. Automation

Automatic merging (`platformAutomerge`) is enabled for **patch and minor
updates**, provided that:

- all CI checks pass successfully,
- and the Socket.dev security check (“Socket”) passes without findings.

Manual intervention remains possible at any time via the Dependency Dashboard.

### Scope and Non-Goals

**In Scope:**

- JavaScript / npm dependencies managed via PNPM
- GitHub Actions version pinning and updates (via Renovate helpers)

**Out of Scope:**

- Docker image updates
- Non-JavaScript dependencies (excluding GitHub Actions)

## Consequences

### Positive

- **Reduced Noise:** Intelligent grouping and scheduled updates significantly
  reduce PR volume compared to default automation tools.
- **Increased Stability:** Stability days filter out unstable or malicious
  releases before integration.
- **Astro Ecosystem Safety:** Grouping ensures Astro core and integrations are
  upgraded together, preventing build and runtime failures.
- **Transparency:** Renovate PRs provide detailed release notes and merge
  confidence indicators, improving review quality.
- **Supply Chain Security:** Socket.dev acts as a hard security gate, preventing
  malicious dependencies from being merged—even without CVEs.
- **Single Source of Truth:** Renovate is the only system responsible for
  dependency updates and security-related upgrades.

### Negative

- **Initial Complexity:** Renovate requires GitHub App installation and ongoing
  maintenance of a relatively complex `renovate.json`.
- **Systemic Delay:** Non-critical updates are intentionally delayed by at least
  three days.
- **Learning Curve:** Debugging advanced Renovate rules (e.g., regex-based
  grouping) is more complex than simpler tools.
- **Automerge Risk:** Grouped automerge can make root-cause analysis harder if
  regressions occur.

### Risk Mitigation

- CI pipelines and Socket.dev checks act as safeguards before merge.
- In case of post-merge issues, Renovate PRs can be reverted and affected
  dependencies pinned via the Dependency Dashboard.

## Success Criteria

- Average of **≤ 2 dependency-related PRs per week**
- No unreviewed or uncontrolled dependency updates
- No production incidents caused by automated dependency upgrades

## References

- [Renovate Docs: Configuration Options](https://docs.renovatebot.com/configuration-options/)
- [Socket.dev GitHub App](https://socket.dev/)
- [Astro Docs: Updating Dependencies](https://docs.astro.build/en/guides/upgrade-to/v5/)
- [Comparison: Renovate vs Dependabot](https://blog.logrocket.com/manage-dependencies-renovate-vs-dependabot/)
