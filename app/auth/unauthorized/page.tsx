export default function UnauthorizedPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#09090b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
        <h1 style={{
          color: 'white',
          fontSize: '22px',
          fontWeight: 700,
          margin: '0 0 12px',
        }}>
          Accès non autorisé
        </h1>
        <p style={{
          color: '#71717a',
          fontSize: '14px',
          lineHeight: 1.7,
          margin: '0 0 24px',
        }}>
          Cette adresse email n&apos;est pas associée à un compte Kadria.
          Contactez-nous pour créer votre espace professionnel.
        </p>
        <a href="mailto:contact@kadria.fr" style={{
          display: 'inline-block',
          background: '#22c55e',
          color: 'black',
          fontWeight: 700,
          borderRadius: '10px',
          padding: '12px 24px',
          fontSize: '14px',
          textDecoration: 'none',
        }}>
          Demander un accès
        </a>
      </div>
    </main>
  )
}
