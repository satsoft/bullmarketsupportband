import { MetadataRoute } from 'next'
import { ASSET_PAGES, assetPath } from '../lib/asset-pages'

// Single source of truth for the sitemap. Lists real HTML pages only — no JSON API
// endpoints — and uses the canonical www host.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.bullmarketsupportband.com'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/what-is-the-bull-market-support-band`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/market-breadth`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ]

  const assetPages: MetadataRoute.Sitemap = ASSET_PAGES.map((a) => ({
    url: `${baseUrl}${assetPath(a)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }))

  return [...staticPages, ...assetPages]
}
