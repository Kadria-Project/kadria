export const PROJECT_REFRESH_TARGETS = ['brief', 'facts', 'commercial', 'engagement', 'documents'] as const

export type ProjectRefreshTarget = (typeof PROJECT_REFRESH_TARGETS)[number]

export type ProjectCommandResult<T = undefined> = {
  ok: boolean
  data?: T
  refresh?: ProjectRefreshTarget[]
  error?: {
    code: string
    message: string
    requestId?: string
  }
}

export type ProjectStatusCommandInput = { status: string }

export type ProjectContactCommandInput = {
  clientFirstName: string
  clientName: string
  clientPhone: string
  clientEmail: string
  siteAddress: string
  city?: string
  postalCode?: string
  latitude?: number | null
  longitude?: number | null
}

const contactKeys = new Set([
  'clientFirstName', 'clientName', 'clientPhone', 'clientEmail', 'siteAddress',
  'city', 'postalCode', 'latitude', 'longitude',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function boundedString(value: unknown, label: string, maxLength = 200): string {
  if (typeof value !== 'string') throw new Error(`${label} invalide.`)
  const normalized = value.trim()
  if (normalized.length > maxLength) throw new Error(`${label} est trop long.`)
  return normalized
}

export function parseProjectStatusCommandInput(value: unknown): ProjectStatusCommandInput {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== 'status')) {
    throw new Error('Payload de statut invalide.')
  }
  const status = boundedString(value.status, 'Le statut', 100)
  if (!status) throw new Error('Le statut est requis.')
  return { status }
}

export function parseProjectContactCommandInput(value: unknown): ProjectContactCommandInput {
  if (!isRecord(value) || Object.keys(value).some((key) => !contactKeys.has(key))) {
    throw new Error('Payload de coordonnÃ©es invalide.')
  }

  const clientEmail = boundedString(value.clientEmail, "L'e-mail", 254)
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    throw new Error("L'e-mail est invalide.")
  }

  const latitude = value.latitude
  const longitude = value.longitude
  if (latitude !== undefined && latitude !== null && (typeof latitude !== 'number' || !Number.isFinite(latitude))) {
    throw new Error('La latitude est invalide.')
  }
  if (longitude !== undefined && longitude !== null && (typeof longitude !== 'number' || !Number.isFinite(longitude))) {
    throw new Error('La longitude est invalide.')
  }

  return {
    clientFirstName: boundedString(value.clientFirstName, 'Le prÃ©nom', 100),
    clientName: boundedString(value.clientName, 'Le nom', 100),
    clientPhone: boundedString(value.clientPhone, 'Le tÃ©lÃ©phone', 50),
    clientEmail,
    siteAddress: boundedString(value.siteAddress, "L'adresse", 300),
    ...(value.city !== undefined ? { city: boundedString(value.city, 'La ville', 120) } : {}),
    ...(value.postalCode !== undefined ? { postalCode: boundedString(value.postalCode, 'Le code postal', 20) } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
  }
}

export function projectCommandError(code: string, message: string, requestId?: string): ProjectCommandResult {
  return { ok: false, error: { code, message, ...(requestId ? { requestId } : {}) } }
}
