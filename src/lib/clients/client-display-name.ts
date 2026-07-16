import type { ClientResolutionRecord } from './client-resolution-types'

function text(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || null
}

export function maskClientEmail(value: string | null | undefined): string | null {
  const email = text(value)
  if (!email) return null

  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.slice(0, 1) || '*'}***@${domain}`
}

export function maskClientPhone(value: string | null | undefined): string | null {
  const phone = text(value)
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  return digits.length >= 2 ? `***${digits.slice(-2)}` : '***'
}

export function getClientDisplayName(input: Pick<ClientResolutionRecord, 'firstName' | 'lastName' | 'companyName' | 'email' | 'phone'>): string {
  const companyName = text(input.companyName)
  const contactName = [text(input.firstName), text(input.lastName)].filter(Boolean).join(' ')

  if (companyName && contactName) return `${companyName} - ${contactName}`
  if (companyName) return companyName
  if (contactName) return contactName
  return maskClientEmail(input.email) || maskClientPhone(input.phone) || 'Client sans nom'
}
