import { BrowserPushSettings } from '@/src/components/notifications/BrowserPushSettings'
import SettingsSection from '@/src/components/settings/SettingsSection'

export default function NotificationSettingsPage() {
  return <SettingsSection title="Notifications" description="Choisissez comment et quand Kadria vous avertit."><BrowserPushSettings /></SettingsSection>
}
