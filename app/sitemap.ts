import type { MetadataRoute } from 'next';
import { getAllResources } from '@/src/data/resources';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kadria.fr';
  const now = new Date();

  const resourceEntries: MetadataRoute.Sitemap = getAllResources().map((resource) => ({
    url: `${baseUrl}/ressources/${resource.slug}`,
    lastModified: new Date(resource.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/tarifs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ressources`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...resourceEntries,
    {
      url: `${baseUrl}/legal`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
