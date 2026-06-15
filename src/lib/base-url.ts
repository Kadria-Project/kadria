const LOCAL_BASE_URL = 'http://localhost:3000'

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.includes('undefined')) return null

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  return withProtocol.replace(/\/+$/, '')
}

export function getBaseUrl(): string {
  const configuredUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeBaseUrl(process.env.APP_URL)

  if (configuredUrl) return configuredUrl

  const vercelUrl =
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeBaseUrl(process.env.VERCEL_URL)

  if (vercelUrl) return vercelUrl

  if (process.env.NODE_ENV !== 'production') return LOCAL_BASE_URL

  throw new Error('Missing application base URL. Define NEXT_PUBLIC_APP_URL or APP_URL.')
}

export function getPublicDevisUrl(token: string): string {
  if (!token || token.includes('undefined')) {
    throw new Error('Invalid devis token')
  }

  return `${getBaseUrl()}/devis/${encodeURIComponent(token)}`
}
