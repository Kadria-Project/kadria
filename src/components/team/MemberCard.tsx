'use client'

import { motion } from 'motion/react'
import { TEAM_ROLE_LABELS, type TeamMember, type TenantRole } from '@/src/lib/team/types'

function initials(member: TeamMember) {
  const first = member.firstName?.[0] || ''
  const last = member.lastName?.[0] || ''
  const combined = `${first}${last}`.toUpperCase()
  return combined || member.email.slice(0, 2).toUpperCase()
}

export function MemberCard({
  member,
  canManage,
  onRoleChange,
  onToggleSuspend,
  onRemove,
}: {
  member: TeamMember
  canManage: boolean
  onRoleChange: (role: string) => void
  onToggleSuspend: () => void
  onRemove: () => void
}) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className="rounded-[18px] border border-white/10 bg-black/20 p-4 hover:shadow-[0_8px_24px_rgba(34,197,94,0.08)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/10 text-sm font-semibold text-[#4ade80]">
            {initials(member)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{name}</p>
            <p className="mt-1 truncate text-sm text-zinc-400">{member.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>{TEAM_ROLE_LABELS[member.role]}</Chip>
              <Chip>{member.jobTitle || 'Fonction non renseignée'}</Chip>
              <Chip tone={member.status === 'active' ? 'green' : member.status === 'suspended' ? 'amber' : 'red'}>
                {member.status === 'active' ? 'Actif' : member.status === 'suspended' ? 'Suspendu' : 'Révoqué'}
              </Chip>
            </div>
            {/* Dernière connexion : la donnée n'existe pas dans la réponse de /api/team
                (le type TeamMember n'expose que lastActiveAt, potentiellement null et
                non garanti comme "dernière connexion" réelle côté auth). Affichée
                uniquement si présente, jamais fabriquée. */}
            {member.lastActiveAt && (
              <p className="mt-2 text-xs text-zinc-500">Dernière activité : {new Date(member.lastActiveAt).toLocaleString('fr-FR')}</p>
            )}
          </div>
        </div>

        {canManage && (
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
            <select
              value={member.role}
              onChange={(event) => onRoleChange(event.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-[#101214] px-3 text-sm text-white outline-none"
            >
              {(['owner', 'admin', 'manager', 'member', 'viewer'] as TenantRole[]).map((role) => (
                <option key={role} value={role}>
                  {TEAM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleSuspend}
              className="h-11 rounded-xl border border-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/[0.04]"
            >
              {member.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="h-11 rounded-xl border border-rose-500/20 px-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 sm:col-span-2"
            >
              Retirer
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Chip({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'green' | 'amber' | 'red'
}) {
  const toneClass =
    tone === 'green'
      ? 'border-[#22c55e]/20 bg-[#22c55e]/10 text-[#4ade80]'
      : tone === 'amber'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
        : tone === 'red'
          ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
          : 'border-white/10 bg-white/[0.04] text-zinc-200'
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
}
