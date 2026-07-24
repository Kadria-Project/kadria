'use client'

import SettingsSection from '@/src/components/settings/SettingsSection'
import { CompanySettingsView } from '@/src/components/settings/company/CompanySettingsView'

export default function CompanySettingsPage() {
  return <SettingsSection section="company"><CompanySettingsView /></SettingsSection>
}
