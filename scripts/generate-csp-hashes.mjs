/**
 * Post-build CSP hash generator.
 *
 * Scans `dist/**\/*.html` for inline `<script>` and `<style>` blocks that the
 * production Content-Security-Policy (in `netlify.toml`) needs to allow-list,
 * computes SHA-256 hashes of each block, and rewrites the `script-src` and
 * `style-src` directives to include `'sha256-…'` tokens for each distinct
 * inline block.
 *
 * Out of scope:
 *   - `<script src="...">` — external scripts, covered by `'self'`
 *   - `<script type="application/ld+json">` — not script execution, does not
 *     fall under `script-src`
 *   - Inline style attributes (`<div style="...">`) — would require
 *     `'unsafe-hashes'` plus per-value hashes; not used in the build output.
 *
 * Idempotency: re-running the script against an already-populated
 * `netlify.toml` produces the same output. Existing `'sha256-…'` tokens in the
 * `script-src`/`style-src` directives are stripped before the new set is
 * inserted.
 *
 * Usage:
 *   node scripts/generate-csp-hashes.mjs            (default: dist, netlify.toml)
 *   node scripts/generate-csp-hashes.mjs --dry-run  (prints diff, no write)
 *
 * See ADR-0030 for the rationale behind hash-based CSP over alternatives.
 */

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Extract inline `<script>` and `<style>` block contents from an HTML string.
 * Skips external scripts (`src="…"`) and JSON-LD scripts
 * (`type="application/ld+json"`), neither of which is covered by `script-src`.
 *
 * @param {string} html
 * @returns {{ scripts: string[], styles: string[] }}
 */
export function extractInlineBlocks(html) {
  const scripts = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1] ?? '';
    const body = match[2] ?? '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/\btype\s*=\s*["']?application\/ld\+json\b/i.test(attrs)) continue;
    scripts.push(body);
  }

  const styles = [];
  for (const match of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) {
    styles.push(match[2] ?? '');
  }

  return { scripts, styles };
}

/**
 * Compute the `'sha256-…'` CSP token for an inline block.
 * The hash is computed over the exact block content (the text between the
 * opening and closing tags, unmodified — whitespace and all).
 *
 * @param {string} content
 * @returns {string} token of the form `'sha256-<base64>'`
 */
export function hashBlock(content) {
  const digest = createHash('sha256').update(content, 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

/**
 * Rewrite the `script-src` and `style-src` directives in a CSP string,
 * stripping existing `'sha256-…'` tokens and appending the provided ones.
 * The hash sets are sorted for deterministic output (PR-diff stability).
 *
 * @param {string} csp                  current Content-Security-Policy value
 * @param {readonly string[]} scriptHashes
 * @param {readonly string[]} styleHashes
 * @returns {string}
 */
export function updateCspDirective(csp, scriptHashes, styleHashes) {
  const sortedScripts = [...scriptHashes].sort((a, b) => a.localeCompare(b));
  const sortedStyles = [...styleHashes].sort((a, b) => a.localeCompare(b));

  return csp
    .replace(/(script-src\s+)([^;]*)/, (_match, prefix, body) => {
      const withoutHashes = body.replace(/\s*'sha256-[^']+'/g, '').trimEnd();
      const hashes = sortedScripts.length > 0 ? ` ${sortedScripts.join(' ')}` : '';
      return `${prefix}${withoutHashes}${hashes}`;
    })
    .replace(/(style-src\s+)([^;]*)/, (_match, prefix, body) => {
      const withoutHashes = body.replace(/\s*'sha256-[^']+'/g, '').trimEnd();
      const hashes = sortedStyles.length > 0 ? ` ${sortedStyles.join(' ')}` : '';
      return `${prefix}${withoutHashes}${hashes}`;
    });
}

/**
 * Update the `Content-Security-Policy = "..."` line in a `netlify.toml`
 * string. Returns the updated content. If the input contains no CSP line, the
 * input is returned unchanged and a warning is logged.
 *
 * @param {string} tomlContent
 * @param {readonly string[]} scriptHashes
 * @param {readonly string[]} styleHashes
 * @param {{ warn: (msg: string) => void }} [logger=console]
 * @returns {string}
 */
export function updateNetlifyToml(tomlContent, scriptHashes, styleHashes, logger = console) {
  const cspLineRegex = /(Content-Security-Policy\s*=\s*")([^"]*)(")/;
  const match = cspLineRegex.exec(tomlContent);
  if (match === null) {
    logger.warn('No Content-Security-Policy line found in netlify.toml — skipping.');
    return tomlContent;
  }
  const [, prefix, oldCsp, suffix] = match;
  const newCsp = updateCspDirective(oldCsp, scriptHashes, styleHashes);
  return tomlContent.replace(cspLineRegex, `${prefix}${newCsp}${suffix}`);
}

// ---------------------------------------------------------------------------
// Filesystem walk
// ---------------------------------------------------------------------------

/**
 * Recursively collect all `.html` files under a directory.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function findHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findHtmlFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(path);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full pipeline: scan `distDir`, compute hashes, update `tomlPath`.
 * Returns true if `tomlPath` was modified, false if already up to date.
 *
 * @param {{
 *   distDir?: string,
 *   tomlPath?: string,
 *   dryRun?: boolean,
 *   logger?: { info: (msg: string) => void, warn: (msg: string) => void },
 * }} [options]
 * @returns {Promise<boolean>}
 */
export async function generateCspHashes(options = {}) {
  const distDir = options.distDir ?? 'dist';
  const tomlPath = options.tomlPath ?? 'netlify.toml';
  const dryRun = options.dryRun ?? false;
  const logger = options.logger ?? console;

  const htmlFiles = await findHtmlFiles(distDir);
  const scriptHashes = new Set();
  const styleHashes = new Set();

  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const { scripts, styles } = extractInlineBlocks(html);
    for (const body of scripts) scriptHashes.add(hashBlock(body));
    for (const body of styles) styleHashes.add(hashBlock(body));
  }

  const toml = await readFile(tomlPath, 'utf8');
  const updated = updateNetlifyToml(toml, [...scriptHashes], [...styleHashes], logger);
  const changed = toml !== updated;

  if (changed && !dryRun) {
    await writeFile(tomlPath, updated);
  }

  let tomlChangeStatus;
  if (!changed) {
    tomlChangeStatus = 'netlify.toml unchanged';
  } else if (dryRun) {
    tomlChangeStatus = 'netlify.toml would change (dry-run)';
  } else {
    tomlChangeStatus = 'netlify.toml updated';
  }

  logger.info(
    `CSP hashes: ${scriptHashes.size} script(s), ${styleHashes.size} style(s) across ${htmlFiles.length} page(s) — ${tomlChangeStatus}.`,
  );

  return changed;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const invokedAsCli =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedAsCli) {
  const dryRun = process.argv.includes('--dry-run');
  generateCspHashes({ dryRun }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
