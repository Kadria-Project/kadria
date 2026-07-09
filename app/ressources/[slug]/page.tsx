import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResourceDetail } from '@/src/components/resources/ResourceDetail';
import { getAllResources, getResourceBySlug } from '@/src/data/resources';

const SITE_URL = 'https://kadria.fr';

export function generateStaticParams() {
  return getAllResources().map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);

  if (!resource) {
    return { title: 'Ressource introuvable | Kadria' };
  }

  const defaultTitle =
    resource.category === 'Métier' ? `Kadria pour ${resource.title} | Kadria` : `${resource.title} | Kadria Academy`;
  const title = resource.seoTitle || defaultTitle;
  const description = resource.seoDescription || resource.excerpt;
  const url = `${SITE_URL}/ressources/${resource.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/ressources/${resource.slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function RessourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);

  if (!resource) {
    notFound();
  }

  const url = `${SITE_URL}/ressources/${resource.slug}`;
  const description = resource.seoDescription || resource.excerpt;

  const articleJsonLd =
    resource.category === 'Métier'
      ? {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: resource.title,
          description,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url,
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: resource.title,
          description,
          datePublished: resource.publishedAt,
          dateModified: resource.publishedAt,
          author: { '@type': 'Organization', name: 'Kadria' },
          publisher: { '@type': 'Organization', name: 'Kadria' },
          url,
        };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Ressources', item: `${SITE_URL}/ressources` },
      { '@type': 'ListItem', position: 3, name: resource.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ResourceDetail resource={resource} allResources={getAllResources()} />
    </>
  );
}
