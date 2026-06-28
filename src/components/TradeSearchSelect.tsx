'use client'

import { useState, type CSSProperties } from 'react'

// Combobox recherchable simple (texte + liste filtrée), sans dépendance
// externe — partagé entre le profil métier et toute page nécessitant un
// sélecteur métier basé sur la taxonomie complète (src/config/trades.ts).
export function TradeSearchSelect({
  options,
  value,
  onSelect,
  placeholder,
  inputStyle,
  emptyLabel = 'Aucun métier trouvé',
}: {
  options: { value: string; label: string }[]
  value: string
  onSelect: (value: string) => void
  placeholder: string
  inputStyle: CSSProperties
  emptyLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selectedLabel = options.find((o) => o.value === value)?.label || ''
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        style={inputStyle}
      />
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px',
            maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {filtered.length > 0 ? filtered.map((o) => (
            <div
              key={o.value}
              onMouseDown={(e) => { e.preventDefault(); onSelect(o.value); setQuery(''); setOpen(false) }}
              style={{
                padding: '9px 14px', fontSize: '13px', cursor: 'pointer',
                color: o.value === value ? 'var(--accent)' : 'var(--text-1)',
                background: o.value === value ? 'rgba(34,197,94,0.08)' : 'transparent',
              }}
            >
              {o.label}
            </div>
          )) : (
            <div style={{ padding: '9px 14px', fontSize: '13px', color: 'var(--text-3)' }}>
              {emptyLabel}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
