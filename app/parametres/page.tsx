import { redirect } from 'next/navigation'
import { resolveLegacySettingsDestination } from '@/src/lib/settings-navigation'

export default async function SettingsPage({ searchParams }: PageProps<'/parametres'>) {
  redirect(resolveLegacySettingsDestination('/parametres', await searchParams)!)
}
