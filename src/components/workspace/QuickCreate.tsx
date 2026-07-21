'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getQuickCreateActions } from '@/src/lib/shell/quick-create'
import { SHELL_OVERLAY_LAYERS } from './shell/shell-context'
import { useShellContext } from './shell/ShellContextProvider'
import { ProjectIntakePanel } from './ProjectIntakePanel'

export default function QuickCreate() {
  const router = useRouter()
  const { shellContext, quickCreateOpen, closeQuickCreate } = useShellContext()
  const previous = useRef<HTMLElement | null>(null)
  const [panel, setPanel] = useState<'project' | null>(null)
  const actions = getQuickCreateActions(shellContext)
  useEffect(() => { if (!quickCreateOpen) return; previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; return () => previous.current?.focus() }, [quickCreateOpen])
  useEffect(() => { if (!quickCreateOpen) return; const key = (event: KeyboardEvent) => { if (event.key === 'Escape') closeQuickCreate() }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [closeQuickCreate, quickCreateOpen])
  if (!quickCreateOpen) return null
  return <div role="dialog" aria-modal="true" aria-label="Créer" className="fixed inset-0 flex items-end bg-slate-950/30 sm:items-start sm:justify-end sm:p-6" style={{ zIndex: SHELL_OVERLAY_LAYERS.popover }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuickCreate() }}>
    <div className={panel ? 'w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-5xl sm:rounded-2xl' : 'w-full rounded-t-2xl bg-white p-3 shadow-2xl sm:w-80 sm:rounded-2xl'} onMouseDown={(event) => event.stopPropagation()}>
      {panel === 'project' ? <ProjectIntakePanel onClose={() => setPanel(null)} onCreated={(href) => { closeQuickCreate(); router.push(href) }} /> : <>
        <div className="flex items-center justify-between px-2 py-1"><p className="text-sm font-semibold text-slate-950">Créer</p><button type="button" onClick={closeQuickCreate} aria-label="Fermer" className="grid size-9 place-items-center rounded-lg hover:bg-slate-100"><X className="size-4" /></button></div>
        {actions.length ? actions.map((action) => <button key={action.id} type="button" onClick={() => { if (action.kind === 'panel') { setPanel('project'); return }; closeQuickCreate(); router.push(action.href || '/dashboard-v2') }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"><Plus className="size-4 text-emerald-700" />{action.label}</button>) : <p className="px-3 py-5 text-sm text-slate-500">Aucune action disponible.</p>}
        <div className="pb-[max(env(safe-area-inset-bottom),0px)]" />
      </>}
    </div>
  </div>
}
