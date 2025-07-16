import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bbairtools.com'
  
  const routes = [
    '',
    '/find-airport',
    '/award-finder', 
    '/shortest-route',
    '/live-search',
    '/seat-type-delay',
    '/dashboard',
    '/settings',
    '/auth',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}