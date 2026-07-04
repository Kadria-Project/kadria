import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tarifs', '/demo', '/legal', '/privacy', '/terms'],
        disallow: [
          '/dashboard-v2',
          '/admin',
          '/parametres',
          '/demo-dashboard',
          '/client',
          '/login',
          '/register',
          '/projet',
          '/api',
        ],
      },
    ],
    sitemap: 'https://kadria.fr/sitemap.xml',
  };
}
