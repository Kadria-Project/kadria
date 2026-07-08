import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResourceDetail } from '@/src/components/resources/ResourceDetail';
import { getAllResources, getResourceBySlug } from '@/src/data/resources';

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

  const title = `${resource.title} | Kadria`;

  return {
    title,
    description: resource.excerpt,
    alternates: {
      canonical: `/ressources/${resource.slug}`,
    },
    openGraph: {
      title,
      description: resource.excerpt,
      url: `https://kadria.fr/ressources/${resource.slug}`,
    },
    twitter: {
      title,
      description: resource.excerpt,
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

  return <ResourceDetail resource={resource} />;
}
