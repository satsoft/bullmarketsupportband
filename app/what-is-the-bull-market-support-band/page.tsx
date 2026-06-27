import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooterNav } from '../components/SiteFooterNav';

const SITE = 'https://www.bullmarketsupportband.com';
const URL = `${SITE}/what-is-the-bull-market-support-band`;

export const metadata: Metadata = {
  title: 'What Is the Bull Market Support Band?',
  description:
    'A clear explanation of the Bull Market Support Band (BMSB): the 20-week SMA and 21-week EMA, why traders watch it, what above/inside/below means, its limitations, and why values differ between platforms.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'What Is the Bull Market Support Band?',
    description:
      'The Bull Market Support Band explained: 20-week SMA, 21-week EMA, how to read it, and its limitations.',
    url: URL,
    type: 'article',
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is the Bull Market Support Band?',
    a: 'The Bull Market Support Band (BMSB) is a technical indicator made up of two weekly moving averages — the 20-week simple moving average (SMA) and the 21-week exponential moving average (EMA). The zone between them often acts as support during bull markets and resistance during bear markets.',
  },
  {
    q: 'What does it mean when an asset is above the band?',
    a: 'When price trades above both the 20-week SMA and 21-week EMA, the band tends to act as support and the longer-term trend is generally considered bullish.',
  },
  {
    q: 'What happens when an asset falls below the band?',
    a: 'A weekly close below the band is often read as a loss of bullish momentum, with the band then frequently acting as overhead resistance. It is a signal of trend weakness, not a guaranteed reversal.',
  },
  {
    q: 'Which timeframe does the BMSB use?',
    a: 'It is a weekly indicator: the 20-period SMA and 21-period EMA are calculated on weekly candles, which is why it reflects the longer-term trend rather than short-term moves.',
  },
  {
    q: 'Is the Bull Market Support Band a reliable signal?',
    a: 'It is a trend-context tool, not a guaranteed buy/sell signal. Like all moving-average indicators it lags price, can whipsaw in choppy markets, and should be combined with other analysis and risk management.',
  },
];

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-2xl mx-auto text-gray-200">
        <nav className="text-sm text-gray-400 mb-4">
          <Link href="/" className="hover:text-white">Dashboard</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">What is the BMSB?</span>
        </nav>

        <h1 className="text-3xl font-bold text-white mb-4">What Is the Bull Market Support Band?</h1>

        <p className="mb-4">
          The <strong>Bull Market Support Band (BMSB)</strong> is a popular crypto technical
          indicator made up of two weekly moving averages plotted together as a band. The area
          between the two lines tends to act as <em>support</em> during bull markets and as{' '}
          <em>resistance</em> during bear markets — which is where the name comes from.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-2">The two lines</h2>
        <ul className="list-disc list-inside space-y-2 mb-4">
          <li><strong>20-week SMA</strong> — the simple moving average of the last 20 weekly closes. It weights every week equally and reacts slowly.</li>
          <li><strong>21-week EMA</strong> — the exponential moving average over 21 weeks. It weights recent weeks more heavily, so it reacts a little faster than the SMA.</li>
        </ul>
        <p className="mb-4">
          Plotted together, the two lines form a band rather than a single level. The small gap
          between them is the &ldquo;support band.&rdquo;
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-2">Why traders watch it</h2>
        <p className="mb-4">
          Because it is built from weekly data, the BMSB filters out day-to-day noise and gives a
          read on the <strong>longer-term trend</strong>. Historically, major crypto assets have
          spent bull markets holding above the band and bear markets trading below it, so the band
          is used as a simple regime filter.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-2">Above, inside, or below</h2>
        <ul className="list-disc list-inside space-y-2 mb-4">
          <li><strong>Above the band</strong> — price is over both moving averages; the band tends to act as support and the trend is generally read as bullish.</li>
          <li><strong>Inside the band</strong> — price is between the two averages; a zone of indecision near the longer-term trend.</li>
          <li><strong>Below the band</strong> — a weekly close under both averages; often read as a loss of momentum, with the band acting as resistance.</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-8 mb-2">Limitations</h2>
        <p className="mb-4">
          The BMSB is a <strong>lagging</strong> indicator: moving averages are built from past
          prices, so the band reacts after moves have begun. In sideways or choppy markets price can
          cross the band repeatedly (whipsaw). It is also just one lens — it says nothing about
          fundamentals, liquidity, or news. <strong>It is not a guaranteed market signal</strong> and
          should be combined with other analysis and risk management.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-2">Why values differ between platforms</h2>
        <p className="mb-4">
          Different sites can show slightly different band values because of how they define the
          weekly candle (which day the week starts, and the timezone), how they treat the current
          in-progress week, and which exchange&rsquo;s price feed they use. This site documents its
          exact approach on the{' '}
          <Link href="/methodology" className="text-blue-400 hover:underline">methodology page</Link>.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">Frequently asked questions</h2>
        <div className="space-y-4 mb-8">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="text-gray-300">{f.a}</p>
            </div>
          ))}
        </div>

        <p className="mb-8">
          See the live{' '}
          <Link href="/" className="text-blue-400 hover:underline">Bull Market Support Band dashboard</Link>{' '}
          for the current band status of the top 100 cryptocurrencies.
        </p>

        <SiteFooterNav />
      </article>
    </div>
  );
}
