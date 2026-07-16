import { VitrineSite } from '@/src/components/site-vitrine/VitrineSite'
import { adElectricite } from '@/src/lib/site-vitrine/configs/ad-electricite'

/**
 * Démonstrateur de l'add-on « Site vitrine artisan » — AD Électricité
 * (électricien fictif, Reims). Route publique, hors matcher du middleware :
 * aucune authentification requise. Tout le contenu vient de la config typée
 * `adElectricite` ; décliner un autre métier = une autre config + une route.
 */
export default function SiteDemoElectricienPage() {
  return <VitrineSite config={adElectricite} />
}
