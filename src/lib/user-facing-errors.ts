export type UserFacingErrorContext = 'automation' | 'document' | 'email' | 'generic'

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

export function toUserFacingErrorMessage(error: unknown, context: UserFacingErrorContext = 'generic') {
  const message = normalizeError(error).toLowerCase()

  if (/client_email_missing|invalid\s+['"]?to|invalid.*(?:email|recipient|address)|recipient.*invalid|email.*invalid/.test(message)) {
    return 'L’adresse e-mail du client semble invalide. Vérifiez-la avant de réessayer.'
  }

  if (/resend_api_key_missing|sender.*invalid|smtp|resend|mail.*(?:unavailable|unavailable)|email.*(?:unavailable|unavailable)/.test(message)) {
    return 'L’envoi d’e-mail n’est pas disponible pour le moment. Réessayez dans quelques instants.'
  }

  if (/timeout|timed out|network|fetch|econn|enotfound|service unavailable|\b502\b|\b503\b|\b504\b/.test(message)) {
    return context === 'document'
      ? 'Le document n’a pas pu être envoyé. Réessayez dans quelques instants.'
      : 'Cette action n’a pas pu être finalisée. Réessayez dans quelques instants.'
  }

  if (/pdf|document|devis/.test(message) && context === 'document') {
    return 'Le document n’a pas pu être préparé. Réessayez dans quelques instants.'
  }

  if (/project_not_found|devis_not_found|run_not_found|not found/.test(message)) {
    return 'Le dossier concerné n’est plus disponible. Actualisez la page avant de réessayer.'
  }

  return context === 'email'
    ? 'L’e-mail n’a pas pu être envoyé. Réessayez dans quelques instants.'
    : 'Cette action n’a pas pu être finalisée. Réessayez dans quelques instants.'
}
