# CSP Strategy: Hash-Based Allow-List for Inline Scripts and Styles

Date: 2026-04-19

## Status

Accepted

## Context

The site is deployed as pure static HTML to Netlify, with a
Content-Security-Policy applied via HTTP response header (configured in
`netlify.toml`). The policy restricts script and style sources, and the baseline
policy used only `'self'` for `script-src` and
`'self' https://fonts.googleapis.com` for `style-src` — no nonce, no hash, no
`unsafe-inline`.

The build output, however, contains inline `<script>` and `<style>` blocks that
the baseline policy would block in production:

- Astro's ClientRouter and hydration machinery emit inline scripts for
  view-transition coordination and component hydration markers.
- A flash-mitigation inline script in `src/pages/services/index.astro` runs
  before the main controller to avoid a visible re-render when the services page
  is entered with a deep-link category filter (see ADR-0020 for the `is:inline`
  policy).
- The build emits an inline `<style>` block on the landing page.

Allowing these via `'unsafe-inline'` would defeat the primary value of having a
CSP at all: an attacker who injects `<script>alert('pwn')</script>` into any
user-controlled field (URL, error page, form reflection) would have their script
executed. Pre-Launch this risk is acceptable to nobody, so a mechanism was
needed that allow-lists exactly the inline blocks we ship and no others.

The CSP specification defines three mechanisms for this:

1. **Nonce-based allow-list.** Server generates a random nonce per response,
   emits it on every allowed `<script nonce="…">`, and includes `'nonce-…'` in
   the CSP header. Requires server-side rendering or an edge function to inject
   the nonce.
2. **Hash-based allow-list.** Every allowed inline block's SHA-256 hash is
   listed in the CSP as `'sha256-…'`; the browser hashes each inline block at
   load time and checks membership. Static — the hashes can be computed at build
   time.
3. **Astro-native CSP.** `security.csp: true` in `astro.config.mjs` produces a
   hash-based CSP automatically, injected as a `<meta>` tag.

Astro-native CSP is the path of least resistance. It was rejected:
`security.csp: true` is documented as incompatible with `<ClientRouter />` (the
router replaces DOM nodes during view transitions, and
`<meta http-equiv="Content-Security-Policy">` tags are not honored after the
initial parse). Removing ClientRouter is a separate, larger decision tracked as
ADR-0031 (deferred). With ClientRouter retained, Astro-native CSP is not an
option until that decision is made.

Nonce-based CSP is technically sound but requires SSR or an edge function; this
project is pure static generation (ADR-0022). Introducing SSR for nonce
injection alone is disproportionate.

Hash-based CSP via post-build processing is the remaining option.

## Decision

A post-build script (`scripts/generate-csp-hashes.mjs`) scans `dist/**/*.html`
for inline `<script>` and `<style>` blocks, computes SHA-256 hashes of each
block's body, deduplicates, and rewrites the `script-src` and `style-src`
directives in `netlify.toml` to include the resulting `'sha256-…'` tokens.

