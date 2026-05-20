import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from './a11y';

describe('expectNoA11yViolations', () => {
  it('resolves without throwing for clean HTML', async () => {
    await expect(
      expectNoA11yViolations('<button type="button">Click</button>'),
    ).resolves.toBeUndefined();
  });

  it('rejects for HTML with an axe violation', async () => {
    // An <img> without alt text fails the WCAG 2.1 AA `image-alt` rule.
    await expect(expectNoA11yViolations('<img src="x.jpg">')).rejects.toThrow(/image-alt/);
  });

  it('honours the disableRules option to suppress a specific rule', async () => {
    await expect(
      expectNoA11yViolations('<img src="x.jpg">', { disableRules: ['image-alt'] }),
    ).resolves.toBeUndefined();
  });

  it('treats empty HTML as a vacuous pass', async () => {
    // Required for the legitimate Accordion `items: []` case where the
    // rendered HTML is empty — see the a11y.ts file-level limitation note.
    await expect(expectNoA11yViolations('')).resolves.toBeUndefined();
    await expect(expectNoA11yViolations('   \n   ')).resolves.toBeUndefined();
  });

  it('applies the project-wide fragment-mode disables so orphan content passes', async () => {
    // `<p>` outside any landmark would fail the page-level `region` rule; the
    // baseline disable set makes a bare fragment a clean pass.
    await expect(expectNoA11yViolations('<p>orphan content</p>')).resolves.toBeUndefined();
  });
});
