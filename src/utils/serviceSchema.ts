/**
 * Schema.org Service builders.
 *
 * Two pure helpers live here:
 *
 * - {@link buildServiceListSchema} produces the `ItemList` used by the
 *   services catalog page. One nested Service per input service, one
 *   Offer per billing period.
 * - {@link buildServiceSchema} produces the standalone `Service`
 *   document used by each `/services/[slug]` detail page. Same
 *   per-billing-period Offer shape, plus `serviceType` and an optional
 *   canonical `url`, to be emitted alongside the layout's existing
 *   `WebPage`/`WebSite` JSON-LD.
 *
 * Both helpers are intentionally pure: all external inputs
 * (organization name, list name, catalog URL, optional deep-link
 * builder, canonical URL) flow in via parameters, so neither couples
 * to siteConfig, routes, or Astro.site directly. Consumers own that
 * wiring.
 *
 * @see https://schema.org/ItemList
 * @see https://schema.org/Service
 * @see https://schema.org/Offer
 */
import {
  type BillingPeriod,
  billingPeriods,
  type Service,
  type ServiceCategory,
} from '~/data/services';

/** Minimal schema.org Organization used as Service.provider. */
type ProviderSchema = {
  '@type': 'Organization';
  name: string;
};

/** A single Offer attached to an ItemList Service — one per billing period. */
type OfferSchema = {
  '@type': 'Offer';
  /** Human-readable label, sourced from billingPeriods[].label ("Monthly", "6 Months", "12 Months"). */
  name: string;
  /** Numeric price amount (integer EUR today). */
  price: number;
  /** ISO 4217 currency code. */
  priceCurrency: 'EUR';
  /** Stable period id used as disambiguator category ("monthly" | "six-months" | "twelve-months"). */
  category: BillingPeriod;
  /** Always InStock — coaching services have no capacity cap modelled today. */
  availability: 'https://schema.org/InStock';
};

/**
 * A single Offer attached to a standalone Service document — one per
 * billing period. Differs from {@link OfferSchema} only in `price`,
 * which Schema.org documents as a string for the standalone Service
 * shape (the spec accepts both, but Google's structured-data tooling
 * expects strings on Offer.price for richer matching).
 *
 * @see https://schema.org/Offer
 */
type ServiceOfferSchema = {
  '@type': 'Offer';
  /** Human-readable label, sourced from billingPeriods[].label ("Monthly", "6 Months", "12 Months"). */
  name: string;
  /** Numeric price amount serialised as a string (e.g. "299"). */
  price: string;
  /** ISO 4217 currency code. */
  priceCurrency: 'EUR';
  /** Stable period id used as disambiguator category ("monthly" | "six-months" | "twelve-months"). */
  category: BillingPeriod;
  /** Always InStock — coaching services have no capacity cap modelled today. */
  availability: 'https://schema.org/InStock';
};

/** The Service item nested inside a ListItem. */
type ServiceItemSchema = {
  '@type': 'Service';
  name: string;
  description: string;
  category: ServiceCategory;
  /** Absolute deep-link URL — set only when a buildServiceUrl callback is supplied. */
  url?: string;
  provider: ProviderSchema;
  offers: readonly OfferSchema[];
};

/** One entry in ItemList.itemListElement. */
type ListItemSchema = {
  '@type': 'ListItem';
  position: number;
  item: ServiceItemSchema;
};

/** Full Schema.org ItemList output. */
type ServiceListSchema = {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  name: string;
  url: string;
  itemListElement: readonly ListItemSchema[];
};

/** Options for {@link buildServiceListSchema}. */
type BuildServiceListSchemaOptions = {
  /** All services to list. Order is preserved in itemListElement. */
  services: readonly Service[];
  /** Display name written to ItemList.name (e.g. "Services", "Popular Programs"). */
  listName: string;
  /** Organization name used as Service.provider — typically siteConfig.name. */
  organizationName: string;
  /** Absolute URL of the services catalog page — written to ItemList.url. */
  listUrl: string;
  /**
   * Optional absolute-URL builder for Service.url.
   * When provided, each Service gains a `url` field containing the
   * deep-link produced by the callback. When omitted, Service.url is
   * left off entirely — consumers without a deep-link strategy get a
   * URL-less ItemList that is still schema-valid.
   */
  buildServiceUrl?: (service: Service) => string;
};

