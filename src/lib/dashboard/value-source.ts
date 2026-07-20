export type ValueSourceFilter = 'all' | 'web' | 'voice' | 'manual' | 'other'

export function normalizeValueSource(source?: string): ValueSourceFilter {
  const value = (source || '').toLowerCase().trim()
  if (!value) return 'other'
  if (value.includes('chat') || value.includes('widget') || value.includes('site') || value.includes('web')) return 'web'
  if (value.includes('voice') || value.includes('vapi') || value.includes('call') || value.includes('vocal')) return 'voice'
  if (value.includes('manual') || value.includes('admin') || value.includes('manuel')) return 'manual'
  return 'other'
}
