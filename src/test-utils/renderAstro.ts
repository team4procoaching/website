/**
 * Render an Astro component to an HTML string for use in Vitest tests.
 *
 * Thin wrapper around `experimental_AstroContainer.create()`. Component tests
 * import this helper — they do not import `astro/container` directly. Per
 * ADR-0037, this file is the single grep-visible import site for the
 * experimental Container API, so a future Astro rename or stabilisation of
 * the export is a one-file update.
 *
 * The component-parameter type is derived structurally from
 * `Parameters<experimental_AstroContainer['renderToString']>[0]` rather than
 * imported from `astro/runtime/server/index.js`; the runtime path is a deep
 * catch-all under `astro/package.json` `exports` (`./runtime/*`), not a
 * pinned public entry, and the structural derivation keeps the blast radius
 * of a runtime reshape at zero lines for this file.
 *
 * @example
 * ```typescript
 * import { renderAstro } from '~/test-utils/renderAstro';
 * import ProcessSteps from './ProcessSteps.astro';
 *
 * const html = await renderAstro(ProcessSteps, {
 *   props: { headline: 'X', steps: [] },
 * });
 * ```
 */
// See ADR-0037 — sole sanctioned import site for astro/container.
import { experimental_AstroContainer } from 'astro/container';

type RenderArgs = Parameters<experimental_AstroContainer['renderToString']>;
type ComponentParam = RenderArgs[0];
type RenderOptions = NonNullable<RenderArgs[1]>;

async function renderAstro(
  Component: ComponentParam,
  options: RenderOptions = {},
): Promise<string> {
  const container = await experimental_AstroContainer.create();
  return container.renderToString(Component, options);
}

export { renderAstro };
