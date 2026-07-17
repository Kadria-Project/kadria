'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import type { ClientActionItem, ClientActionReason } from '@/src/lib/clients/clients-action-types'
import { CLIENT_ACTION_CONFIG, CLIENT_ACTION_PRIORITY_ORDER } from '@/src/lib/clients/clients-action-config'
import { ClientActionRow } from './ClientsActionCenter'

type SortMode = 'priority' | 'due'
const PRIORITY_WEIGHT: Record<ClientActionItem['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 }

export function ClientsActionsPanel({
  open,
  actions,
  onClose,
  onOpenAction,
}: {
  open: boolean
  actions: ClientActionItem[]
  onClose: () => void
  onOpenAction: (action: ClientActionItem) => void
}) {
  const [category, setCategory] = useState<ClientActionReason | 'all'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('priority')

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previous }
  }, [open, onClose])

  const filtered = useMemo(() => {
    const base = category === 'all' ? actions : actions.filter((action) => action.reason === category)
    return [...base].sort((left, right) => {
      if (sortMode === 'priority') {
        return (
          PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority] ||
          left.clientName.localeCompare(right.clientName, 'fr')
        )
      }
      const leftDue = left.dueAt || left.appointmentAt
      const rightDue = right.dueAt || right.appointmentAt
      if (!leftDue && !rightDue) return 0
      if (!leftDue) return 1
      if (!rightDue) return -1
      return leftDue.localeCompare(rightDue)
    })
  }, [actions, category, sortMode])

  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<ClientActionReason, number>()
    for (const action of actions) counts.set(action.reason, (counts.get(action.reason) || 0) + 1)
    return CLIENT_ACTION_PRIORITY_ORDER.filter((reason) => (counts.get(reason) || 0) > 0).map((reason) => ({ reason, count: counts.get(reason) || 0 }))
  }, [actions])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Toutes les actions clients">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Toutes les actions</h2>
                <p className="mt-0.5 text-sm text-slate-500">{actions.length} action{actions.length > 1 ? 's' : ''} au total.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer le panneau des actions" className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
              <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Toutes</button>
              {categoriesWithCounts.map(({ reason, count }) => (
                <button key={reason} type="button" aria-pressed={category === reason} onClick={() => setCategory(reason)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === reason ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {CLIENT_ACTION_CONFIG[reason].categoryLabel} ({count})
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-2">
              <label className="text-xs font-semibold text-slate-500" htmlFor="clients-actions-sort">Trier par</label>
              <select id="clients-actions-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700">
                <option value="priority">Priorité</option>
                <option value="due">Échéance</option>
              </select>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-6">
              {filtered.length === 0 && <p className="mt-8 text-center text-sm text-slate-500">Aucune action dans cette catégorie.</p>}
              {filtered.map((action) => <ClientActionRow key={action.id} action={action} onOpen={onOpenAction} />)}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
