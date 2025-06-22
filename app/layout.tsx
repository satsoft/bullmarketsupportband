import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Bull Market Support Band - Real-time Crypto BMSB Analysis',
    template: '%s | Bull Market Support Band'
  },
  description: 'Real-time Bull Market Support Band analysis for top 100 cryptocurrencies. Track 20W SMA and 21W EMA support levels with live BMSB health indicators and TradingView charts.',
  keywords: [
    'cryptocurrency',
    'BMSB', 
    'bull market support band',
    'crypto analysis',
    'SMA',
    'EMA', 
    'bitcoin',
    'ethereum',
    'technical analysis',
    'crypto dashboard',
    'market support',
    'trading signals'
  ],
  authors: [{ name: 'StableScarab', url: 'https://x.com/StableScarab' }],
  creator: 'StableScarab',
  publisher: 'StableScarab',
  metadataBase: new URL('https://bullmarketsupportband.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bullmarketsupportband.com',
    title: 'Bull Market Support Band - Real-time Crypto BMSB Analysis',
    description: 'Real-time Bull Market Support Band analysis for top 100 cryptocurrencies with live BMSB health indicators and TradingView charts.',
    siteName: 'Bull Market Support Band',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Bull Market Support Band Dashboard - Real-time Crypto Analysis'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bull Market Support Band - Real-time Crypto BMSB Analysis',
    description: 'Real-time Bull Market Support Band analysis for top 100 cryptocurrencies with live BMSB health indicators.',
    creator: '@StableScarab',
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add Google Search Console verification when available
    // google: 'your-google-site-verification-code'
  },
  category: 'Financial Technology',
  classification: 'Cryptocurrency Analysis Tool',
  other: {
    'application-name': 'BMSB Dashboard',
    'msapplication-TileColor': '#2B5CE6',
    'theme-color': '#2B5CE6'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}