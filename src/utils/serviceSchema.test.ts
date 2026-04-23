import { describe, expect, it } from 'vitest';
import { type Service, services } from '~/data/services';
import { buildServiceListSchema } from './serviceSchema';

describe('buildServiceListSchema', () => {
  // Marker values (not realistic site config) so hardcoded strings
  // in the helper would fail the delegation assertions instead of
  // passing by coincidence.
  const baseOptions = {
    services,
    listName: 'TEST_LIST',
    organizationName: 'TEST_ORG',
    listUrl: 'https://example.com/services',
  };

  it('sets @context, @type, name, and url at the top level', () => {
    const result = buildServiceListSchema(baseOptions);
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('ItemList');
    expect(result.name).toBe('TEST_LIST');
    expect(result.url).toBe('https://example.com/services');
  });

  it('produces one ListItem per input service, position starting at 1', () => {
    const result = buildServiceListSchema(baseOptions);
    expect(result.itemListElement).toHaveLength(services.length);
    result.itemListElement.forEach((listItem, index) => {
      expect(listItem['@type']).toBe('ListItem');
      expect(listItem.position).toBe(index + 1);
    });
  });

  it('delegates Service fields from the input service', () => {
    const result = buildServiceListSchema(baseOptions);
    result.itemListElement.forEach((listItem, index) => {
      const service = services[index];
      expect(listItem.item['@type']).toBe('Service');
      expect(listItem.item.name).toBe(service.name);
      expect(listItem.item.description).toBe(service.description);
      expect(listItem.item.category).toBe(service.category);
    });
  });

  it('sets the Organization provider from organizationName', () => {
    const result = buildServiceListSchema(baseOptions);
    result.itemListElement.forEach((listItem) => {
      expect(listItem.item.provider).toEqual({
        '@type': 'Organization',
        name: 'TEST_ORG',
      });
    });
  });

  it('produces one Offer per pricing option', () => {
    const result = buildServiceListSchema(baseOptions);
    result.itemListElement.forEach((listItem, index) => {
      expect(listItem.item.offers).toHaveLength(services[index].pricing.length);
    });
  });

  it('emits an exact Offer shape for competition-prep monthly', () => {
    // toEqual here fails if the helper ever leaks PricingOption fields that
    // are not part of the Offer schema (e.g. `note` or `suffix`).
    const result = buildServiceListSchema(baseOptions);
    const firstServiceItem = result.itemListElement[0];
    expect(firstServiceItem.item.name).toBe('Competition Prep');
    expect(firstServiceItem.item.offers[0]).toEqual({
      '@type': 'Offer',
      name: 'Monthly',
      price: 299,
      priceCurrency: 'EUR',
      category: 'monthly',
      availability: 'https://schema.org/InStock',
    });
  });

  it('uses billingPeriods labels for Offer.name across all three periods', () => {
    const result = buildServiceListSchema(baseOptions);
    const firstServiceOffers = result.itemListElement[0].item.offers;
    expect(firstServiceOffers.map((o) => o.name)).toEqual(['Monthly', '6 Months', '12 Months']);
  });

  it('sets availability=InStock on every offer across all services', () => {
    const result = buildServiceListSchema(baseOptions);
    for (const listItem of result.itemListElement) {
      for (const offer of listItem.item.offers) {
        expect(offer.availability).toBe('https://schema.org/InStock');
      }
    }
  });

  it('omits Service.url when no buildServiceUrl callback is supplied', () => {
    const result = buildServiceListSchema(baseOptions);
    result.itemListElement.forEach((listItem) => {
      expect(listItem.item).not.toHaveProperty('url');
    });
  });

  it('populates Service.url via buildServiceUrl when supplied', () => {
    const buildServiceUrl = (service: Service) =>
      `https://example.com/services?service=${service.id}`;
    const result = buildServiceListSchema({ ...baseOptions, buildServiceUrl });
    expect(result.itemListElement[0].item.url).toBe(
      'https://example.com/services?service=competition-prep',
    );
    expect(result.itemListElement[result.itemListElement.length - 1].item.url).toBe(
      `https://example.com/services?service=${services[services.length - 1].id}`,
    );
  });
});
