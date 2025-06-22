import { Dashboard } from './components/Dashboard'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Bull Market Support Band Dashboard',
  description: 'Real-time Bull Market Support Band analysis for top 100 cryptocurrencies. Track 20W SMA and 21W EMA support levels with live BMSB health indicators.',
  url: 'https://bullmarketsupportband.com',
  author: {
    '@type': 'Person',
    name: 'StableScarab',
    url: 'https://x.com/StableScarab'
  },
  applicationCategory: 'Financial Analysis Tool',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD'
  },
  featureList: [
    'Real-time cryptocurrency price tracking',
    'Bull Market Support Band calculations',
    '20-week Simple Moving Average analysis', 
    '21-week Exponential Moving Average analysis',
    'TradingView chart integration',
    'Top 100 cryptocurrency coverage',
    'Market health indicators',
    'Live price updates every 10 minutes'
  ],
  sameAs: [
    'https://x.com/StableScarab'
  ],
  mainEntity: {
    '@type': 'Dataset',
    name: 'Cryptocurrency BMSB Analysis Data',
    description: 'Real-time Bull Market Support Band data for top 100 cryptocurrencies',
    creator: {
      '@type': 'Person', 
      name: 'StableScarab'
    },
    temporalCoverage: '2024/..',
    spatialCoverage: 'Global',
    keywords: ['cryptocurrency', 'BMSB', 'technical analysis', 'moving averages']
  }
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Dashboard />
    </>
  )
}