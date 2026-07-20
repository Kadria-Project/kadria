'use client'
import SettingsSection from '@/src/components/settings/SettingsSection'; import { AssistantSettingsView } from '@/src/components/settings/assistants/AssistantSettingsView'
export default function AssistantsPage() { return <SettingsSection title="Assistants" description="Configurez les assistants utilisés pour accueillir, qualifier et orienter vos prospects."><AssistantSettingsView /></SettingsSection> }
