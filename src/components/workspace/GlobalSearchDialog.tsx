'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cleanGlobalSearchQuery, GLOBAL_SEARCH_MIN_LENGTH, type GlobalSearchGroup, type GlobalSearchResult } from '@/src/lib/shell/global-search'
import { SHELL_OVERLAY_LAYERS } from './shell/shell-context'
import { useShellContext } from './shell/ShellContextProvider'

type SearchResponse = { success: boolean; groups?: GlobalSearchGroup[]; error?: string }

export default function GlobalSearchDialog() {
  const router = useRouter()
  const { globalSearchOpen, openGlobalSearch, closeGlobalSearch, shellContext } = useShellContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<GlobalSearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const results = useMemo(() => groups.flatMap((group) => group.results), [groups])

  useEffect(() => {
    if (!globalSearchOpen) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [globalSearchOpen])

  useEffect(() => {
    if (!globalSearchOpen) return
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGlobalSearch()
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [closeGlobalSearch, globalSearchOpen])

  useEffect(() => {
    if (globalSearchOpen || !previousFocusRef.current) return
    previousFocusRef.current.focus()
    previousFocusRef.current = null
  }, [globalSearchOpen])

  useEffect(() => {
    if (!globalSearchOpen || !shellContext.capabilities.search) closeGlobalSearch()
  }, [closeGlobalSearch, globalSearchOpen, shellContext.capabilities.search])

  useEffect(() => {
    const cleaned = cleanGlobalSearchQuery(query)
    if (!globalSearchOpen || cleaned.length < GLOBAL_SEARCH_MIN_LENGTH) {
      return
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/shell/search?q=${encodeURIComponent(cleaned)}`, { signal: controller.signal, cache: 'no-store' })
        const body = await response.json() as SearchResponse
        if (!response.ok || !body.success) throw new Error(body.error || 'Recherche indisponible')
        setGroups(body.groups || [])
      } catch (cause) {
        if ((cause as Error).name !== 'AbortError') {
          setGroups([])
          setError('Recherche indisponible.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [globalSearchOpen, query])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && shellContext.capabilities.search) {
        event.preventDefault()
        openGlobalSearch()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [openGlobalSearch, shellContext.capabilities.search])

  const select = (result: GlobalSearchResult) => {
    closeGlobalSearch()
    router.push(result.route)
  }
  const updateQuery = (value: string) => {
    setQuery(value)
    setActiveIndex(0)
    setError('')
    if (cleanGlobalSearchQuery(value).length < GLOBAL_SEARCH_MIN_LENGTH) {
      setGroups([])
      setLoading(false)
    }
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setActiveIndex((current) => (current + 1) % results.length) }
    if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setActiveIndex((current) => (current - 1 + results.length) % results.length) }
    if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); select(results[activeIndex]) }
    if (event.key === 'Escape') { event.preventDefault(); closeGlobalSearch() }
  }

  if (!globalSearchOpen) return null
  const cleaned = cleanGlobalSearchQuery(query)
  let offset = 0
  return (
    <div role="dialog" aria-modal="true" aria-label="Recherche globale" className="fixed inset-0 flex items-start justify-center bg-slate-950/35 px-3 pt-[max(env(safe-area-inset-top),4rem)] sm:items-start sm:pt-24" style={{ zIndex: SHELL_OVERLAY_LAYERS.dialog }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeGlobalSearch() }}>
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[min(42rem,calc(100dvh-8rem))]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="size-5 text-slate-400" aria-hidden="true" />
          <input ref={inputRef} value={query} onChange={(event) => updateQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="Rechercher un projet, client, devis…" aria-label="Rechercher dans Kadria" className="min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400" />
          <button type="button" onClick={closeGlobalSearch} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Fermer la recherche"><X className="size-4" /></button>
        </div>
        <div className="min-h-32 overflow-y-auto p-2" role="listbox" aria-label="Résultats de recherche">
          {!cleaned && <p className="px-3 py-6 text-sm text-slate-500">Recherchez un projet, un client, un devis ou un rendez-vous.</p>}
          {cleaned && cleaned.length < GLOBAL_SEARCH_MIN_LENGTH && <p className="px-3 py-6 text-sm text-slate-500">Saisissez au moins {GLOBAL_SEARCH_MIN_LENGTH} caractères.</p>}
          {loading && <p className="px-3 py-6 text-sm text-slate-500">Recherche en cours…</p>}
          {error && <p className="px-3 py-6 text-sm text-rose-600">{error}</p>}
          {!loading && !error && cleaned.length >= GLOBAL_SEARCH_MIN_LENGTH && results.length === 0 && <p className="px-3 py-6 text-sm text-slate-500">Aucun résultat.</p>}
          {!loading && groups.map((group) => {
            const start = offset; offset += group.results.length
            return <section key={group.category} className="py-1"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>{group.results.map((result, index) => {
              const indexInList = start + index
              return <button type="button" role="option" aria-selected={activeIndex === indexInList} key={`${group.category}:${result.id}`} onMouseEnter={() => setActiveIndex(indexInList)} onClick={() => select(result)} className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left ${activeIndex === indexInList ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{result.title}</span>{result.subtitle && <span className="block truncate text-xs text-slate-500">{result.subtitle}</span>}</span>{result.status && <span className="shrink-0 text-xs text-slate-500">{result.status}</span>}</button>
            })}</section>
          })}
        </div>
        <div className="hidden border-t border-slate-100 px-4 py-2 text-xs text-slate-400 sm:block">↑↓ naviguer · Entrée ouvrir · Échap fermer</div>
      </div>
    </div>
  )
}
