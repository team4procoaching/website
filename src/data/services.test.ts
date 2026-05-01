import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import {
  getServiceById,
  getServicesByIds,
  hasCompleteDetailContent,
  type Service,
  type ServiceId,
  serviceDetailHref,
  serviceIds,
  services,
  servicesSection,
} from './services';

describe('getServicesByIds', () => {
  it('returns the correct services for valid IDs', () => {
    const result = getServicesByIds(['competition-prep', 'get-jacked']);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('competition-prep');
    expect(result[1].id).toBe('get-jacked');
  });

  it('preserves the order of the requested IDs', () => {
    const result = getServicesByIds(['get-jacked', 'competition-prep']);
    expect(result[0].id).toBe('get-jacked');
    expect(result[1].id).toBe('competition-prep');
  });

  it('returns an empty array for empty input', () => {
    const result = getServicesByIds([]);
    expect(result).toHaveLength(0);
  });

  it('throws for an unknown service ID', () => {
    // Cast bypasses the compile-time ServiceId check to exercise the
    // runtime guard — the same path triggered by deserialized URL params
    // or test fixtures that escape the type system.
    expect(() => getServicesByIds(['nonexistent' as ServiceId])).toThrow(
      'Service not found: "nonexistent"',
    );
  });

  it('throws on the first unknown ID without returning partial results', () => {
    expect(() =>
      getServicesByIds(['competition-prep', 'bogus' as ServiceId, 'get-jacked']),
    ).toThrow('Service not found: "bogus"');
  });

  it('returns full Service objects with expected properties', () => {
    const [service] = getServicesByIds(['competition-prep']);
    expect(service).toHaveProperty('id');
    expect(service).toHaveProperty('name');
    expect(service).toHaveProperty('pricing');
    expect(service).toHaveProperty('category');
  });

  it('highlightedServiceIds in servicesSection all resolve', () => {
    expect(() => getServicesByIds(servicesSection.highlightedServiceIds)).not.toThrow();
  });
});

describe('getServiceById', () => {
  // `as const satisfies Record<ServiceId, Service>` guarantees completeness
  // at compile time; the runtime sanity check stays as a drift-tripwire in
  // case the satisfies constraint is ever loosened.
  it('returns a service for every serviceId whose inner id matches the key', () => {
    for (const id of serviceIds) {
      expect(getServiceById(id).id).toBe(id);
    }
  });

  it('returns the full Service object for a given ID', () => {
    const service = getServiceById('competition-prep');
    expect(service.name).toBe('Competition Prep');
    expect(service.category).toBe('bodybuilding');
    expect(service.pricing.length).toBeGreaterThan(0);
  });
});

describe('services (derived array)', () => {
  it('preserves canonical serviceIds order', () => {
    expect(services.map((s) => s.id)).toEqual([...serviceIds]);
  });
});

describe('serviceDetailHref', () => {
  it('returns /services/<id> for each service', () => {
    for (const id of serviceIds) {
      expect(serviceDetailHref(id)).toBe(`${routes.services}/${id}`);
    }
  });
});

describe('hasCompleteDetailContent', () => {
  // Minimal Service base used to exercise each threshold in isolation. The
  // detail-page-relevant fields are layered on top per test; everything
  // else is fixed irrelevant boilerplate.
  const baseService: Service = {
    id: 'competition-prep',
    name: 'Test Service',
    tagline: 'Test tagline',
    description: 'Test description',
    category: 'bodybuilding',
    pricing: [
      {
        period: 'monthly',
        price: '$199',
        suffix: '/month',
        amount: 199,
        currency: 'USD',
      },
    ],
    features: ['feature one'],
    contactHref: `${routes.contact}?service=competition-prep`,
  };

  const validLead = 'A non-empty lead paragraph.';
  const validDetailedFeatures = [
    { title: 'A', description: 'a' },
    { title: 'B', description: 'b' },
    { title: 'C', description: 'c' },
  ] as const;
  const validFitFor = ['fit one', 'fit two', 'fit three'] as const;
  const validFaq = [
    { question: 'Q1', answer: 'A1' },
    { question: 'Q2', answer: 'A2' },
    { question: 'Q3', answer: 'A3' },
  ] as const;

  const completeService: Service = {
    ...baseService,
    lead: validLead,
    detailedFeatures: validDetailedFeatures,
    fitFor: validFitFor,
    faq: validFaq,
  };

  it('returns true when every threshold is met', () => {
    expect(hasCompleteDetailContent(completeService)).toBe(true);
  });

  it('returns false when lead is missing', () => {
    const service: Service = { ...completeService, lead: undefined };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns false when lead is the empty string', () => {
    const service: Service = { ...completeService, lead: '' };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns false when detailedFeatures has fewer than 3 entries', () => {
    const service: Service = {
      ...completeService,
      detailedFeatures: validDetailedFeatures.slice(0, 2),
    };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns false when detailedFeatures is missing', () => {
    const service: Service = { ...completeService, detailedFeatures: undefined };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns false when fitFor has fewer than 3 entries', () => {
    const service: Service = { ...completeService, fitFor: validFitFor.slice(0, 2) };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns false when fitFor is missing', () => {
    const service: Service = { ...completeService, fitFor: undefined };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns false when faq has fewer than 3 entries', () => {
    const service: Service = { ...completeService, faq: validFaq.slice(0, 2) };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns false when faq is missing', () => {
    const service: Service = { ...completeService, faq: undefined };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns false when pricing is empty', () => {
    const service: Service = { ...completeService, pricing: [] };
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('every service in the catalog passes the gate', () => {
    // Catalog-level contract for the launch gate: every service that
    // meets every threshold defined above (lead non-empty,
    // detailedFeatures >= 3, fitFor >= 3, faq >= 3) ships a detail page.
    // The list mirrors `serviceIds` in canonical order — adding a service
    // to the catalog without long-form content (or removing the content
    // from a passing service) is a test failure.
    const passing = services.filter(hasCompleteDetailContent);
    expect(passing.map((service) => service.id)).toEqual([
      'competition-prep',
      'off-season',
      'posing',
      'performance-ready',
      'get-jacked',
      'get-lean',
      'beginner',
      'busy',
    ]);
  });
});

describe('contactHref', () => {
  it('every service contactHref is a contact route with a matching service parameter', () => {
    for (const service of services) {
      expect(service.contactHref, `${service.id}: unexpected contactHref shape`).toBe(
        `${routes.contact}?service=${service.id}`,
      );
    }
  });
});

describe('PricingOption amount and currency', () => {
  // Assumes price follows the "$<int>[,<int>]" display convention used
  // project-wide. If a future entry introduces decimals, a different
  // currency glyph, or a different separator, this helper must be
  // revised — the third assertion below fails first in that case.
  const parseUsdAmount = (price: string): number => Number(price.replaceAll(/[$,]/g, ''));

  it('every pricing entry has a positive numeric amount', () => {
    for (const service of services) {
      for (const option of service.pricing) {
        expect(option.amount, `${service.id} ${option.period}`).toBeGreaterThan(0);
      }
    }
  });

  it('every pricing entry uses USD', () => {
    for (const service of services) {
      for (const option of service.pricing) {
        expect(option.currency, `${service.id} ${option.period}`).toBe('USD');
      }
    }
  });

  it('amount matches the numeric value in the price display string', () => {
    for (const service of services) {
      for (const option of service.pricing) {
        expect(parseUsdAmount(option.price), `${service.id} ${option.period}`).toBe(option.amount);
      }
    }
  });
});
