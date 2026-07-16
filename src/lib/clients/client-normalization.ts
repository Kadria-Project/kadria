import type {
  ClientEmailNormalization,
  ClientPhoneNormalization,
  ClientResolutionInput,
  PreparedClientResolutionInput,
} from './client-resolution-types'

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/
const HTML_LIKE_CONTENT = /<[^>]*>/

export function cleanClientText(value: unknown, maxLength = 255): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength || CONTROL_CHARACTERS.test(trimmed) || HTML_LIKE_CONTENT.test(trimmed)) {
    return null
  }

  return trimmed
}

export function normalizeCountryCode(value: unknown): string | null {
  const raw = cleanClientText(value, 2)
  if (!raw) return null

  const normalized = raw.toUpperCase()
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null
}

export function normalizeClientEmail(value: unknown): ClientEmailNormalization {
  const raw = cleanClientText(value, 254)
  if (!raw) return { raw: null, normalized: null, valid: false }

  const normalized = raw.toLowerCase()
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)

  return {
    raw,
    normalized: valid ? normalized : null,
    valid,
  }
}

export function normalizeClientPhone(value: unknown, countryCode?: unknown): ClientPhoneNormalization {
  const raw = cleanClientText(value, 40)
  const inputCountryCode = normalizeCountryCode(countryCode)
  if (!raw) return { raw: null, normalized: null, valid: false, countryCode: inputCountryCode }

  let compact = raw.replace(/[\s().-]/g, '')
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`

  const frenchContext = inputCountryCode === null || inputCountryCode === 'FR'
  if (frenchContext && /^0[1-9]\d{8}$/.test(compact)) {
    return {
      raw,
      normalized: `+33${compact.slice(1)}`,
      valid: true,
      countryCode: 'FR',
    }
  }

  if (/^\+33[1-9]\d{8}$/.test(compact)) {
    return { raw, normalized: compact, valid: true, countryCode: 'FR' }
  }

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return {
      raw,
      normalized: compact,
      valid: true,
      countryCode: inputCountryCode,
    }
  }

  return { raw, normalized: null, valid: false, countryCode: inputCountryCode }
}

export function normalizeTextForComparison(value: string | null | undefined): string | null {
  const raw = cleanClientText(value)
  if (!raw) return null

  const normalized = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')

  return normalized || null
}

export function normalizePersonNameForComparison(firstName?: string | null, lastName?: string | null): string | null {
  return normalizeTextForComparison([firstName, lastName].filter(Boolean).join(' '))
}

export function normalizeCompanyNameForComparison(value?: string | null): string | null {
  return normalizeTextForComparison(value)
}

export function prepareClientResolutionInput(input: ClientResolutionInput): PreparedClientResolutionInput {
  const tenantId = cleanClientText(input.tenantId, 100)
  if (!tenantId) {
    throw new Error('Client resolution requires a trusted tenant id.')
  }

  const countryCode = normalizeCountryCode(input.countryCode)
  const firstName = cleanClientText(input.firstName, 120)
  const lastName = cleanClientText(input.lastName, 120)
  const companyName = cleanClientText(input.companyName, 180)

  return {
    tenantId,
    firstName,
    lastName,
    companyName,
    email: normalizeClientEmail(input.email),
    phone: normalizeClientPhone(input.phone, countryCode),
    addressLine1: cleanClientText(input.addressLine1, 255),
    postalCode: cleanClientText(input.postalCode, 20),
    city: cleanClientText(input.city, 120),
    normalizedCity: normalizeTextForComparison(input.city),
    countryCode,
    acquisitionSource: cleanClientText(input.acquisitionSource, 100),
    createdFrom: cleanClientText(input.createdFrom, 100) || 'legacy',
  }
}
