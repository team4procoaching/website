// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { MODAL_IDS } from '~/data/ids';
import type {
  SerializedSuccessStoryModalPayload,
  StoryId,
  SuccessStory,
} from '~/data/successStories';
import { assertNotNull } from '~/test-utils/assertions';
import { renderAstro } from '~/test-utils/renderAstro';
import { remoteImage } from '~/types/components';
import SuccessStoryReadMoreModal from './SuccessStoryReadMoreModal.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

const sarah: SuccessStory = {
  id: 'sarah-m' as StoryId,
  name: 'Sarah M.',
  beforeImage: remoteImage('https://example.test/sarah-before.jpg', 800, 1000),
  afterImage: remoteImage('https://example.test/sarah-after.jpg', 800, 1000),
  transformation: 'Lost 30lbs',
  serviceId: 'get-lean',
  coach: 'gina',
  quote: 'Test quote',
  duration: '6 months',
  longTestimony: 'Long-form testimony.',
};

describe('SuccessStoryReadMoreModal (component layer)', () => {
  it('renders the dialog with the registered MODAL_IDS id', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryReadMoreModal, { props: { stories: [sarah] } }),
    );
    const dialog = doc.querySelector<HTMLDialogElement>(`dialog#${MODAL_IDS.successStoryReadMore}`);
    assertNotNull(dialog);
  });

  it('points aria-labelledby at the populated story-name heading id', async () => {
    // Approach G1 in the concept — the static heading id
    // `success-story-read-more-name` is both the ariaLabelledby target
    // and the populated `<h3>`'s `id`. A drift between the two would
    // leave AT users without a dialog label.
    const doc = parse(
      await renderAstro(SuccessStoryReadMoreModal, { props: { stories: [sarah] } }),
    );
    const dialog = doc.querySelector<HTMLDialogElement>(`dialog#${MODAL_IDS.successStoryReadMore}`);
    assertNotNull(dialog);
    expect(dialog.getAttribute('aria-labelledby')).toBe('success-story-read-more-name');
    const heading = doc.querySelector('h3#success-story-read-more-name');
    assertNotNull(heading);
    expect(heading.hasAttribute('data-success-story-name')).toBe(true);
  });

  it('exposes every populate hook the controller writes into', async () => {
    // The controller cache (`cacheDom`) reads each of these data-attribute
    // hooks. A regression that drops one would let `populateStory` skip a
    // surface silently — no test would catch the omission unless the modal
    // markup test asserts every hook exists.
    const doc = parse(
      await renderAstro(SuccessStoryReadMoreModal, { props: { stories: [sarah] } }),
    );
    for (const hook of [
      'data-success-story-before-image',
      'data-success-story-after-image',
      'data-success-story-name',
      'data-success-story-transformation',
      'data-success-story-service-link',
      'data-success-story-long-testimony',
      'data-success-story-cta',
    ]) {
      expect(doc.querySelector(`[${hook}]`), `missing ${hook}`).not.toBeNull();
    }
  });

  it('serialises a JSON-parseable payload into the hidden template', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryReadMoreModal, { props: { stories: [sarah] } }),
    );
    const template = doc.querySelector<HTMLTemplateElement>('#success-story-read-more-data');
    assertNotNull(template);
    const json = template.getAttribute('data-json');
    assertNotNull(json);
    const parsed = JSON.parse(json) as readonly SerializedSuccessStoryModalPayload[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe('sarah-m');
    expect(parsed[0]?.serviceName).toBe('Get Lean');
    expect(parsed[0]?.coachFirstName).toBe('Gina');
    // Funnel-bottom contract — the in-popup CTA target is always
    // `service.contactHref`, never the service detail page. Verifying
    // the serialised payload is the SSR-side mirror of controller test 7.
    expect(parsed[0]?.contactHref).toBe('/contact?service=get-lean');
  });
});
