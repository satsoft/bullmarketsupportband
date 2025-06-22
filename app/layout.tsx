import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bull Market Support Band',
  description: 'Real-time Bull Market Support Band analysis for top 100 cryptocurrencies. Built by StableScarab.',
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