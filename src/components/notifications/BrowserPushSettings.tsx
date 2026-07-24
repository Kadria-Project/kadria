'use client'

import { useEffect, useState } from 'react'
import { CircleCheck, Send } from 'lucide-react'
import { SettingsPanel } from '@/src/components/settings/SettingsPanel'

type Preferences = { new_appointment_enabled: boolean; appointment_reminder_enabled: boolean; appointment_changed_enabled: boolean; appointment_cancelled_enabled: boolean }
type Device = { id: string; device_label: string | null; created_at: string; revoked_at: string | null }

const defaultPreferences: Preferences = { new_appointment_enabled: true, appointment_reminder_enabled: true, appointment_changed_enabled: true, appointment_cancelled_enabled: true }

function supportsPush() { return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window }
function needsIosInstall() { if (typeof window === 'undefined') return false; const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent); const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone); return isIos && !standalone }
function urlBase64ToUint8Array(base64: string) { const padding = '='.repeat((4 - (base64.length % 4)) % 4); const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/'); const raw = window.atob(normalized); return Uint8Array.from(raw, (character) => character.charCodeAt(0)) }

export function BrowserPushSettings() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [devices, setDevices] = useState<Device[]>([])
  const [supported, setSupported] = useState(false)
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false)

  async function load() {
    try {
      const [preferencesResponse, devicesResponse] = await Promise.all([fetch('/api/push/preferences', { cache: 'no-store' }), fetch('/api/push/devices', { cache: 'no-store' })])
      const preferencesPayload = await preferencesResponse.json().catch(() => null)
      const devicesPayload = await devicesResponse.json().catch(() => null)
      if (preferencesResponse.ok && preferencesPayload?.preferences) setPreferences(preferencesPayload.preferences as Preferences)
      if (devicesResponse.ok && devicesPayload?.devices) setDevices(devicesPayload.devices as Device[])
    } finally { setLoading(false) }
  }

  useEffect(() => { queueMicrotask(() => { const canUsePush = supportsPush(); setSupported(canUsePush); setIosNeedsInstall(needsIosInstall()); if (!canUsePush) { setLoading(false); return }; navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setActive(Boolean(subscription))).catch(() => undefined); void load() }) }, [])

  async function activate() { if (!supported || iosNeedsInstall) return; setWorking(true); setMessage(null); try { const registration = await navigator.serviceWorker.register('/kadria-push-sw.js'); if (await Notification.requestPermission() !== 'granted') { setMessage('Les notifications sont bloquées dans votre navigateur. Vous pouvez les réautoriser depuis les paramètres du site.'); return }; const keyResponse = await fetch('/api/push/public-key', { cache: 'no-store' }); const keyPayload = await keyResponse.json().catch(() => null); if (!keyResponse.ok || !keyPayload?.publicKey) throw new Error('Configuration indisponible'); const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey) }); const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) }); if (!response.ok) throw new Error('Activation impossible'); setActive(true); setMessage('Les notifications sont activées sur cet appareil.'); await load() } catch { setMessage('Kadria n’a pas pu activer les notifications. Réessayez dans un instant.') } finally { setWorking(false) } }
  async function deactivate() { setWorking(true); setMessage(null); try { const registration = await navigator.serviceWorker.ready; const subscription = await registration.pushManager.getSubscription(); if (subscription) { await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) }); await subscription.unsubscribe() }; setActive(false); setMessage('Les notifications sont désactivées sur cet appareil.'); await load() } catch { setMessage('Kadria n’a pas pu désactiver cet appareil. Réessayez dans un instant.') } finally { setWorking(false) } }
  async function savePreference(key: keyof Preferences, value: boolean) { const previous = preferences; setPreferences({ ...preferences, [key]: value }); const response = await fetch('/api/push/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) }); if (!response.ok) { setPreferences(previous); setMessage('Impossible d’enregistrer vos préférences. Réessayez dans un instant.') } }
  async function sendTest() { setWorking(true); setMessage(null); try { const response = await fetch('/api/push/test', { method: 'POST' }); if (!response.ok) throw new Error('Test impossible'); setMessage('La notification de test a été envoyée.') } catch { setMessage('Kadria n’a pas pu envoyer la notification de test.') } finally { setWorking(false) } }

  return <div className="space-y-4">
    <SettingsPanel title="Notifications navigateur" description="Restez informé des rendez-vous importants, même lorsque Kadria est fermé." status={active ? 'complete' : 'optional'}>
      {message && <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p>}
      <div className={message ? 'mt-4 flex flex-wrap gap-2' : 'flex flex-wrap gap-2'}>{!supported ? <p className="text-sm text-slate-600">Les notifications ne sont pas prises en charge par ce navigateur.</p> : iosNeedsInstall ? <p className="text-sm text-slate-600">Sur iPhone ou iPad, ajoutez Kadria à l’écran d’accueil puis activez les notifications depuis l’application installée.</p> : active ? <button type="button" onClick={() => void deactivate()} disabled={working} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60">Désactiver sur cet appareil</button> : <button type="button" onClick={() => void activate()} disabled={working || loading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{working ? 'Activation en cours…' : 'Activer les notifications'}</button>}{active && <button type="button" onClick={() => void sendTest()} disabled={working} className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 disabled:opacity-60"><Send size={15} /> Envoyer un test</button>}</div>
    </SettingsPanel>
    <SettingsPanel title="Ce que vous souhaitez recevoir" description="Le rappel est envoyé une heure avant le rendez-vous."><div className="divide-y divide-slate-100"><Preference label="Nouveaux rendez-vous" enabled={preferences.new_appointment_enabled} onChange={(value) => void savePreference('new_appointment_enabled', value)} /><Preference label="Rappel 1 heure avant" enabled={preferences.appointment_reminder_enabled} onChange={(value) => void savePreference('appointment_reminder_enabled', value)} /><Preference label="Modifications de rendez-vous" enabled={preferences.appointment_changed_enabled} onChange={(value) => void savePreference('appointment_changed_enabled', value)} /><Preference label="Annulations" enabled={preferences.appointment_cancelled_enabled} onChange={(value) => void savePreference('appointment_cancelled_enabled', value)} /><Preference label="Rendez-vous terminés à qualifier" enabled={false} disabled note="Disponible quand un suivi fiable sera enregistré dans Kadria." onChange={() => undefined} /></div></SettingsPanel>
    <SettingsPanel title="Vos appareils" description="Les navigateurs autorisés à recevoir vos notifications.">{loading ? <p role="status" className="text-sm text-slate-500">Chargement de vos appareils…</p> : devices.length ? <div className="space-y-3">{devices.filter((device) => !device.revoked_at).map((device) => <div key={device.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div><p className="text-sm font-medium text-slate-900">{device.device_label || 'Navigateur activé'}</p><p className="mt-1 text-xs text-slate-500">Activé le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(device.created_at))}</p></div><CircleCheck size={18} className="shrink-0 text-emerald-600" /></div>)}</div> : <p className="text-sm text-slate-500">Aucun appareil n’est encore activé.</p>}</SettingsPanel>
  </div>
}

function Preference({ label, enabled, disabled = false, note, onChange }: { label: string; enabled: boolean; disabled?: boolean; note?: string; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm text-slate-700"><span><span className="block font-medium text-slate-900">{label}</span>{note && <span className="mt-1 block text-xs text-slate-500">{note}</span>}</span><input type="checkbox" checked={enabled} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-600 disabled:opacity-50" /></label>
}
