import type { Metadata } from 'next'
import Link from 'next/link'
import { Dashboard } from './components/Dashboard'
import { SiteFooterNav } from './components/SiteFooterNav'

const SITE = 'https://www.bullmarketsupportband.com'

export const metadata: Metadata = {
  alternates: { canonical: SITE },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      name: 'Bull Market Support Band',
      url: SITE,
      description:
        'Real-time Bull Market Support Band analysis for the top 100 cryptocurrencies.',
      publisher: { '@id': `${SITE}/#org` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE}/#org`,
      name: 'Bull Market Support Band',
      url: SITE,
      sameAs: ['https://x.com/StableScarab'],
    },
    {
      '@type': 'WebApplication',
      name: 'Bull Market Support Band Dashboard',
      description:
        'Real-time Bull Market Support Band analysis for top 100 cryptocurrencies. Track 20W SMA and 21W EMA support levels with live BMSB health indicators.',
      url: SITE,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: 'StableScarab', url: 'https://x.com/StableScarab' },
      featureList: [
        'Real-time cryptocurrency price tracking',
        'Bull Market Support Band calculations',
        '20-week Simple Moving Average analysis',
        '21-week Exponential Moving Average analysis',
        'TradingView chart integration',
        'Top 100 cryptocurrency coverage',
        'Market health indicators',
        'Live price updates approximately every 15 minutes',
      ],
    },
  ],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Interactive live dashboard stays immediately visible at the top */}
      <Dashboard />

      {/* Server-rendered intro + internal links: indexable content in the initial HTML,
          placed below the dashboard so it doesn't push the live data down. */}
      <section className="max-w-3xl mx-auto px-4 py-10 text-gray-300">
        <h2 className="text-2xl font-bold text-white mb-3">
          About the Bull Market Support Band
        </h2>
        <p className="mb-4">
          The <strong>Bull Market Support Band (BMSB)</strong> is a crypto trend indicator built
          from two weekly moving averages — the <strong>20-week simple moving average (SMA)</strong>{' '}
          and the <strong>21-week exponential moving average (EMA)</strong>. The zone between them
          tends to act as support in bull markets and resistance in bear markets. This dashboard
          tracks the live BMSB status of the <strong>top 100 cryptocurrencies</strong>.
        </p>
        <ul className="list-disc list-inside space-y-1 mb-4">
          <li><strong>Above the band</strong> — price is over both averages; the band tends to act as support (bullish trend).</li>
          <li><strong>Inside the band</strong> — price sits between the two averages; a zone of indecision.</li>
          <li><strong>Below the band</strong> — a weekly close under both averages; often read as weakening momentum.</li>
        </ul>
        <p className="mb-4">
          Prices refresh approximately every <strong>15 minutes</strong> and BMSB calculations
          update <strong>hourly</strong>; the band itself is driven by weekly closes. The BMSB is a
          trend-context tool, not a guaranteed signal.
        </p>
        <p className="mb-2">
          Learn more:{' '}
          <Link href="/what-is-the-bull-market-support-band" className="text-blue-400 hover:underline">
            What is the Bull Market Support Band?
          </Link>{' '}
          ·{' '}
          <Link href="/methodology" className="text-blue-400 hover:underline">How we calculate it</Link>{' '}
          ·{' '}
          <Link href="/market-breadth" className="text-blue-400 hover:underline">Market breadth</Link>
        </p>

        <div className="mt-8">
          <SiteFooterNav />
        </div>
      </section>
    </>
  )
}
