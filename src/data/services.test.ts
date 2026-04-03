import { describe, expect, it } from 'vitest';
import { getServicesByIds, servicesSection } from './services';

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
    expect(() => getServicesByIds(['nonexistent'])).toThrow('Service not found: "nonexistent"');
  });

  it('throws on the first unknown ID without returning partial results', () => {
    expect(() => getServicesByIds(['competition-prep', 'bogus', 'get-jacked'])).toThrow(
      'Service not found: "bogus"',
    );
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
