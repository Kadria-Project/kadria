'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Loader2, UserCog } from 'lucide-react'

export interface ProjectResponsibleOption {
  userId: string
  firstName: string
  lastName: string
  email: string
  role: string
  roleLabel: string
  jobTitle: string | null
  status: string
  displayName: string
  initials: string
}

interface ProjectResponsibleCardProps {
  responsibleUser: ProjectResponsibleOption | null
  responsibleUserId: string | null
  options: ProjectResponsibleOption[]
  canEdit: boolean
  loading?: boolean
  onChange?: (responsibleUserId: string | null) => Promise<void> | void
  compact?: boolean
  className?: string
}

function getStatusLabel(status?: string | null) {
  if (status === 'active') return 'Actif'
  if (status === 'suspended') return 'Suspendu'
  if (status === 'revoked') return 'Inactif'
  return 'Inconnu'
}

function getStatusTone(status?: string | null) {
  if (status === 'active') return 'border-green-500/20 bg-green-500/10 text-green-300'
  if (status === 'suspended') return 'border-amber-500/20 bg-amber-500/10 text-amber-200'
  return 'border-zinc-600/40 bg-zinc-800/70 text-zinc-300'
}

export function ProjectResponsibleInline({
  responsibleUser,
  responsibleUserId,
  compact = false,
}: Pick<ProjectResponsibleCardProps, 'responsibleUser' | 'responsibleUserId' | 'compact'>) {
  if (!responsibleUserId || !responsibleUser) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-200 ${compact ? '' : 'w-fit'}`}>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-200">
          ?
        </span>
        Non affecte
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(responsibleUser.status)} ${compact ? '' : 'w-fit'}`}>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold text-white">
        {responsibleUser.initials}
      </span>
      <span className="max-w-[140px] truncate">{responsibleUser.displayName}</span>
    </span>
  )
}

export default function ProjectResponsibleCard({
  responsibleUser,
  responsibleUserId,
  options,
  canEdit,
  loading = false,
  onChange,
  compact = false,
  className = '',
}: ProjectResponsibleCardProps) {
  const [saving, setSaving] = useState(false)
  const orderedOptions = useMemo(
    () => [...options].sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),
    [options],
  )

  const subtitle = responsibleUser
    ? [responsibleUser.roleLabel, responsibleUser.jobTitle, responsibleUser.status !== 'active' ? 'Membre inactif' : null]
        .filter(Boolean)
        .join(' · ')
    : 'Aucun responsable commercial defini'

  const handleChange = async (value: string) => {
    if (!onChange) return
    setSaving(true)
    try {
      await onChange(value === '__unassigned__' ? null : value)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${compact ? 'p-3' : 'p-4 sm:p-5'} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-[var(--text-1)]">Responsable du dossier</p>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            {subtitle}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${responsibleUser ? getStatusTone(responsibleUser.status) : 'border-amber-500/20 bg-amber-500/10 text-amber-200'}`}>
          {responsibleUser ? getStatusLabel(responsibleUser.status) : 'Non affecte'}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-hover)] text-sm font-bold text-[var(--text-1)]">
            {responsibleUser?.initials || <UserCog className="h-5 w-5 text-[var(--text-3)]" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-1)]">
              {responsibleUser?.displayName || 'Non affecte'}
            </p>
            <p className="truncate text-xs text-[var(--text-3)]">
              {responsibleUser?.email || 'Choisissez un responsable commercial pour ce dossier.'}
            </p>
          </div>
        </div>

        {canEdit ? (
          <div className="relative w-full sm:w-[280px]">
            <select
              value={responsibleUserId || '__unassigned__'}
              onChange={(event) => void handleChange(event.target.value)}
              disabled={saving || loading}
              className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2.5 pr-10 text-sm text-[var(--text-1)] outline-none transition focus:border-green-500/40"
            >
              <option value="__unassigned__">Non affecte</option>
              {orderedOptions.map((option) => (
                <option key={option.userId} value={option.userId}>
                  {option.displayName} · {option.roleLabel}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--text-3)]">
              {saving || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-3)]">
            Lecture seule
          </div>
        )}
      </div>
    </section>
  )
}
