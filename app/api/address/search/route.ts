import { NextRequest, NextResponse } from 'next/server'
import type { AddressSuggestion } from '@/src/lib/address/types'

const GEOCODING_URL = 'https://data.geopf.fr/geocodage/search'
const MAX_RESULTS = 6
const TIMEOUT_MS = 4_000

type GeopfFeature = {
  id?: unknown
  properties?: Record<string, unknown>
  geometry?: { coordinates?: unknown }
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || undefined : undefined
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeFeature(feature: GeopfFeature): AddressSuggestion | null {
  const properties = feature.properties || {}
  const label = text(properties.label, 300)
  if (!label) return null
  const coordinates = Array.isArray(feature.geometry?.coordinates) ? feature.geometry.coordinates : []
  const longitude = number(coordinates[0])
  const latitude = number(coordinates[1])
  return {
    id: text(properties.id, 180) || text(feature.id, 180) || label,
    label,
    ...(text(properties.name, 180) ? { name: text(properties.name, 180) } : {}),
    ...(text(properties.postcode, 20) ? { postcode: text(properties.postcode, 20) } : {}),
    ...(text(properties.city, 120) ? { city: text(properties.city, 120) } : {}),
    ...(text(properties.citycode, 20) ? { cityCode: text(properties.citycode, 20) } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(number(properties.score) !== undefined ? { score: number(properties.score) } : {}),
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || ''
  if (query.length < 3 || query.length > 200) {
    return NextResponse.json({ success: false, error: 'Recherche d’adresse invalide.' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const providerUrl = new URL(GEOCODING_URL)
    providerUrl.searchParams.set('q', query)
    providerUrl.searchParams.set('limit', String(MAX_RESULTS))
    providerUrl.searchParams.set('autocomplete', '1')
    const response = await fetch(providerUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })
    if (!response.ok) return NextResponse.json({ success: false, error: 'Recherche d’adresse indisponible.' }, { status: 502 })
    const body = await response.json() as { features?: unknown }
    const suggestions = Array.isArray(body.features)
      ? body.features.map((feature) => normalizeFeature(feature as GeopfFeature)).filter((feature): feature is AddressSuggestion => feature !== null).slice(0, MAX_RESULTS)
      : []
    return NextResponse.json({ success: true, suggestions })
  } catch {
    return NextResponse.json({ success: false, error: 'Recherche d’adresse indisponible.' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
