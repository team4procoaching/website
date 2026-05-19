import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import {
  getServiceById,
  getServicesByIds,
  hasCompleteDetailContent,
  isDurationMinutes,
  isPackageSize,
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
  // else is fixed irrelevant boilerplate. Subscription variant — the
  // 3-tuple pricing satisfies the SubscriptionService discriminant.
  const baseService: Service = {
    id: 'competition-prep',
    name: 'Test Service',
    tagline: 'Test tagline',
    description: 'Test description',
    category: 'bodybuilding',
    pricingModel: 'subscription',
    pricing: [
      {
        period: 'monthly',
        price: '€199',
        suffix: '/month',
        amount: 199,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€999',
        suffix: 'one-time',
        amount: 999,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€1,899',
        suffix: 'one-time',
        amount: 1899,
        currency: 'EUR',
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
    // The discriminated `Service` union (ADR-0047) makes empty `pricing`
    // structurally invalid (subscription requires 3 entries, session
    // requires 1), so the type system catches the case before the runtime
    // guard has to. The cast keeps the guard exercised against the
    // bypass paths the guard exists for: deserialised data, fixtures with
    // assertions, or future variants.
    const service = { ...completeService, pricing: [] } as unknown as Service;
    expect(hasCompleteDetailContent(service)).toBe(false);
  });

  it('returns true for posing under the session-arm contract', () => {
    // Catalog-level assertion for the session arm: Posing carries the
    // configurator-substance triple (`packages` × 6, `descriptions` × 3,
    // `recommendedPackageSize` ∈ `sessionCounts`) plus a non-empty
    // `lead`, so it flips from gate-fail (pre-Commit-2 state) to
    // gate-pass. The corresponding `getServiceSlugPaths` emits a posing
    // route once Commit 2 lands; the page-route session-arm branch
    // arrives in a later commit.
    const posing = services.find((service) => service.id === 'posing');
    if (posing === undefined) throw new Error('posing service missing from catalog');
    expect(hasCompleteDetailContent(posing)).toBe(true);
  });

  it('two services pass the gate (competition-prep on the subscription arm, posing on the session arm)', () => {
    // Catalog-level contract for the launch gate. Subscription arm:
    // services that meet every long-form threshold (lead non-empty,
    // detailedFeatures >= 3, fitFor >= 3, faq >= 3, pricing >= 1) — today
    // `competition-prep` alone. Session arm: services that meet the
    // configurator substance contract (lead non-empty, packages = sessionCounts × durations,
    // descriptions = sessionCounts, recommendedPackageSize ∈ sessionCounts) —
    // today `posing` alone. Further services are added one at a time as
    // their content lands. This assertion is the single source of truth
    // for "which detail pages exist" — adding a service to either arm
    // without updating it here is a test failure.
    const passing = services.filter(hasCompleteDetailContent);
    expect(passing.map((service) => service.id)).toEqual(['competition-prep', 'posing']);
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
  // Assumes price follows the "€<int>[,<int>]" display convention used
  // project-wide. If a future entry introduces decimals, a different
  // currency glyph, or a different separator, this helper must be
  // revised — the third assertion below fails first in that case.
  const parseEuroAmount = (price: string): number => Number(price.replace(/[€,]/g, ''));

  it('every pricing entry has a positive numeric amount', () => {
    for (const service of services) {
      for (const option of service.pricing) {
        expect(option.amount, `${service.id} ${option.period}`).toBeGreaterThan(0);
      }
    }
  });

  it('every pricing entry uses EUR', () => {
    for (const service of services) {
      for (const option of service.pricing) {
        expect(option.currency, `${service.id} ${option.period}`).toBe('EUR');
      }
    }
  });

  it('amount matches the numeric value in the price display string', () => {
    for (const service of services) {
      for (const option of service.pricing) {
        expect(parseEuroAmount(option.price), `${service.id} ${option.period}`).toBe(option.amount);
      }
    }
  });
});

describe('pricingModel discriminator (ADR-0047)', () => {
  // Subscription cards respond to the global pricing toggle and contract
  // a 1:1 mapping between `BillingPeriod` values and pricing entries.
  // Drift in either direction (a missing period, a duplicate period, an
  // extra entry) would silently break the toggle's CSS `:has()` matches.
  it('every subscription service has exactly three pricing entries, one per billing period', () => {
    const subscriptionServices = services.filter(
      (service) => service.pricingModel === 'subscription',
    );
    expect(subscriptionServices.length).toBeGreaterThan(0);
    for (const service of subscriptionServices) {
      expect(service.pricing, `${service.id}: pricing arity`).toHaveLength(3);
      const periods = service.pricing.map((option) => option.period);
      expect(new Set(periods), `${service.id}: pricing periods`).toEqual(
        new Set(['monthly', 'six-months', 'twelve-months']),
      );
    }
  });

  // Session cards opt out of the global pricing toggle and surface only an
  // anchor price on the overview; the configuration matrix lives on the
  // detail page. The anchor is exactly one entry by contract — a second
  // entry would re-introduce the toggle-coupling the discriminator exists
  // to prevent.
  it('every session service has exactly one pricing entry and a non-empty configuration matrix', () => {
    const sessionServices = services.filter((service) => service.pricingModel === 'session');
    expect(sessionServices.length).toBeGreaterThan(0);
    for (const service of sessionServices) {
      expect(service.pricing, `${service.id}: pricing arity`).toHaveLength(1);
      expect(
        service.configuration.sessionCounts.length,
        `${service.id}: sessionCounts`,
      ).toBeGreaterThan(0);
      expect(service.configuration.durations.length, `${service.id}: durations`).toBeGreaterThan(0);
    }
  });

  // Configurator-substance invariants for session-arm services that ship a
  // detail page (ADR-0051). Every session service that populates the
  // configurator surface carries the full matrix: packages =
  // sessionCounts × durations, descriptions = sessionCounts, a
  // recommendedPackageSize present in sessionCounts, and a non-empty
  // lead. Services without these fields opt out by absence — the launch-
  // gate predicate filters them from `getServiceSlugPaths`.
  it('every session service with detail-page substance has a full configurator matrix', () => {
    const sessionServices = services.filter((service) => service.pricingModel === 'session');
    for (const service of sessionServices) {
      if (service.packages === undefined) {
        // Detail-page opt-out is by absence — skip the per-arm invariants.
        continue;
      }
      const expectedPackageCount =
        service.configuration.sessionCounts.length * service.configuration.durations.length;
      expect(service.packages.length, `${service.id}: packages arity`).toBe(expectedPackageCount);
      expect(service.descriptions, `${service.id}: descriptions present`).toBeDefined();
      expect(service.descriptions?.length, `${service.id}: descriptions arity`).toBe(
        service.configuration.sessionCounts.length,
      );
      expect(
        service.recommendedPackageSize,
        `${service.id}: recommendedPackageSize present`,
      ).toBeDefined();
      if (service.recommendedPackageSize !== undefined) {
        expect(
          service.configuration.sessionCounts.includes(service.recommendedPackageSize),
          `${service.id}: recommendedPackageSize in sessionCounts`,
        ).toBe(true);
      }
      expect(
        typeof service.lead === 'string' && service.lead.length > 0,
        `${service.id}: lead`,
      ).toBe(true);
    }
  });

  // Discriminated-union narrowing contract: branching on `pricingModel`
  // exposes the variant-only fields (here, `configuration` on the session
  // arm) without casts. A regression that flattens the union back to a
  // single shape with optional `configuration` would re-introduce the
  // optional-chaining the union exists to remove.
  it('narrows on pricingModel to expose variant-only fields', () => {
    const describePackage = (service: Service): string => {
      if (service.pricingModel === 'session') {
        // `service.configuration` is required on the SessionService arm —
        // no optional chaining, no narrowing assertion.
        const { sessionCounts, durations } = service.configuration;
        return `${sessionCounts.join('/')} sessions x ${durations.join('/')} min`;
      }
      // Subscription arm: 3-tuple pricing — `service.pricing[2]` is
      // statically defined, no array-bounds widening.
      return `${service.pricing.length} billing periods`;
    };

    const posing = services.find((service) => service.id === 'posing');
    if (posing === undefined) throw new Error('posing service missing from catalog');
    expect(describePackage(posing)).toBe('1/5/10 sessions x 30/60 min');

    const competitionPrep = services.find((service) => service.id === 'competition-prep');
    if (competitionPrep === undefined)
      throw new Error('competition-prep service missing from catalog');
    expect(describePackage(competitionPrep)).toBe('3 billing periods');
  });
});

describe('isDurationMinutes', () => {
  it('returns true for known duration entries', () => {
    expect(isDurationMinutes(30)).toBe(true);
    expect(isDurationMinutes(60)).toBe(true);
  });

  it('returns false for unknown values', () => {
    expect(isDurationMinutes(45)).toBe(false);
    expect(isDurationMinutes(0)).toBe(false);
  });
});

describe('isPackageSize', () => {
  it('returns true for known package sizes', () => {
    expect(isPackageSize(1)).toBe(true);
    expect(isPackageSize(5)).toBe(true);
    expect(isPackageSize(10)).toBe(true);
  });

  it('returns false for unknown values', () => {
    expect(isPackageSize(2)).toBe(false);
    expect(isPackageSize(11)).toBe(false);
  });
});
