'use client'

import { hasPermission } from '@/src/lib/team/permission-matrix'
import { PermissionGate } from '@/src/components/settings/PermissionGate'
import { ReadOnlyNotice } from '@/src/components/settings/ReadOnlyNotice'
import { SettingsPanel } from '@/src/components/settings/SettingsPanel'
import { useIntegrationSettingsData } from '@/src/hooks/useIntegrationSettingsData'

const date = (value: string | null) => value ? new Date(value).toLocaleString('fr-FR') : 'Aucune information disponible'

export function IntegrationSettingsView() {
  const data = useIntegrationSettingsData()
  const canManage = hasPermission(data.role ?? 'viewer', 'integrations.manage')
  if (data.loading) return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">Chargement des connexions…</div>

  return <PermissionGate role={data.role} permission="integrations.read" fallback={<ReadOnlyNotice message="Vous n’avez pas accès aux connexions." />}>
    <div className="space-y-4">
      <SettingsPanel title="Applications connectées" description="Choisissez les outils auxquels Kadria peut accéder pour vous aider au quotidien.">
        <article className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Google Calendar</h2><p className="mt-1 text-sm text-slate-600">Synchronisez votre agenda pour préparer et créer vos rendez-vous.</p></div><span className={data.calendar.connected ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'}>{data.calendar.connected ? 'Connecté' : 'Non connecté'}</span></div>
          {data.calendar.connected ? <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Compte utilisé</dt><dd className="font-medium text-slate-800">{data.calendar.email || 'Non communiqué'}</dd></div><div><dt className="text-slate-500">Connexion mise à jour</dt><dd className="font-medium text-slate-800">{date(data.calendar.updatedAt)}</dd></div><div><dt className="text-slate-500">Calendrier synchronisé</dt><dd className="font-medium text-slate-800">Agenda principal</dd></div><div><dt className="text-slate-500">Dernière connexion</dt><dd className="font-medium text-slate-800">{date(data.calendar.connectedAt)}</dd></div></dl> : <p className="mt-4 text-sm text-slate-600">Kadria n’accède pas encore à votre agenda. Vous gardez le contrôle tant que vous ne le connectez pas.</p>}
          {!canManage && <ReadOnlyNotice message="La gestion des connexions est réservée au propriétaire et aux administrateurs." />}
          {canManage && <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={data.connect} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">{data.calendar.connected ? 'Reconnecter Google Calendar' : 'Connecter Google Calendar'}</button>{data.calendar.connected && <button type="button" onClick={() => void data.disconnect()} disabled={data.action === 'disconnecting'} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60">{data.action === 'disconnecting' ? 'Déconnexion…' : 'Déconnecter'}</button>}</div>}
        </article>
      </SettingsPanel>
      <SettingsPanel title="Ce que Kadria est autorisé à faire" description="Les autorisations sont limitées à votre agenda Google et peuvent être retirées à tout moment.">
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-4"><p className="font-medium text-slate-900">Lire vos disponibilités</p><p className="mt-1 text-sm text-slate-600">Pour éviter les conflits lors de la préparation des rendez-vous.</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="font-medium text-slate-900">Créer des rendez-vous</p><p className="mt-1 text-sm text-slate-600">Uniquement lorsqu’un rendez-vous est confirmé dans Kadria.</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="font-medium text-slate-900">Modifier ou supprimer</p><p className="mt-1 text-sm text-slate-600">Non effectué par cette connexion depuis les paramètres.</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="font-medium text-slate-900">Vos identifiants</p><p className="mt-1 text-sm text-slate-600">Ils ne sont jamais affichés dans Kadria.</p></div></div>
      </SettingsPanel>
      <SettingsPanel title="Diagnostic" description="Comprendre rapidement l’état de la connexion sans afficher de données sensibles." status={data.calendar.connected ? 'complete' : 'optional'}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">État</dt><dd className="font-medium text-slate-800">{data.calendar.connected ? 'Prête à être utilisée' : 'Aucune connexion active'}</dd></div><div><dt className="text-slate-500">Dernière erreur</dt><dd className="font-medium text-slate-800">{data.error || 'Aucune'}</dd></div></dl>
        <p className="mt-4 text-sm text-slate-500">La synchronisation manuelle n’est pas disponible : Kadria vérifie l’agenda au moment où il en a besoin.</p>
      </SettingsPanel>
    </div>
  </PermissionGate>
}
