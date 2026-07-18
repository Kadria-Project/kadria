'use client'

export type SettingsConfigurationItem = {
  key: string
  label: string
  description: string
  status: 'done' | 'todo'
  href: string
  cta: string
}

type SettingsConfigurationOverviewProps = {
  items: SettingsConfigurationItem[]
  expanded: boolean
  isMobile: boolean
  onExpandedChange: (expanded: boolean) => void
  onAction: (item: SettingsConfigurationItem) => void
}

export function SettingsConfigurationOverview({
  items,
  expanded,
  isMobile,
  onAction,
  onExpandedChange,
}: SettingsConfigurationOverviewProps) {
  const completedCount = items.filter((item) => item.status === 'done').length
  const remainingItems = items.filter((item) => item.status === 'todo')
  const percent = items.length ? Math.round((completedCount / items.length) * 100) : 0
  const primaryAction = remainingItems[0] ?? null
  const complete = percent === 100

  return (
    <section
      aria-labelledby="settings-configuration-title"
      style={{
        background: complete ? 'rgba(34,197,94,0.05)' : 'var(--bg-elevated)',
        border: complete ? '1px solid rgba(34,197,94,0.16)' : '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 12px 28px rgba(15,23,42,0.05)',
        marginBottom: '20px',
        padding: isMobile ? '14px' : '16px 18px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '14px', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' }}>
            Vue d&apos;ensemble
          </p>
          <h2 id="settings-configuration-title" style={{ fontSize: isMobile ? '17px' : '18px', margin: '4px 0 0' }}>
            {complete ? 'Votre entreprise est prête' : `${completedCount} étape${completedCount > 1 ? 's' : ''} terminée${completedCount > 1 ? 's' : ''} sur ${items.length}`}
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.5, margin: '6px 0 0' }}>
            {complete ? 'Les réglages essentiels sont prêts.' : primaryAction ? `Prochaine priorité : ${primaryAction.label}.` : 'Finalisez les réglages utiles pour profiter pleinement de Kadria.'}
          </p>
        </div>
        <div style={{ alignSelf: isMobile ? 'stretch' : 'center', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', minWidth: isMobile ? undefined : '260px' }}>
          <div
            aria-label={`${percent}% de configuration terminée`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percent}
            role="progressbar"
            style={{ background: 'rgba(148,163,184,0.18)', borderRadius: '999px', height: '8px', margin: isMobile ? '6px 0' : 0, overflow: 'hidden', width: '100%' }}
          >
            <div style={{ background: complete ? '#22c55e' : 'var(--accent)', height: '100%', transition: 'width 0.2s ease', width: `${percent}%` }} />
          </div>
          <button type="button" className={focusClassName} onClick={() => onExpandedChange(!expanded)} aria-expanded={expanded} style={buttonStyle}>
            {expanded ? 'Masquer le détail' : 'Voir le détail'}
          </button>
        </div>
      </div>

      {!complete && primaryAction && (
        <div style={{ alignItems: isMobile ? 'stretch' : 'center', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', justifyContent: 'space-between', marginTop: '14px' }}>
          <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{remainingItems.length} élément{remainingItems.length > 1 ? 's' : ''} à compléter.</span>
          <button type="button" className={focusClassName} onClick={() => onAction(primaryAction)} style={buttonStyle}>{primaryAction.cta} : {primaryAction.label}</button>
        </div>
      )}

      {expanded && (
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', marginTop: '16px' }}>
          {items.map((item) => {
            const done = item.status === 'done'
            return (
              <div key={item.key} style={{ background: done ? 'rgba(34,197,94,0.08)' : 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ alignItems: 'center', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '14px' }}>{item.label}</strong>
                  <span style={{ color: done ? '#4ade80' : 'var(--text-2)', fontSize: '12px', fontWeight: 700 }}>{done ? 'Terminé' : 'À compléter'}</span>
                </div>
                <p style={{ color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.45, margin: '6px 0 10px' }}>{item.description}</p>
                {!done && <button type="button" className={focusClassName} onClick={() => onAction(item)} style={buttonStyle}>{item.cta}</button>}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

const focusClassName = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'

const buttonStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text-1)',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 700,
  padding: '8px 12px',
  whiteSpace: 'nowrap',
}
