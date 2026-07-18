'use client'

import type { ReactNode } from 'react'

export const fieldClassName = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50'

export function Card({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h2 className="text-base font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{children}</section>
}

export function SaveButton({ saving, saved, disabled, onClick }: { saving: boolean; saved: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={disabled || saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}</button>
}
