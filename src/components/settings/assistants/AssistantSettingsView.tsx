'use client'

import { useState } from 'react'
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline'
import { ReadOnlyNotice } from '@/src/components/settings/ReadOnlyNotice'
import { SettingsPanel } from '@/src/components/settings/SettingsPanel'
import { hasPermission } from '@/src/lib/team/permission-matrix'
import { getInstallationState, isWhiteLabelAllowed, type AssistantSettingsDomain } from '@/src/lib/settings/assistant-contract'
import { useAssistantSettingsData } from '@/src/hooks/useAssistantSettingsData'

const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50'
type Data = ReturnType<typeof useAssistantSettingsData>

function Feedback({ message }: { message?: string }) {
  if (!message) return null
  return <p className={message === 'Enregistré' || message.includes('importée') || message.includes('Copié') ? 'mt-3 text-sm text-emerald-700' : 'mt-3 text-sm text-red-600'}>{message}</p>
}

export function AssistantSettingsView() {
  const data = useAssistantSettingsData()
  if (data.loading) return <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Chargement des réglages de l’assistant…</div>
  return <AssistantSettingsContent key={JSON.stringify(data.values)} data={data} />
}

function AssistantSettingsContent({ data }: { data: Data }) {
  const [draft, setDraft] = useState(data.values)
  const [copyMessage, setCopyMessage] = useState('')
  const canEdit = hasPermission(data.role ?? 'viewer', 'business_settings.update')
  const whiteLabelAvailable = isWhiteLabelAllowed(draft.plan)
  const installation = getInstallationState(draft.artisanId, data.messages.load)
  const set = <K extends keyof typeof draft>(key: K, value: typeof draft[K]) => setDraft(current => ({ ...current, [key]: value }))
  const save = (domain: AssistantSettingsDomain, keys: Array<keyof typeof draft>) => void data.save(domain, Object.fromEntries(keys.map(key => [key, draft[key]])))
  const copyScript = async () => {
    if (!data.script) return
    try { await navigator.clipboard.writeText(data.script); setCopyMessage('Script copié') } catch { setCopyMessage('La copie a échoué. Sélectionnez le script manuellement.') }
  }
  const upload = (target: 'assistant_avatar' | 'white_label_logo', file?: File) => { if (file) void data.upload(target, file) }

  return <div className="space-y-4">
    {data.messages.load && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{data.messages.load}</p>}
    {!canEdit && <ReadOnlyNotice message="Vous pouvez prévisualiser le widget, mais seuls le propriétaire et les administrateurs peuvent modifier ses réglages." />}

    <SettingsPanel title="Identité de l’assistant" description="Ces éléments sont visibles lorsque Kadria accueille un visiteur dans le widget." status={canEdit ? (draft.welcomeName || draft.welcomeMessage ? 'complete' : 'incomplete') : 'read-only'}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Nom affiché<input className={input} disabled={!canEdit} value={draft.welcomeName} onChange={e => set('welcomeName', e.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Affiché dans le widget et les échanges visibles par vos clients.</span></label>
        <label className="text-sm font-medium text-slate-700">Message d’accueil<input className={input} disabled={!canEdit} value={draft.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Première phrase affichée à l’ouverture du widget.</span></label>
        <label className="text-sm font-medium text-slate-700">Avatar de l’assistant<input aria-label="Importer un avatar" disabled={!canEdit || data.uploading === 'assistant_avatar'} type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block text-sm" onChange={e => upload('assistant_avatar', e.target.files?.[0])} /><span className="mt-1 block text-xs font-normal text-slate-500">PNG, JPG ou WebP, 4 Mo maximum. Il est distinct du logo de l’entreprise.</span></label>
      </div>
      <div className="mt-4 flex items-center gap-3"><button type="button" disabled={!canEdit || data.saving.identity} onClick={() => save('identity', ['welcomeName', 'welcomeMessage', 'assistantAvatarType', 'assistantAvatarUrl'])} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">{data.saving.identity ? 'Sauvegarde…' : 'Enregistrer'}</button>{data.uploading === 'assistant_avatar' && <span className="text-sm text-slate-500">Import de l’avatar…</span>}</div>
      <Feedback message={data.messages.identity || data.messages.upload} />
    </SettingsPanel>

    <SettingsPanel title="Apparence du widget" description="Personnalisez l’apparence visible par vos visiteurs. L’aperçu reflète vos valeurs locales avant sauvegarde." status={canEdit ? 'optional' : 'read-only'}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Couleur principale<input aria-label="Couleur principale" disabled={!canEdit} type="color" className="mt-2 block h-10 w-16" value={draft.primaryColor} onChange={e => set('primaryColor', e.target.value)} /></label>
        <label className="text-sm font-medium text-slate-700">Couleur secondaire<input aria-label="Couleur secondaire" disabled={!canEdit} type="color" className="mt-2 block h-10 w-16" value={draft.secondaryColor} onChange={e => set('secondaryColor', e.target.value)} /></label>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4"><label className="flex items-start gap-2 text-sm font-medium text-slate-700"><input disabled={!canEdit || !whiteLabelAvailable} type="checkbox" checked={draft.whiteLabelEnabled} onChange={e => set('whiteLabelEnabled', e.target.checked)} /><span>Masquer la mention Kadria dans le widget web lorsque votre offre l’autorise.<span className="mt-1 block text-xs font-normal text-slate-500">{whiteLabelAvailable ? 'Disponible avec votre offre. Le serveur revalide ce droit à chaque sauvegarde et rendu public.' : 'Non disponible avec votre offre actuelle. Aucun réglage n’est activé.'}</span></span></label>{whiteLabelAvailable && <label className="mt-4 block text-sm font-medium text-slate-700">Logo de marque blanche<input aria-label="Importer un logo de marque blanche" disabled={!canEdit || !draft.whiteLabelEnabled || data.uploading === 'white_label_logo'} type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block text-sm" onChange={e => upload('white_label_logo', e.target.files?.[0])} /></label>}</div>
      <div className="mt-4 flex items-center gap-3"><button type="button" disabled={!canEdit || data.saving.appearance} onClick={() => save('appearance', ['primaryColor', 'secondaryColor', 'widgetColorMode', 'whiteLabelEnabled', 'widgetBrandName', 'widgetBrandLogoUrl'])} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">{data.saving.appearance ? 'Sauvegarde…' : 'Enregistrer'}</button>{data.uploading === 'white_label_logo' && <span className="text-sm text-slate-500">Import du logo…</span>}</div>
      <Feedback message={data.messages.appearance || data.messages.upload} />
    </SettingsPanel>

    <SettingsPanel title="Aperçu du widget" description="Vos clients verront ce parcours. Les modifications locales sont visibles ici avant enregistrement." status="optional"><div className="h-[420px] overflow-hidden rounded-xl border border-slate-200"><ChatWidgetInline artisanId={draft.artisanId} artisanName={draft.companyName || 'Votre entreprise'} primaryColor={draft.primaryColor} secondaryColor={draft.secondaryColor} widgetColorMode={draft.widgetColorMode} welcomeNameOverride={draft.welcomeName} welcomeMessageOverride={draft.welcomeMessage} assistantAvatarType={draft.assistantAvatarType} assistantAvatarUrl={draft.assistantAvatarUrl} logoUrl={draft.logoUrl} whiteLabelEnabled={draft.whiteLabelEnabled} widgetBrandName={draft.widgetBrandName} widgetBrandLogoUrl={draft.widgetBrandLogoUrl} companyNameOverride={draft.companyName} planOverride={draft.plan} fitParentHeight previewMode /></div></SettingsPanel>

    <SettingsPanel title="Installation sur votre site" description="Ajoutez ce script une seule fois avant la fermeture de la balise body pour rendre le widget disponible." status={installation === 'ready' ? 'complete' : installation === 'error' ? 'unavailable' : 'incomplete'}>
      {installation === 'ready' && <><code className="block overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{data.script}</code><button type="button" onClick={() => void copyScript()} className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copyMessage === 'Script copié' ? 'Copié' : 'Copier le script'}</button><Feedback message={copyMessage} /></>}
      {installation === 'missing-public-id' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Le script n’est pas encore disponible : l’identifiant public de l’entreprise est absent. Il doit être généré côté serveur ; contactez un administrateur si cet état persiste.</p>}
      {installation === 'error' && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Le script n’a pas pu être chargé. Réessayez après avoir rechargé la page.</p>}
      <p className="mt-3 text-xs text-slate-500">L’installation sur un site externe ne peut pas être vérifiée automatiquement par Kadria.</p>
    </SettingsPanel>

    <SettingsPanel title="Assistant vocal" description="L’assistant vocal est géré automatiquement par Kadria. Aucun réglage utilisateur n’est exposé par les contrats actuels." status="unavailable"><p className="text-sm text-slate-600">Aucune configuration vocale n’est disponible dans cet espace.</p></SettingsPanel>
  </div>
}
