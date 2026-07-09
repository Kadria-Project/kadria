import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResourceCollectionPage } from '@/src/components/resources/ResourceCollectionPage';
import { getCategoryFromSlug, getCategoryLabel, getResourcesByCategory, RESOURCE_CATEGORY_SLUGS } from '@/src/data/resources';

const CATEGORY_META: Record<
  Exclude<keyof typeof RESOURCE_CATEGORY_SLUGS, 'Métier'>,
  { title: string; description: string }
> = {
  'Cas d’utilisation': {
    title: 'Cas d’utilisation Kadria',
    description: 'Retrouvez tous les cas d’utilisation Academy pour voir comment Kadria transforme des situations terrain en dossiers plus exploitables.',
  },
  Guide: {
    title: 'Guides & conseils Kadria',
    description: 'Tous les guides Academy pour mieux gérer vos devis, vos relances et vos priorités commerciales.',
  },
  Fonctionnalité: {
    title: 'Fonctionnalités expliquées',
    description: 'Toutes les ressources Academy qui expliquent les briques produit Kadria et leur impact concret pour un artisan.',
  },
  Nouveautés: {
    title: 'Nouveautés Kadria',
    description: 'Tous les patch notes et points d’évolution Academy publiés sur Kadria.',
  },
};

export function generateStaticParams() {
  return Object.entries(RESOURCE_CATEGORY_SLUGS)
    .filter(([category]) => category !== 'Métier')
    .map(([, categorySlug]) => ({ categorySlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = getCategoryFromSlug(categorySlug);

  if (!category || category === 'Métier') {
    return {
      title: 'Catégorie introuvable | Kadria',
    };
  }

  const meta = CATEGORY_META[category];

  return {
    title: `${meta.title} | Kadria`,
    description: meta.description,
    alternates: {
      canonical: `/ressources/categories/${categorySlug}`,
    },
  };
}

export default async function ResourceCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  const category = getCategoryFromSlug(categorySlug);

  if (!category || category === 'Métier') {
    notFound();
  }

  const meta = CATEGORY_META[category];

  return (
    <ResourceCollectionPage
      title={meta.title}
      description={meta.description}
      resources={getResourcesByCategory(category)}
      backLabel={`Retour aux ${getCategoryLabel(category).toLowerCase()}`}
    />
  );
}
