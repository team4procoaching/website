import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import {
  getServiceById,
  getServicesByIds,
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