The script runs as an `astro:build:done` hook registered by a small
project-owned Astro integration in `astro.config.mjs` (see the "Alternatives
considered" section for why project-owned rather than a third-party package).

### Invariants

1. **The committed `netlify.toml` matches build output.** A CI workflow
   (`.github/workflows/csp-drift.yml`) runs `pnpm run build` and fails with
   `git diff --exit-code netlify.toml` if the committed file is stale. Three
   drift scenarios are caught: inline-block change without rebuild, manual
   `netlify.toml` edit, misresolved merge conflict.

2. **Hash ordering is deterministic.** The script sorts hashes alphabetically
   before writing, so PR diffs only appear when the underlying inline blocks
   actually change — not when the traversal order of `dist/` changes across
   platforms.

3. **Re-running the script is a no-op when up to date.** Existing `'sha256-…'`
   tokens are stripped from the CSP string before the new set is inserted, so
   running against a current `netlify.toml` produces byte-identical output.

### Skip rules (what does not get hashed)

- `<script src="…">` — external, covered by `'self'`.
- `<script type="application/ld+json">` — not script execution, does not fall
  under `script-src`.
- Inline style attributes (`<div style="…">`) — the current build emits none;
  see "Known limitations" below.

## Consequences

### Positive

- **Strict CSP without `'unsafe-inline'` regression.** The flash-mitigation
  script and Astro hydration blocks run in production as intended; any injected
  inline script is blocked.
- **Hash maintenance is automatic.** A developer changing a hashed block only
  needs to run `pnpm run build` and commit the updated `netlify.toml` — the CI
  drift-check makes forgetting visible before merge.
- **Visibility in PR review.** CSP hashes are a security-relevant artifact;
  committing them means every hash change shows up in the diff and is subject to
  peer review rather than silently generated at deploy time.

### Negative

- **PR diff noise.** Any inline-block change rotates its hash, adding one or two
  lines of `netlify.toml` churn to the PR. Acceptable tradeoff against the
  review visibility above.
- **Local and Netlify builds must produce identical HTML.** If a build-time
  environment variable or platform-specific output causes the two to diverge,
  the drift check will fail on Netlify deploys. Current build is deterministic
  with respect to these; a regression would surface as a CI failure rather than
  a production outage.
- **Build time.** SHA-256 over ~15 small inline blocks across 9 pages is <100ms
  — negligible.

## Alternatives considered

**Astro-native CSP (`security.csp: true`).** Rejected: incompatible with
`<ClientRouter />` (Astro docs and issue tracker both note this). Would require
removing ClientRouter (see ADR-0031, deferred). If ADR-0031 is later accepted,
this ADR's strategy is expected to be superseded: Astro's native CSP produces an
equivalent hash-based policy and removes the post-build script from the
toolchain.

**`'unsafe-inline'` for `script-src` and `style-src`.** Rejected: negates the
security benefit of having a CSP. A reflected-XSS or stored-XSS vector anywhere
on the site would be executable.

**Nonce-based CSP.** Rejected: requires SSR or an edge function to inject a
per-request nonce. This project is pure static generation (ADR-0022);
introducing SSR or Netlify Edge Functions solely for nonce injection is
disproportionate.

**Third-party integration (e.g. `astro-integration-csp-hash`).** Rejected in
favor of a project-owned implementation. The rationale is threefold:

1. _Proportionality._ The implementation is ~200 LoC of Node standard library
   (`fs`, `crypto`, a handful of regexes). A third-party package for a surface
   this small adds Renovate activity, Socket.dev scans (ADR-0005), and
   vendoring-fallback documentation without a corresponding complexity payoff.

2. _Astro major-version resilience._ Third-party Astro integrations tend to
   break at Astro major bumps (integration API surface changes). The
   project-owned hook uses only two surface points: the `astro:build:done` hook
   signature and the `logger` shape. `fs`/`crypto` are stable across Node
   versions and entirely independent of Astro.

3. _Solo-maintenance context._ The project is pre-Launch and moving toward
   minimal post-Launch maintenance surface. A self-contained ~200-LoC module
   that never needs updates fits that goal better than a package whose release
   cadence must be monitored.

If this rationale inverts in the future — for example, a well-maintained
integration package gains features (CSP report-URI automation, nonce/hash hybrid
mode, form-action hashing) that are non-trivial to reimplement — a swap is a
localized refactor: remove the helper + integration, install the package, delete
the CI workflow if the package bundles equivalent drift detection.

## Known limitations

- **Regex-based HTML parsing.** The script uses regexes to locate `<script>` and
  `<style>` blocks rather than a full HTML parser. This is safe for the current
  Astro output — the emitted inline blocks are simple and contain no template
  literals with `</script>` or `</style>` fragments that could fool the
  non-greedy match. If a future inline script introduces template literals
  containing those close-tag strings, the parser would close prematurely and
  mis-hash, causing a CSP violation in the deploy preview. The mitigation is a
  swap to `node-html-parser` or `parse5` — a single-file change, contained.

- **Inline style attributes (`<div style="…">`).** Not currently emitted. If
  they appear later (dynamic Tailwind tokens, third-party components that inject
  style attributes), CSP will require `'unsafe-hashes'` plus per-value hashes.
  The current script does not produce these. A failure surfaces as a browser CSP
  violation on deploy-preview, not silently.

## Scope

Applies to every production build deployed to Netlify. Dev server (`astro dev` /
`netlify dev`) runs without the CSP header, so the integration's effect is
invisible locally except for the updated `netlify.toml` file.

## Related ADRs

- [ADR-0005](0005-adopt-renovate-for-automated-dependency-management.md) —
  dependency-management policy referenced in the self-build rationale.
- [ADR-0006](0006-enforce-strict-environment-and-dependency-pinning.md) — strict
  pinning policy that would apply to any third-party integration.
- [ADR-0020](0020-client-side-script-strategy-revised.md) — the `is:inline`
  policy whose flash-mitigation script is one of the hashed inline blocks; this
  ADR covers the CSP treatment.
- [ADR-0022](0022-hybrid-rendering-model.md) — the pure-static- generation
  decision that rules out nonce-based CSP.
- [ADR-0031](0031-migration-to-native-view-transitions.md) — deferred evaluation
  of removing `<ClientRouter />`. If accepted, the hash-based strategy in this
  ADR can be replaced by Astro-native CSP (`security.csp: true`), and the
  post-build script becomes obsolete.
