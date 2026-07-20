'use client'
import SettingsSection from '@/src/components/settings/SettingsSection'; import { IntegrationSettingsView } from '@/src/components/settings/integrations/IntegrationSettingsView'
export default function ConnectionsPage() { return <SettingsSection title="Connexions" description="Gérez les services externes connectés à votre espace Kadria."><IntegrationSettingsView /></SettingsSection> }
