'use client'

import { useEffect, useState } from 'react'
import { BellRing, CircleCheck, Send, Smartphone } from 'lucide-react'

type Preferences = {
  new_appointment_enabled: boolean
  appointment_reminder_enabled: boolean
  appointment_changed_enabled: boolean
  appointment_cancelled_enabled: boolean
}

type Device = { id: string; device_label: string | null; created_at: string; revoked_at: string | null }

const defaultPreferences: Preferences = {
  new_appointment_enabled: true,
  appointment_reminder_enabled: true,
  appointment_changed_enabled: true,
  appointment_cancelled_enabled: true,
}

function supportsPush() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function needsIosInstall() {
  if (typeof window === 'undefined') return false
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return isIos && !standalone
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(normalized)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      const canUsePush = supportsPush()
      setSupported(canUsePush)
      setIosNeedsInstall(needsIosInstall())
      if (!canUsePush) { setLoading(false); return }
      navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setActive(Boolean(subscription))).catch(() => undefined)
      void load()
    })
  }, [])

  async function activate() {
    if (!supported || iosNeedsInstall) return
    setWorking(true); setMessage(null)
    try {
      const registration = await navigator.serviceWorker.register('/kadria-push-sw.js')
      if (await Notification.requestPermission() !== 'granted') { setMessage('Les notifications sont bloquées dans votre navigateur. Vous pouvez les réautoriser depuis les paramètres du site.'); return }
      const keyResponse = await fetch('/api/push/public-key', { cache: 'no-store' })
      const keyPayload = await keyResponse.json().catch(() => null)
      if (!keyResponse.ok || !keyPayload?.publicKey) throw new Error('Configuration indisponible')
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey) })
      const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) })
      if (!response.ok) throw new Error('Activation impossible')
      setActive(true); setMessage('Les notifications sont activées sur cet appareil.'); await load()
    } catch { setMessage('Kadria n’a pas pu activer les notifications. Réessayez dans un instant.') } finally { setWorking(false) }
  }

  async function deactivate() {
    setWorking(true); setMessage(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) { await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) }); await subscription.unsubscribe() }
      setActive(false); setMessage('Les notifications sont désactivées sur cet appareil.'); await load()
    } catch { setMessage('Kadria n’a pas pu désactiver cet appareil. Réessayez dans un instant.') } finally { setWorking(false) }
  }

  async function savePreference(key: keyof Preferences, value: boolean) {
    const previous = preferences
    setPreferences({ ...preferences, [key]: value })
    const response = await fetch('/api/push/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) })
    if (!response.ok) { setPreferences(previous); setMessage('Impossible d’enregistrer vos préférences. Réessayez dans un instant.') }
  }

  async function sendTest() {
    setWorking(true); setMessage(null)
    try { const response = await fetch('/api/push/test', { method: 'POST' }); if (!response.ok) throw new Error('Test impossible'); setMessage('La notification de test a été envoyée.') } catch { setMessage('Kadria n’a pas pu envoyer la notification de test.') } finally { setWorking(false) }
  }

  return <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
      <div className="flex items-start gap-4"><div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300"><BellRing size={22} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Notifications navigateur</p><h1 className="mt-2 text-2xl font-semibold text-white">Restez informé, même lorsque Kadria est fermé.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Kadria peut vous prévenir d’un nouveau rendez-vous, d’un changement ou d’un rendez-vous qui commence dans une heure.</p></div></div>
      {message && <p className="mt-5 rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-zinc-200">{message}</p>}
      <div className="mt-6 flex flex-wrap gap-3">{!supported ? <p className="text-sm text-zinc-400">Les notifications ne sont pas prises en charge par ce navigateur.</p> : iosNeedsInstall ? <p className="text-sm text-zinc-400">Sur iPhone ou iPad, ajoutez Kadria à l’écran d’accueil puis activez les notifications depuis l’application installée.</p> : active ? <button type="button" onClick={() => void deactivate()} disabled={working} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Désactiver sur cet appareil</button> : <button type="button" onClick={() => void activate()} disabled={working || loading} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{working ? 'Activation en cours…' : 'Activer les notifications sur cet appareil'}</button>}{active && <button type="button" onClick={() => void sendTest()} disabled={working} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 px-4 py-2.5 text-sm font-semibold text-emerald-200 disabled:opacity-60"><Send size={15} /> Envoyer une notification de test</button>}</div>
    </section>
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7"><h2 className="text-lg font-semibold text-white">Ce que vous souhaitez recevoir</h2><p className="mt-1 text-sm text-zinc-400">Le rappel est fixé à 1 heure avant le rendez-vous.</p><div className="mt-5 divide-y divide-white/10"><Preference label="Nouveaux rendez-vous" enabled={preferences.new_appointment_enabled} onChange={(value) => void savePreference('new_appointment_enabled', value)} /><Preference label="Rappel 1 heure avant" enabled={preferences.appointment_reminder_enabled} onChange={(value) => void savePreference('appointment_reminder_enabled', value)} /><Preference label="Modifications de rendez-vous" enabled={preferences.appointment_changed_enabled} onChange={(value) => void savePreference('appointment_changed_enabled', value)} /><Preference label="Annulations" enabled={preferences.appointment_cancelled_enabled} onChange={(value) => void savePreference('appointment_cancelled_enabled', value)} /><Preference label="Rendez-vous terminés à qualifier" enabled={false} disabled note="Disponible quand un suivi fiable sera enregistré dans Kadria." onChange={() => undefined} /></div></section>
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7"><div className="flex items-center gap-3"><Smartphone size={19} className="text-emerald-300" /><h2 className="text-lg font-semibold text-white">Vos appareils</h2></div>{loading ? <p className="mt-4 text-sm text-zinc-400">Chargement de vos appareils…</p> : devices.length ? <div className="mt-4 space-y-3">{devices.filter((device) => !device.revoked_at).map((device) => <div key={device.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3"><div><p className="text-sm font-medium text-white">{device.device_label || 'Navigateur activé'}</p><p className="mt-1 text-xs text-zinc-500">Activé le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(device.created_at))}</p></div><CircleCheck size={18} className="shrink-0 text-emerald-300" /></div>)}</div> : <p className="mt-4 text-sm text-zinc-400">Aucun appareil n’est encore activé.</p>}</section>
  </div>
}

function Preference({ label, enabled, disabled = false, note, onChange }: { label: string; enabled: boolean; disabled?: boolean; note?: string; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm text-zinc-200"><span><span className="block font-medium text-white">{label}</span>{note && <span className="mt-1 block text-xs text-zinc-500">{note}</span>}</span><input type="checkbox" checked={enabled} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-400 disabled:opacity-50" /></label>
}
