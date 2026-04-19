import { describe, expect, it } from 'vitest';

import {
  extractInlineBlocks,
  hashBlock,
  updateCspDirective,
  updateNetlifyToml,
} from './generate-csp-hashes.mjs';

// ---------------------------------------------------------------------------
// extractInlineBlocks
// ---------------------------------------------------------------------------

describe('extractInlineBlocks', () => {
  it('extracts a single inline <script>', () => {
    const html = '<html><body><script>console.log("hi");</script></body></html>';
    const { scripts, styles } = extractInlineBlocks(html);
    expect(scripts).toEqual(['console.log("hi");']);
    expect(styles).toEqual([]);
  });

  it('extracts a single inline <style>', () => {
    const html = '<html><head><style>body { color: red; }</style></head></html>';
    const { scripts, styles } = extractInlineBlocks(html);
    expect(scripts).toEqual([]);
    expect(styles).toEqual(['body { color: red; }']);
  });

  it('skips external scripts (src attribute)', () => {
    const html = '<script src="/app.js"></script><script>inline();</script>';
    const { scripts } = extractInlineBlocks(html);
    expect(scripts).toEqual(['inline();']);
  });

  it('skips JSON-LD scripts', () => {
    const html =
      '<script type="application/ld+json">{"@context": "https://schema.org"}</script>' +
      '<script>inline();</script>';
    const { scripts } = extractInlineBlocks(html);
    expect(scripts).toEqual(['inline();']);
  });

  it('extracts multiple scripts and styles across a page', () => {
    const html = `
      <html>
        <head>
          <style>a { color: blue; }</style>
          <script>first();</script>
        </head>
        <body>
          <script>second();</script>
          <style>b { color: green; }</style>
        </body>
      </html>
    `;
    const { scripts, styles } = extractInlineBlocks(html);
    expect(scripts).toEqual(['first();', 'second();']);
    expect(styles).toEqual(['a { color: blue; }', 'b { color: green; }']);
  });

  it('preserves whitespace inside blocks (hash must match exact content)', () => {
    const body = '\n  const x = 1;\n  const y = 2;\n';
    const html = `<script>${body}</script>`;
    const { scripts } = extractInlineBlocks(html);
    expect(scripts).toEqual([body]);
  });
});

// ---------------------------------------------------------------------------
// hashBlock
// ---------------------------------------------------------------------------

describe('hashBlock', () => {
  it('produces a deterministic sha256-base64 token', () => {
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    // base64 of those bytes = 47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=
    expect(hashBlock('')).toBe("'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='");
  });

  it('differs for different content', () => {
    expect(hashBlock('alert(1)')).not.toBe(hashBlock('alert(2)'));
  });

  it('is whitespace-sensitive', () => {
    expect(hashBlock('x=1')).not.toBe(hashBlock('x = 1'));
  });
});

// ---------------------------------------------------------------------------
// updateCspDirective
// ---------------------------------------------------------------------------

describe('updateCspDirective', () => {
  const baseCsp =
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' https://fonts.googleapis.com; " +
    "img-src 'self' data:";

  it('appends a single script hash to script-src', () => {
    const result = updateCspDirective(baseCsp, ["'sha256-AAA'"], []);
    expect(result).toContain("script-src 'self' 'sha256-AAA'");
  });

  it('appends multiple hashes in sorted order (deterministic diff)', () => {
    const result = updateCspDirective(baseCsp, ["'sha256-ZZZ'", "'sha256-AAA'"], []);
    expect(result).toContain("script-src 'self' 'sha256-AAA' 'sha256-ZZZ'");
  });

  it('appends style hashes to style-src alongside existing sources', () => {
    const result = updateCspDirective(baseCsp, [], ["'sha256-BBB'"]);
    expect(result).toContain("style-src 'self' https://fonts.googleapis.com 'sha256-BBB'");
  });

  it('strips pre-existing sha256 tokens before adding the new set (idempotency)', () => {
    const pre = updateCspDirective(baseCsp, ["'sha256-OLD'"], []);
    const post = updateCspDirective(pre, ["'sha256-NEW'"], []);
    expect(post).toContain("script-src 'self' 'sha256-NEW'");
    expect(post).not.toContain("'sha256-OLD'");
  });

  it('is idempotent for identical inputs', () => {
    const once = updateCspDirective(baseCsp, ["'sha256-AAA'"], ["'sha256-BBB'"]);
    const twice = updateCspDirective(once, ["'sha256-AAA'"], ["'sha256-BBB'"]);
    expect(twice).toBe(once);
  });

  it('leaves other directives untouched', () => {
    const result = updateCspDirective(baseCsp, ["'sha256-AAA'"], []);
    expect(result).toContain("default-src 'self'");
    expect(result).toContain("img-src 'self' data:");
  });

  it('handles empty hash lists (no-op on a baseline CSP)', () => {
    expect(updateCspDirective(baseCsp, [], [])).toBe(baseCsp);
  });
});

// ---------------------------------------------------------------------------
// updateNetlifyToml (integration of the pure helpers)
// ---------------------------------------------------------------------------

describe('updateNetlifyToml', () => {
  const toml = [
    '[[context.production.headers]]',
    '  for = "/*"',
    '  [context.production.headers.values]',
    "    Content-Security-Policy = \"default-src 'self'; script-src 'self'; style-src 'self'\"",
    '',
  ].join('\n');

  it('rewrites the Content-Security-Policy line with the given hashes', () => {
    const updated = updateNetlifyToml(toml, ["'sha256-AAA'"], ["'sha256-BBB'"]);
    expect(updated).toContain("script-src 'self' 'sha256-AAA'");
    expect(updated).toContain("style-src 'self' 'sha256-BBB'");
  });

  it('preserves everything outside the CSP line', () => {
    const updated = updateNetlifyToml(toml, ["'sha256-AAA'"], []);
    expect(updated).toContain('[[context.production.headers]]');
    expect(updated).toContain('for = "/*"');
  });

  it('warns and returns input unchanged when no CSP line is present', () => {
    const noCsp = '[build]\n  command = "pnpm build"\n';
    const warnings = [];
    const logger = { info: () => {}, warn: (msg) => warnings.push(msg) };
    const result = updateNetlifyToml(noCsp, ["'sha256-AAA'"], [], logger);
    expect(result).toBe(noCsp);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/No Content-Security-Policy/);
  });
});
