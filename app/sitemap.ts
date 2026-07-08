import type { MetadataRoute } from 'next';
import { ARTISAN_TRADES } from '@/src/config/trades';
import { getAllResources, getResourceBySlug } from '@/src/data/resources';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kadria.fr';
  const now = new Date();
  const resources = getAllResources();
  const academyResource = getResourceBySlug('profil-metier-kadria');
  const resourcesLastModified = resources.reduce<Date>(
    (latest, resource) => {
      const publishedAt = new Date(resource.publishedAt);
      return publishedAt > latest ? publishedAt : latest;
    },
    new Date(0),
  );
  const tradeResourcesLastModified = academyResource
    ? new Date(academyResource.publishedAt)
    : resourcesLastModified;

  const resourceEntries: MetadataRoute.Sitemap = resources.map((resource) => ({
    url: `${baseUrl}/ressources/${resource.slug}`,
    lastModified: new Date(resource.publishedAt),
    changeFrequency: 'monthly',
    priority: resource.slug === 'profil-metier-kadria' ? 0.8 : 0.5,
  }));

  const tradeEntries: MetadataRoute.Sitemap = ARTISAN_TRADES
    .filter((trade) => trade.value !== 'autre')
    .map((trade) => ({
      url: `${baseUrl}/ressources/metiers/${trade.value}`,
      lastModified: tradeResourcesLastModified,
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
      lastModified: resourcesLastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ressources/metiers`,
      lastModified: tradeResourcesLastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...resourceEntries,
    ...tradeEntries,
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
