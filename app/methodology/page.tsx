import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooterNav } from '../components/SiteFooterNav';

const SITE = 'https://www.bullmarketsupportband.com';
const URL = `${SITE}/methodology`;

export const metadata: Metadata = {
  title: 'BMSB Methodology — How This Site Calculates the Band',
  description:
    'How BullMarketSupportBand.com calculates the Bull Market Support Band: data source, 20-week SMA and 21-week EMA formulas, weekly-candle definition and timezone, live-price handling, asset selection, stablecoin/RWA handling, missing-data rules, and update frequency.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'BMSB Methodology — How This Site Calculates the Band',
    description: 'Data sources, formulas, weekly candles, asset selection, and update frequency behind this BMSB dashboard.',
    url: URL,
    type: 'article',
  },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      <div className="text-gray-300 space-y-2">{children}</div>
    </section>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4 py-8">
      <article className="max-w-2xl mx-auto text-gray-200">
        <nav className="text-sm text-gray-400 mb-4">
          <Link href="/" className="hover:text-white">Dashboard</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">Methodology</span>
        </nav>

        <h1 className="text-3xl font-bold text-white mb-4">Methodology</h1>
        <p className="text-gray-300">
          The{' '}
          <Link href="/what-is-the-bull-market-support-band" className="text-blue-400 hover:underline">overview page</Link>{' '}
          explains what the Bull Market Support Band is. This page documents exactly how{' '}
          <strong>this website</strong> computes the values you see on the dashboard, so the numbers
          are reproducible and you understand why they may differ from other tools.
        </p>

        <Section title="Data source">
          <p>
            All price data comes from <strong>CoinGecko</strong> (a single provider, on the free
            Demo tier). Using one consistent source avoids discrepancies that arise from blending
            multiple exchange feeds.
          </p>
        </Section>

        <Section title="Calculation formulas">
          <p>The band is two weekly moving averages of the weekly closing price:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>20-week SMA</strong> = the average of the last 20 weekly closes (each week weighted equally).</li>
            <li><strong>21-week EMA</strong> = an exponential moving average over 21 weeks, weighting recent weeks more heavily.</li>
          </ul>
          <p>
            The <strong>band range</strong> is the zone between these two lines. Price is classified
            as <em>above</em>, <em>inside</em>, or <em>below</em> the band by comparing the latest
            price to the lower and upper edges.
          </p>
        </Section>

        <Section title="Weekly candles &amp; timezone">
          <p>
            Moving averages are computed on <strong>weekly candles</strong> using each week&rsquo;s
            close. Roughly a year of history (about 52–53 weekly closes) is stored per asset so the
            21-week EMA is stable. Weeks are derived consistently from CoinGecko&rsquo;s daily data;
            because different platforms start the week on different days/timezones, band values can
            differ slightly between sites.
          </p>
        </Section>

        <Section title="Live-price handling">
          <p>
            The most recent (in-progress) week uses the latest available price as its provisional
            close, so the band reflects current conditions. That latest value updates as new prices
            arrive and finalizes when the week closes.
          </p>
        </Section>

        <Section title="Asset selection">
          <p>
            The dashboard covers the <strong>top ~100 cryptocurrencies by market cap</strong>
            (roughly 150–200 assets are tracked so the top 100 stays populated after exclusions).
            Rankings refresh on a daily schedule.
          </p>
        </Section>

        <Section title="Stablecoin &amp; RWA handling">
          <p>
            The BMSB is not meaningful for assets designed to hold a steady value, so{' '}
            <strong>stablecoins and real-world-asset (RWA) tokens</strong> (e.g. tokenized
            treasuries) are excluded from the band analysis and grouped separately. Wrapped,
            derivative, and duplicate tokens (for example, redundant tokenized-gold listings) are
            also filtered out.
          </p>
        </Section>

        <Section title="Missing-data handling">
          <p>
            An asset needs enough weekly history (around 21 weeks) to produce a stable 20-week SMA
            and 21-week EMA. Assets without sufficient data, or without a completed BMSB
            calculation, are excluded from the ranked list rather than shown with incomplete values.
          </p>
        </Section>

        <Section title="Update frequency">
          <ul className="list-disc list-inside space-y-1">
            <li>Current prices refresh approximately every <strong>15 minutes</strong>.</li>
            <li>BMSB calculations refresh <strong>hourly</strong>.</li>
            <li>Asset discovery and rankings refresh <strong>daily</strong>; broader maintenance runs <strong>weekly</strong>.</li>
          </ul>
        </Section>

        <Section title="Not financial advice">
          <p>
            These values are provided for informational and educational purposes only. The Bull
            Market Support Band is a trend-context indicator, not a guaranteed signal, and nothing
            here is financial advice.
          </p>
        </Section>

        <div className="mt-8">
          <SiteFooterNav />
        </div>
      </article>
    </div>
  );
}
