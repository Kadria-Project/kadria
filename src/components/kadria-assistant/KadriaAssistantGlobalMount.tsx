'use client';

import { usePathname } from 'next/navigation';
import KadriaAssistantWidget from '@/src/components/kadria-assistant/KadriaAssistantWidget';

// Monte l'Assistant Kadria interne une seule fois pour tout l'espace artisan
// connecté (dashboard-v2, parametres, et leurs sous-pages). Conditionne
// l'affichage par pathname côté client afin de ne jamais l'exposer sur les
// pages publiques (landing, /projet prospect, /demo non connecté, auth,
// devis client, widget prospect embarqué, etc.).
export default function KadriaAssistantGlobalMount() {
  const pathname = usePathname();
  const isArtisanArea =
    !!pathname &&
    (pathname.startsWith('/dashboard-v2') || pathname.startsWith('/parametres'));

  if (!isArtisanArea) return null;

  return <KadriaAssistantWidget />;
}
