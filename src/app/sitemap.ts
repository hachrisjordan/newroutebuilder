import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bbairtools.com'

  // Static pages
  const staticPages = [
    '',
    '/dashboard',
    '/award-finder',
    '/shortest-route',
    '/find-airport',
    '/live-search',
    '/seat-type-delay',
    '/jetblue/etihad',
    '/settings',
    '/auth',
  ]

  return staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly' as 'daily' | 'weekly',
    priority: path === '' ? 1 : path.includes('dashboard') ? 0.8 : 0.6,
  }))
}