/**
 * Curated registry of assets that get a dedicated, indexable SEO landing page at
 * `/{slug}-bull-market-support-band`. Intentionally a small, high-quality allowlist
 * (major assets first) rather than an auto-generated page per coin — see
 * SEO_IMPLEMENTATION_PLAN.md (Priority 2). Expand only when Search Console shows demand.
 */

export interface AssetPageDef {
  /** URL slug base; final route is `/{slug}-bull-market-support-band` */
  slug: string;
  /** Display/common name */
  name: string;
  /** DB symbol (uppercase) used to join to cryptocurrencies/bmsb_calculations */
  symbol: string;
  /** One- to two-sentence, asset-specific blurb for unique on-page copy */
  blurb: string;
}

export const ASSET_PAGES: AssetPageDef[] = [
  {
    slug: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    blurb:
      'Bitcoin is the asset the Bull Market Support Band is most associated with — the 20-week SMA / 21-week EMA band has historically acted as a key support zone during BTC bull markets and as resistance in bear phases.',
  },
  {
    slug: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    blurb:
      'Ethereum traders watch the Bull Market Support Band closely as a macro trend gauge for ETH, using weekly closes above or below the 20-week SMA and 21-week EMA to frame the broader market regime.',
  },
  {
    slug: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    blurb:
      'Solana is among the more volatile large caps, which makes its position relative to the Bull Market Support Band a useful read on whether SOL is holding its longer-term trend.',
  },
  {
    slug: 'xrp',
    name: 'XRP',
    symbol: 'XRP',
    blurb:
      'XRP often trades in long ranges punctuated by sharp moves; the Bull Market Support Band helps frame where the longer-term trend sits between those expansions.',
  },
  {
    slug: 'bnb',
    name: 'BNB',
    symbol: 'BNB',
    blurb:
      'BNB tends to track the broader market trend; its relationship to the 20-week SMA and 21-week EMA band is a quick gauge of whether that trend remains intact.',
  },
  {
    slug: 'dogecoin',
    name: 'Dogecoin',
    symbol: 'DOGE',
    blurb:
      'Dogecoin is highly sentiment-driven, so its position above, inside, or below the Bull Market Support Band is a useful filter for separating durable trend from short-lived spikes.',
  },
  {
    slug: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    blurb:
      'Cardano traders use the Bull Market Support Band as a longer-term trend reference for ADA, focusing on weekly closes relative to the 20-week SMA and 21-week EMA.',
  },
  {
    slug: 'chainlink',
    name: 'Chainlink',
    symbol: 'LINK',
    blurb:
      'Chainlink’s position relative to the Bull Market Support Band offers a macro view of LINK’s trend beyond day-to-day volatility.',
  },
  {
    slug: 'avalanche',
    name: 'Avalanche',
    symbol: 'AVAX',
    blurb:
      'Avalanche is a volatile large cap where the Bull Market Support Band helps distinguish a sustained trend from short-term noise.',
  },
];

const BY_SLUG = new Map(ASSET_PAGES.map((a) => [a.slug, a]));
const BY_SYMBOL = new Map(ASSET_PAGES.map((a) => [a.symbol.toUpperCase(), a]));

export const ASSET_PAGE_SUFFIX = '-bull-market-support-band';

/** Resolve a full route segment (e.g. "bitcoin-bull-market-support-band") to its asset. */
export function assetFromSlugSegment(segment: string): AssetPageDef | undefined {
  if (!segment.endsWith(ASSET_PAGE_SUFFIX)) return undefined;
  const base = segment.slice(0, -ASSET_PAGE_SUFFIX.length);
  return BY_SLUG.get(base.toLowerCase());
}

/** Resolve a bare symbol or slug base (e.g. "btc", "bitcoin") to its asset, for redirects. */
export function assetFromSymbolOrSlug(value: string): AssetPageDef | undefined {
  const v = value.toLowerCase();
  return BY_SYMBOL.get(v.toUpperCase()) || BY_SLUG.get(v);
}

/** Canonical path for an asset page. */
export function assetPath(asset: AssetPageDef): string {
  return `/${asset.slug}${ASSET_PAGE_SUFFIX}`;
}
