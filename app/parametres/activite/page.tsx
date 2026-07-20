'use client'

import SettingsSection from '@/src/components/settings/SettingsSection'
import { ActivitySettingsView } from '@/src/components/settings/activity/ActivitySettingsView'

export default function ActivitySettingsPage() {
  return <SettingsSection title="Activité" description="Définissez les métiers, prestations, déplacements et règles de qualification utilisés par Kadria."><ActivitySettingsView /></SettingsSection>
}
