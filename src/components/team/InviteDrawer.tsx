'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { UserPlus, X } from 'lucide-react'
import {
  TEAM_JOB_TITLE_SUGGESTIONS,
  type TenantRole,
} from '@/src/lib/team/types'

export type InviteFormState = {
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  role: TenantRole
  message: string
}

type RoleCardDef = {
  role: TenantRole
  emoji: string
  title: string
  description: string
}

const ROLE_CARDS: RoleCardDef[] = [
  { role: 'member', emoji: '\u{1F464}', title: 'Collaborateur', description: 'Travaille sur les dossiers et rendez-vous qui lui sont confies.' },
  { role: 'manager', emoji: '\u{1F468}\u200D\u{1F4BC}', title: 'Responsable', description: "Suit l'activite et consulte l'ensemble des dossiers." },
  { role: 'admin', emoji: '\u2699\uFE0F', title: 'Administrateur', description: "Gere l'equipe, les dossiers et les reglages." },
]

type PermissionKey =
  | 'canManageTeam'
  | 'canViewAllProjects'
  | 'canEditProjects'
  | 'canManagePlanning'
  | 'canBeScheduled'
  | 'readOnly'

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  canManageTeam: "Peut gerer l'equipe",
  canViewAllProjects: 'Peut voir tous les dossiers',
  canEditProjects: 'Peut modifier les dossiers',
  canManagePlanning: 'Peut gerer le planning',
  canBeScheduled: 'Peut etre prevu sur un rendez-vous',
  readOnly: 'Peut seulement consulter',
}

const ROLE_PERMISSION_PREVIEW: Record<TenantRole, PermissionKey[]> = {
  member: ['canEditProjects', 'canManagePlanning', 'canBeScheduled'],
  manager: ['canViewAllProjects', 'canEditProjects', 'canManagePlanning', 'canBeScheduled'],
  admin: ['canManageTeam', 'canViewAllProjects', 'canEditProjects', 'canManagePlanning', 'canBeScheduled'],
  owner: ['canManageTeam', 'canViewAllProjects', 'canEditProjects', 'canManagePlanning', 'canBeScheduled'],
  viewer: ['readOnly'],
}

