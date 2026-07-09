import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResourceCollectionPage } from '@/src/components/resources/ResourceCollectionPage';
import { getCategoryFromSlug, getCategoryLabel, getResourcesByCategory, RESOURCE_CATEGORY_SLUGS } from '@/src/data/resources';

const SITE_URL = 'https://kadria.fr';

const CATEGORY_META: Record<
  Exclude<keyof typeof RESOURCE_CATEGORY_SLUGS, 'Métier'>,
  { title: string; description: string; intro: string }
> = {
  'Cas d’utilisation': {
    title: 'Cas d’utilisation Kadria',
    description: 'Retrouvez tous les cas d’utilisation Academy pour voir comment Kadria transforme des situations terrain en dossiers plus exploitables.',
    intro:
      'Un artisan ne travaille pas avec des cas d’école. Il travaille avec un appel raccroché trop vite, un message WhatsApp envoyé un dimanche soir, une photo de chantier sans autre contexte. Cette catégorie rassemble des situations réelles, celles que vous croisez toutes les semaines, et montre comment Kadria les transforme en dossiers exploitables plutôt qu’en notes éparpillées. Pas de promesse d’intelligence artificielle magique : juste la mécanique concrète qui permet de garder une demande utile, du premier contact jusqu’au devis. Chaque cas d’utilisation part d’un problème terrain identifiable — une demande incomplète, un chantier perdu faute de suivi, une urgence mal priorisée — et détaille ce qui change une fois que Kadria structure l’information à votre place. L’objectif n’est pas de remplacer votre jugement d’artisan, mais de vous éviter le travail répétitif de tri, de relance et de mise en forme qui grignote vos soirées. Vous retrouverez ici des exemples directement inspirés de retours clients, pensés pour des métiers du bâtiment et de l’extérieur où chaque minute gagnée sur l’administratif est une minute rendue au chantier. Parcourez ces cas d’usage pour identifier celui qui ressemble le plus à votre quotidien, et voir concrètement comment l’organisation change une fois Kadria en place.',
  },
  Guide: {
    title: 'Guides & conseils Kadria',
    description: 'Tous les guides Academy pour mieux gérer vos devis, vos relances et vos priorités commerciales.',
    intro:
      'Bien utiliser Kadria, ce n’est pas seulement installer un outil : c’est ajuster quelques habitudes pour que le suivi commercial devienne un réflexe plutôt qu’une corvée. Cette catégorie regroupe des guides pratiques, écrits pour des artisans pressés, sans jargon logiciel ni promesse d’automatisation totale. Vous y trouverez des méthodes concrètes pour relancer un devis sans passer pour insistant, prioriser les chantiers qui comptent vraiment, ou préparer un dossier en fin de journée quand l’énergie n’est plus la même qu’au réveil. Chaque guide part d’un problème de gestion courant chez les artisans indépendants ou en petite équipe, et propose une démarche simple à reproduire, avec ou sans Kadria, mais que l’outil rend plus facile à tenir dans la durée. L’idée n’est pas de vous transformer en commercial, mais de vous donner des repères pour rester organisé sans y passer vos soirées. Ces contenus s’adressent aussi bien à un artisan qui débute avec Kadria qu’à celui qui cherche à professionnaliser son suivi commercial après plusieurs années d’activité. Consultez-les au fil de vos besoins : chaque guide se lit en quelques minutes et se traduit en actions applicables dès le prochain devis à relancer ou le prochain appel à qualifier.',
  },
  Fonctionnalité: {
    title: 'Fonctionnalités expliquées',
    description: 'Toutes les ressources Academy qui expliquent les briques produit Kadria et leur impact concret pour un artisan.',
    intro:
      'Derrière chaque fonctionnalité de Kadria, il y a un problème d’artisan précis que nous avons cherché à résoudre — pas une case à cocher pour un argumentaire commercial. Cette catégorie détaille les briques du produit une par une : le Profil Métier qui adapte les questions posées à votre activité, l’assistant vocal qui qualifie un appel entrant, la fiche projet qui centralise un dossier du premier contact à la signature. Chaque ressource explique ce que fait réellement la fonctionnalité, pourquoi elle existe, et surtout ce qu’elle change concrètement dans votre journée de travail. Nous évitons volontairement le vocabulaire technique et les formulations vagues autour de l’intelligence artificielle : l’objectif est que vous compreniez précisément ce que vous obtenez, sans survendre ni sous-expliquer. Ces contenus s’adressent aux artisans qui veulent savoir exactement ce qu’ils utilisent avant de s’en servir au quotidien, ainsi qu’à ceux qui hésitent encore et cherchent à comprendre si telle ou telle brique correspond à leur façon de travailler. Vous pouvez les parcourir dans l’ordre qui vous intéresse : chaque fiche est autonome et renvoie vers les autres fonctionnalités liées quand c’est pertinent, pour construire une vision d’ensemble du produit sans avoir à tout lire d’un coup.',
  },
  Nouveautés: {
    title: 'Nouveautés Kadria',
    description: 'Tous les patch notes et points d’évolution Academy publiés sur Kadria.',
    intro:
      'Kadria évolue régulièrement, souvent à partir de retours directs d’artisans qui utilisent le produit sur le terrain. Cette catégorie rassemble les patch notes et points d’évolution publiés mois après mois, pour que vous sachiez exactement ce qui a changé, pourquoi, et comment en tirer parti. Nous préférons des notes de version courtes et honnêtes plutôt que des annonces gonflées : une nouvelle fonctionnalité utile mérite d’être expliquée simplement, un ajustement mineur n’a pas besoin d’être présenté comme une révolution. Vous y retrouverez aussi bien des évolutions visibles, comme une nouvelle façon de suivre vos relances, que des améliorations plus discrètes qui fiabilisent le suivi de vos dossiers au quotidien. Ces publications s’adressent en priorité aux artisans déjà utilisateurs de Kadria qui veulent rester informés sans avoir à chercher l’information ailleurs, mais elles donnent aussi aux futurs clients une idée concrète du rythme d’amélioration du produit. Consultez cette catégorie régulièrement pour ne rien manquer, ou revenez-y ponctuellement pour vérifier si une fonctionnalité que vous attendiez est enfin disponible.',
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
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { categorySlug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const category = getCategoryFromSlug(categorySlug);

  if (!category || category === 'Métier') {
    notFound();
  }

  const meta = CATEGORY_META[category];
  const canonicalUrl = `${SITE_URL}/ressources/categories/${categorySlug}`;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.description,
    url: canonicalUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <ResourceCollectionPage
        title={meta.title}
        description={meta.description}
        intro={meta.intro}
        resources={getResourcesByCategory(category)}
        backLabel={`Retour aux ${getCategoryLabel(category).toLowerCase()}`}
        page={resolvedSearchParams.page}
        basePath={`/ressources/categories/${categorySlug}`}
      />
    </>
  );
}
