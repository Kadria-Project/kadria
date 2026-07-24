import { redirect } from 'next/navigation'
import { resolveLegacySettingsDestination } from '@/src/lib/settings-navigation'

/** Route historique conservée pour les anciens liens métier. */
export default function LegacyBusinessProfilePage() {
  redirect(resolveLegacySettingsDestination('/parametres/profil-metier')!)
}