export function InviteDrawer({
  open,
  onClose,
  form,
  onFormChange,
  onSubmit,
  submitting,
}: {
  open: boolean
  onClose: () => void
  form: InviteFormState
  onFormChange: (next: InviteFormState) => void
  onSubmit: () => void
  submitting: boolean
}) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const activePermissions = ROLE_PERMISSION_PREVIEW[form.role] || []
  const dragControls = useDragControls()
  const dragHandleRef = useRef<HTMLDivElement | null>(null)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className="absolute inset-y-0 right-0 hidden w-full max-w-[520px] flex-col overflow-hidden border-l border-white/10 bg-[#0f1113] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:flex"
            onClick={(event) => event.stopPropagation()}
          >
            <DrawerContent
              form={form}
              onFormChange={onFormChange}
              onSubmit={onSubmit}
              onClose={onClose}
              submitting={submitting}
              activePermissions={activePermissions}
            />
          </motion.div>

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 120 || info.velocity.y > 800) {
                onClose()
              }
            }}
            className="absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col overflow-hidden rounded-t-[24px] border-t border-white/10 bg-[#0f1113] shadow-[0_-24px_80px_rgba(0,0,0,0.45)] sm:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              ref={dragHandleRef}
              onPointerDown={(event) => dragControls.start(event)}
              className="flex shrink-0 cursor-grab touch-none justify-center py-2 active:cursor-grabbing"
            >
              <div className="h-1.5 w-10 rounded-full bg-white/20" />
            </div>
            <DrawerContent
              form={form}
              onFormChange={onFormChange}
              onSubmit={onSubmit}
              onClose={onClose}
              submitting={submitting}
              activePermissions={activePermissions}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function DrawerContent({
  form,
  onFormChange,
  onSubmit,
  onClose,
  submitting,
  activePermissions,
}: {
  form: InviteFormState
  onFormChange: (next: InviteFormState) => void
  onSubmit: () => void
  onClose: () => void
  submitting: boolean
  activePermissions: PermissionKey[]
}) {
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/10 text-[#4ade80]">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">Inviter un collaborateur</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Le collaborateur recevra un email pour rejoindre votre espace Kadria.
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
        <SectionTitle>Informations</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prenom" value={form.firstName} onChange={(value) => onFormChange({ ...form, firstName: value })} />
          <Field label="Nom" value={form.lastName} onChange={(value) => onFormChange({ ...form, lastName: value })} />
        </div>
        <div className="mt-4">
          <Field label="Adresse email" value={form.email} onChange={(value) => onFormChange({ ...form, email: value })} type="email" />
        </div>

        <SectionTitle className="mt-7">Fonction</SectionTitle>
        <label className="block">
          <input
            list="team-job-titles"
            value={form.jobTitle}
            placeholder="Chef d'equipe, assistante, technicien, conducteur de travaux..."
            onChange={(event) => onFormChange({ ...form, jobTitle: event.target.value })}
            className="h-11 w-full rounded-xl border border-white/10 bg-[#101214] px-4 text-sm text-white outline-none placeholder:text-zinc-600"
          />
          <datalist id="team-job-titles">
            {TEAM_JOB_TITLE_SUGGESTIONS.map((jobTitle) => (
              <option key={jobTitle} value={jobTitle} />
            ))}
          </datalist>
        </label>

        <SectionTitle className="mt-7">Role dans l'equipe</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLE_CARDS.map((card) => {
            const active = form.role === card.role
            return (
              <motion.button
                key={card.role}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onFormChange({ ...form, role: card.role })}
                className={`rounded-[16px] border p-4 text-left transition ${
                  active
                    ? 'border-[#22c55e]/60 bg-[#22c55e]/10 shadow-[0_0_0_1px_rgba(34,197,94,0.4),0_8px_24px_rgba(34,197,94,0.12)]'
                    : 'border-white/10 bg-black/20 hover:border-white/20'
                }`}
              >
                <span className="text-xl">{card.emoji}</span>
                <p className={`mt-2 text-sm font-semibold ${active ? 'text-[#4ade80]' : 'text-white'}`}>{card.title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{card.description}</p>
              </motion.button>
            )
          })}
        </div>

        <SectionTitle className="mt-7">Ce role permet de</SectionTitle>
        <p className="mb-3 -mt-1 text-xs text-zinc-500">
          Choisissez le role le plus simple selon ce que cette personne doit faire.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((key) => (
            <PermissionSwitch key={key} label={PERMISSION_LABELS[key]} enabled={activePermissions.includes(key)} />
          ))}
        </div>

        <SectionTitle className="mt-7">Message (optionnel)</SectionTitle>
        <textarea
          value={form.message}
          onChange={(event) => onFormChange({ ...form, message: event.target.value })}
          placeholder={"Bienvenue dans l'equipe !\nVoici les premieres informations utiles..."}
          className="min-h-[110px] w-full rounded-xl border border-white/10 bg-[#101214] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
        />
      </div>

      <div
        className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 bg-[#0f1113] px-6 py-4 sm:flex-row sm:justify-end"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button type="button" onClick={onClose} className="h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white">
          Annuler
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="h-11 rounded-xl bg-[#22c55e] px-4 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? 'Envoi...' : "Envoyer l'invitation"}
        </button>
      </div>
    </>
  )
}

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 ${className}`}>{children}</p>
}

function PermissionSwitch({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <span className="text-sm text-zinc-300">{label}</span>
      <span
        aria-hidden
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          enabled ? 'bg-[#22c55e]' : 'bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-[#101214] px-4 text-sm text-white outline-none"
      />
    </label>
  )
}
