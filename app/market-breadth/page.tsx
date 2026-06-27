import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooterNav } from '../components/SiteFooterNav';
import { supabaseAdmin } from '../../lib/supabase';

const SITE = 'https://www.bullmarketsupportband.com';
const URL = `${SITE}/market-breadth`;

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Crypto Market Breadth — % of Top Assets Above the Bull Market Support Band',
  description:
    'Market breadth for the Bull Market Support Band: what share of the top cryptocurrencies are currently trading above, inside, or below their 20-week SMA / 21-week EMA band.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'Crypto Market Breadth — BMSB',
    description: 'Share of top cryptocurrencies above, inside, or below their Bull Market Support Band.',
    url: URL,
    type: 'website',
  },
};

async function getBreadth() {
  // Latest BMSB position for active, non-stablecoin assets in the top ~150.
  const { data: cryptos } = await supabaseAdmin
    .from('cryptocurrencies')
    .select('id')
    .eq('is_active', true)
    .eq('is_stablecoin', false)
    .lte('current_rank', 150);

  const ids = (cryptos ?? []).map((c) => c.id);
  if (!ids.length) return { above: 0, inside: 0, below: 0, total: 0 };

  const { data: calcs } = await supabaseAdmin
    .from('bmsb_calculations')
    .select('cryptocurrency_id, price_position')
    .in('cryptocurrency_id', ids);

  // One latest row per asset (single calc date in practice; dedupe defensively).
  const seen = new Set<string>();
  let above = 0, inside = 0, below = 0;
  for (const c of calcs ?? []) {
    if (seen.has(c.cryptocurrency_id)) continue;
    seen.add(c.cryptocurrency_id);
    if (c.price_position === 'above_band') above++;
    else if (c.price_position === 'in_band') inside++;
    else if (c.price_position === 'below_band') below++;
  }
  return { above, inside, below, total: above + inside + below };
}

function pct(n: number, total: number): string {
  return total ? `${Math.round((n / total) * 100)}%` : '—';
}

export default async function Page() {
  const { above, inside, below, total } = await getBreadth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4 py-8">
      <article className="max-w-2xl mx-auto text-gray-200">
        <nav className="text-sm text-gray-400 mb-4">
          <Link href="/" className="hover:text-white">Dashboard</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">Market Breadth</span>
        </nav>

        <h1 className="text-3xl font-bold text-white mb-4">Crypto Market Breadth (BMSB)</h1>
        <p className="text-gray-300 mb-6">
          Market breadth measures how broadly the market is participating in a trend. Here it is the
          share of the top {total || 'tracked'} non-stablecoin cryptocurrencies currently trading
          above, inside, or below their <strong>Bull Market Support Band</strong> (20-week SMA /
          21-week EMA). A high &ldquo;above&rdquo; share indicates broad strength; a high
          &ldquo;below&rdquo; share indicates broad weakness.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{pct(above, total)}</div>
            <div className="text-gray-400 text-sm mt-1">Above band</div>
            <div className="text-gray-500 text-xs">{above} assets</div>
          </div>
          <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{pct(inside, total)}</div>
            <div className="text-gray-400 text-sm mt-1">Inside band</div>
            <div className="text-gray-500 text-xs">{inside} assets</div>
          </div>
          <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{pct(below, total)}</div>
            <div className="text-gray-400 text-sm mt-1">Below band</div>
            <div className="text-gray-500 text-xs">{below} assets</div>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-8">
          Updated approximately every 15 minutes. See the{' '}
          <Link href="/" className="text-blue-400 hover:underline">full dashboard</Link> for
          per-asset detail, or the{' '}
          <Link href="/methodology" className="text-blue-400 hover:underline">methodology</Link> for
          how breadth is computed.
        </p>

        <SiteFooterNav />
      </article>
    </div>
  );
}
