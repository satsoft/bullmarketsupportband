import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import TradingViewChart from '../components/TradingViewChart';
import { SiteFooterNav } from '../components/SiteFooterNav';
import { getAssetBMSB } from '../../lib/asset-bmsb';
import {
  ASSET_PAGES,
  ASSET_PAGE_SUFFIX,
  assetFromSlugSegment,
  assetFromSymbolOrSlug,
  assetPath,
} from '../../lib/asset-pages';

// Statically generate the curated asset pages; revalidate values every 15 min (ISR).
export const revalidate = 900;

export function generateStaticParams() {
  return ASSET_PAGES.map((a) => ({ ticker: `${a.slug}${ASSET_PAGE_SUFFIX}` }));
}

const SITE = 'https://www.bullmarketsupportband.com';

function fmtPrice(n: number | null): string {
  if (n == null) return 'N/A';
  if (n >= 1) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.001) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(2)}`;
}

function positionLabel(p: string | null): string {
  return p === 'above_band' ? 'Above Band' : p === 'below_band' ? 'Below Band' : p === 'in_band' ? 'In Band' : 'N/A';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const asset = assetFromSlugSegment(ticker);
  if (!asset) return {};
  const title = `${asset.name} Bull Market Support Band — Live ${asset.symbol} 20W SMA / 21W EMA`;
  const description = `Live ${asset.name} (${asset.symbol}) Bull Market Support Band: current price, 20-week SMA, 21-week EMA, band range, and whether ${asset.symbol} is above, inside, or below the band. Updated continuously.`;
  const url = `${SITE}${assetPath(asset)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;

  // 1) Canonical asset slug -> render the SSR page.
  const asset = assetFromSlugSegment(ticker);
  if (!asset) {
    // 2) Bare symbol or slug base for a known asset -> redirect to canonical slug.
    const redirectTarget = assetFromSymbolOrSlug(ticker);
    if (redirectTarget) redirect(assetPath(redirectTarget));
    // 3) Anything else -> real 404 (fixes the previous soft-404 behavior).
    notFound();
  }

  const data = await getAssetBMSB(asset.symbol);
  if (!data) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: `${asset.name} Bull Market Support Band`,
    description: `Bull Market Support Band analysis for ${asset.name} (${asset.symbol}).`,
    url: `${SITE}${assetPath(asset)}`,
    category: 'Cryptocurrency technical analysis',
  };

  const positive = data.change_pct_24h != null && data.change_pct_24h >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-2xl mx-auto">
        <nav className="text-sm text-gray-400 mb-4">
          <Link href="/" className="hover:text-white">Dashboard</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">{asset.name} BMSB</span>
        </nav>

        <h1 className="text-3xl font-bold text-white mb-2">
          {asset.name} ({asset.symbol}) Bull Market Support Band
        </h1>
        <p className="text-gray-300 mb-6">
          Live {asset.name} Bull Market Support Band — the zone between the 20-week simple moving
          average (SMA) and 21-week exponential moving average (EMA). {asset.blurb}
        </p>

        {/* Key values — rendered server-side so they appear in the initial HTML */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <Stat label="Current Price" value={fmtPrice(data.price)} />
          <Stat
            label="24h Change"
            value={data.change_pct_24h != null ? `${positive ? '+' : ''}${data.change_pct_24h.toFixed(2)}%` : 'N/A'}
            valueClass={positive ? 'text-green-400' : 'text-red-400'}
          />
          <Stat
            label="Band Status"
            value={positionLabel(data.price_position)}
            valueClass={
              data.price_position === 'above_band'
                ? 'text-green-400'
                : data.price_position === 'below_band'
                ? 'text-red-400'
                : 'text-yellow-400'
            }
          />
          <Stat label="20W SMA" value={fmtPrice(data.sma_20_week)} sub={data.sma_trend === 'increasing' ? '↗ Rising' : data.sma_trend === 'decreasing' ? '↘ Falling' : undefined} />
          <Stat label="21W EMA" value={fmtPrice(data.ema_21_week)} sub={data.ema_trend === 'increasing' ? '↗ Rising' : data.ema_trend === 'decreasing' ? '↘ Falling' : undefined} />
          <Stat
            label="Band Range"
            value={`${fmtPrice(data.band_lower)} – ${fmtPrice(data.band_upper)}`}
          />
          <Stat
            label="Distance from Band"
            value={data.distance_pct != null ? (data.distance_pct === 0 ? 'Inside band' : `${data.distance_pct > 0 ? '+' : ''}${data.distance_pct.toFixed(1)}%`) : 'N/A'}
          />
          <Stat label="Band Health" value={data.band_health === 'healthy' ? 'Healthy' : data.band_health === 'weak' ? 'Weak' : 'N/A'} valueClass={data.band_health === 'healthy' ? 'text-green-400' : 'text-red-400'} />
          <Stat label="Last Updated" value={data.last_updated ?? 'N/A'} />
        </div>

        {/* Interactive chart (client island) */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-6 h-72">
          <TradingViewChart symbol={data.symbol} tradingViewSymbol={data.tradingview_symbol} />
        </div>

        <div className="prose-invert text-gray-300 text-sm space-y-3 mb-8">
          <p>
            When {asset.symbol} trades <strong>above</strong> the Bull Market Support Band, the band
            tends to act as support; <strong>inside</strong> the band signals indecision near the
            longer-term trend; and a weekly close <strong>below</strong> the band is often read as a
            loss of bullish momentum. The band is a trend reference, not a guaranteed signal.
          </p>
          <p>
            See the <Link href="/what-is-the-bull-market-support-band" className="text-blue-400 hover:underline">BMSB overview</Link>{' '}
            for how the indicator works, or the{' '}
            <Link href="/methodology" className="text-blue-400 hover:underline">methodology</Link>{' '}
            for exactly how this site computes these values.
          </p>
        </div>

        {/* Related assets */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-2">Other assets</h2>
          <div className="flex flex-wrap gap-2">
            {ASSET_PAGES.filter((a) => a.slug !== asset.slug).map((a) => (
              <Link key={a.slug} href={assetPath(a)} className="px-3 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm hover:bg-gray-700">
                {a.name}
              </Link>
            ))}
          </div>
        </div>

        <SiteFooterNav />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-3">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className={`font-mono font-semibold ${valueClass ?? 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
