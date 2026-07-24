'use client'

import SettingsSection from '@/src/components/settings/SettingsSection'
import { ActivitySettingsView } from '@/src/components/settings/activity/ActivitySettingsView'

export default function ActivitySettingsPage() {
  return <SettingsSection section="activity"><ActivitySettingsView /></SettingsSection>
}
