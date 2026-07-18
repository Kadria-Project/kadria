import Link from 'next/link'

type SettingsModuleShortcutsProps = {
  showTeam: boolean
  showAutomations: boolean
}

type SettingsModuleShortcut = {
  href: string
  icon: string
  title: string
  description: string
}

const ALWAYS_AVAILABLE_MODULES: SettingsModuleShortcut[] = [
  {
    href: '/parametres/profil-metier',
    icon: '🛠️',
    title: 'Activité',
    description: 'Précisez vos métiers, prestations et informations de qualification.',
  },
  {
    href: '/parametres/notifications',
    icon: '🔔',
    title: 'Notifications',
    description: 'Choisissez les alertes navigateur et les événements à suivre.',
  },
]

export function SettingsModuleShortcuts({
  showTeam,
  showAutomations,
}: SettingsModuleShortcutsProps) {
  const modules: SettingsModuleShortcut[] = [
    ...ALWAYS_AVAILABLE_MODULES,
    ...(showTeam
      ? [{
          href: '/parametres/equipe',
          icon: '👥',
          title: 'Équipe',
          description: 'Gérez les collaborateurs, leurs accès et les invitations.',
        }]
      : []),
    ...(showAutomations
      ? [{
          href: '/parametres/automatisations',
          icon: '⚙️',
          title: 'Automatisations',
          description: 'Définissez les règles, validations et actions automatiques.',
        }]
      : []),
  ]

  return (
    <section aria-labelledby="settings-modules-title" style={sectionStyle}>
      <div>
        <h2 id="settings-modules-title" style={titleStyle}>Modules de configuration</h2>
        <p style={descriptionStyle}>Accédez aux réglages spécialisés de votre espace Kadria.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" style={gridStyle}>
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            style={cardStyle}
          >
            <span aria-hidden="true" style={iconStyle}>{module.icon}</span>
            <span style={contentStyle}>
              <span style={cardTitleStyle}>{module.title}</span>
              <span style={cardDescriptionStyle}>{module.description}</span>
              <span style={actionStyle}>Accéder aux réglages <span aria-hidden="true">→</span></span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  boxShadow: '0 12px 28px rgba(15,23,42,0.05)',
  marginBottom: '20px',
  padding: '16px 18px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  margin: 0,
}

const descriptionStyle: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: '13px',
  lineHeight: 1.5,
  margin: '6px 0 0',
}

const gridStyle: React.CSSProperties = {
  marginTop: '16px',
}

const cardStyle: React.CSSProperties = {
  alignItems: 'flex-start',
  background: 'var(--bg-hover)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'inherit',
  display: 'flex',
  gap: '12px',
  minHeight: '136px',
  padding: '14px',
  textDecoration: 'none',
}

const iconStyle: React.CSSProperties = {
  alignItems: 'center',
  background: 'rgba(34,197,94,0.12)',
  borderRadius: '10px',
  display: 'inline-flex',
  flexShrink: 0,
  fontSize: '18px',
  height: '36px',
  justifyContent: 'center',
  width: '36px',
}

const contentStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minWidth: 0,
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
}

const cardDescriptionStyle: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: '13px',
  lineHeight: 1.45,
  marginTop: '5px',
}

const actionStyle: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: '13px',
  fontWeight: 700,
  marginTop: 'auto',
  paddingTop: '12px',
}
