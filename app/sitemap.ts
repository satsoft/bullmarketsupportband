import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bullmarketsupportband.com'
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/api/bmsb-data`,
      lastModified: new Date(),
      changeFrequency: 'hourly', 
      priority: 0.8,
    },
    {
      url: `${baseUrl}/api/summary`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    }
  ]
}