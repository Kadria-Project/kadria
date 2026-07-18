import { redirect } from 'next/navigation'

/** Route historique conservée pour les anciens liens métier. */
export default function LegacyBusinessProfilePage() {
  redirect('/parametres/activite')
}
