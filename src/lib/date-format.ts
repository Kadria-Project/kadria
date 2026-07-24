export type DateFormatOptions = {
  timeZone?: string
  fallback?: string
}

type DateValue = Date | string | number | null | undefined

const DEFAULT_TIME_ZONE = 'Europe/Paris'
const DEFAULT_FALLBACK = 'Date indisponible'

function parseDate(value: DateValue) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(value ?? '')
  return Number.isNaN(date.getTime()) ? null : date
}

function formatter(options: Intl.DateTimeFormatOptions, timeZone?: string) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: timeZone || DEFAULT_TIME_ZONE, ...options })
}

function format(value: DateValue, options: Intl.DateTimeFormatOptions, formatOptions?: DateFormatOptions) {
  const date = parseDate(value)
  return date ? formatter(options, formatOptions?.timeZone).format(date) : formatOptions?.fallback || DEFAULT_FALLBACK
}

export function formatDateFr(value: DateValue, options?: DateFormatOptions) {
  return format(value, { day: 'numeric', month: 'long', year: 'numeric' }, options)
}

export function formatDateShortFr(value: DateValue, options?: DateFormatOptions) {
  return format(value, { day: '2-digit', month: '2-digit', year: 'numeric' }, options)
}

export function formatTimeFr(value: DateValue, options?: DateFormatOptions) {
  return format(value, { hour: 'numeric', minute: '2-digit' }, options).replace(':', ' h ')
}

export function formatDateTimeFr(value: DateValue, options?: DateFormatOptions) {
  const date = parseDate(value)
  if (!date) return options?.fallback || DEFAULT_FALLBACK
  return `${formatDateFr(date, options)} à ${formatTimeFr(date, options)}`
}

export function formatSmartDateFr(value: DateValue, options?: DateFormatOptions & { now?: Date }) {
  const date = parseDate(value)
  if (!date) return options?.fallback || DEFAULT_FALLBACK
  const now = options?.now || new Date()
  const dateKey = formatter({ year: 'numeric', month: '2-digit', day: '2-digit' }, options?.timeZone).format(date)
  const todayKey = formatter({ year: 'numeric', month: '2-digit', day: '2-digit' }, options?.timeZone).format(now)
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (dateKey === todayKey) return `Aujourd’hui à ${formatTimeFr(date, options)}`
  if (dateKey === formatter({ year: 'numeric', month: '2-digit', day: '2-digit' }, options?.timeZone).format(tomorrow)) return `Demain à ${formatTimeFr(date, options)}`
  if (dateKey === formatter({ year: 'numeric', month: '2-digit', day: '2-digit' }, options?.timeZone).format(yesterday)) return `Hier à ${formatTimeFr(date, options)}`
  return formatDateTimeFr(date, options)
}