/**
 * Period-id → human label, derived once from billingPeriods at module load.
 * `Object.fromEntries` loses the tight Record typing, so we assert back —
 * safe because billingPeriods covers every BillingPeriod value by construction.
 */
const periodLabels: Record<BillingPeriod, string> = Object.fromEntries(
  billingPeriods.map((p) => [p.value, p.label]),
) as Record<BillingPeriod, string>;

/**
 * Build a Schema.org ItemList for the services catalog.
 *
 * @example
 * ```ts
 * const schema = buildServiceListSchema({
 *   services,
 *   listName: 'Services',
 *   organizationName: 'Team 4 Pro Coaching',
 *   listUrl: new URL('/services', Astro.site).toString(),
 *   buildServiceUrl: (s) => new URL(`/services?service=${s.id}`, Astro.site).toString(),
 * });
 * ```
 */
function buildServiceListSchema(options: BuildServiceListSchemaOptions): ServiceListSchema {
  const { services, listName, organizationName, listUrl, buildServiceUrl } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: listUrl,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: service.name,
        description: service.description,
        category: service.category,
        ...(buildServiceUrl ? { url: buildServiceUrl(service) } : {}),
        provider: {
          '@type': 'Organization',
          name: organizationName,
        },
        offers: service.pricing.map((option) => ({
          '@type': 'Offer',
          name: periodLabels[option.period],
          price: option.amount,
          priceCurrency: option.currency,
          category: option.period,
          availability: 'https://schema.org/InStock',
        })),
      },
    })),
  };
}

/** Standalone Schema.org Service document for a single detail page. */
type ServiceSchema = {
  '@context': 'https://schema.org';
  '@type': 'Service';
  name: string;
  description: string;
  /** Schema.org `serviceType` — the broad category this service belongs to. */
  serviceType: ServiceCategory;
  /** Absolute canonical URL of the detail page — set only when supplied. */
  url?: string;
  provider: ProviderSchema;
  offers: readonly ServiceOfferSchema[];
};

/** Options for {@link buildServiceSchema}. */
type BuildServiceSchemaOptions = {
  /** The service to describe. Pricing entries map 1:1 to Offers. */
  service: Service;
  /** Organization name used as Service.provider — typically siteConfig.name. */
  organizationName: string;
  /**
   * Optional absolute canonical URL of the detail page. When provided,
   * the schema gains a `url` field; when omitted, the field is left
   * off entirely (still schema-valid).
   */
  serviceUrl?: string;
};

/**
 * Build a Schema.org Service document for a single detail page.
 *
 * Produced JSON-LD is intended to ride alongside the layout's existing
 * `WebPage`/`WebSite` block via the layout's `additionalJsonLd` prop —
 * additive, never replacing.
 *
 * @example
 * ```ts
 * const schema = buildServiceSchema({
 *   service,
 *   organizationName: 'Team 4 Pro Coaching',
 *   serviceUrl: new URL(`/services/${service.id}`, Astro.site).toString(),
 * });
 * ```
 */
function buildServiceSchema(options: BuildServiceSchemaOptions): ServiceSchema {
  const { service, organizationName, serviceUrl } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    serviceType: service.category,
    ...(serviceUrl ? { url: serviceUrl } : {}),
    provider: {
      '@type': 'Organization',
      name: organizationName,
    },
    offers: service.pricing.map((option) => ({
      '@type': 'Offer',
      name: periodLabels[option.period],
      price: String(option.amount),
      priceCurrency: option.currency,
      category: option.period,
      availability: 'https://schema.org/InStock',
    })),
  };
}

// Export
export { buildServiceListSchema, buildServiceSchema };
export type {
  BuildServiceListSchemaOptions,
  BuildServiceSchemaOptions,
  ServiceListSchema,
  ServiceSchema,
};
