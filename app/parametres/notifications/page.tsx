import { BrowserPushSettings } from '@/src/components/notifications/BrowserPushSettings'
import KadriaAppShell from '@/src/components/workspace/KadriaAppShell'

export default function NotificationSettingsPage() {
  return <KadriaAppShell><main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8"><header className="mb-2"><h1 className="text-2xl font-semibold text-slate-900">Notifications</h1><p className="mt-2 text-sm text-slate-600">Choisissez comment et quand Kadria vous avertit.</p></header><BrowserPushSettings /></main></KadriaAppShell>
}
