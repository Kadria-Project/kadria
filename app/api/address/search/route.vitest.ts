import { afterEach, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

afterEach(() => vi.unstubAllGlobals())

test('normalizes the current IGN Géoplateforme response without exposing its payload', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ features: [{ id: 'ban:1', properties: { label: '10 Rue de la Paix 75002 Paris', name: '10 Rue de la Paix', postcode: '75002', city: 'Paris', citycode: '75056', score: 0.98 }, geometry: { coordinates: [2.3318, 48.8698] } }] })))
  vi.stubGlobal('fetch', fetch)
  const response = await GET(new NextRequest('http://localhost/api/address/search?q=10%20rue%20de%20la%20Paix'))
  await expect(response.json()).resolves.toEqual({ success: true, suggestions: [{ id: 'ban:1', label: '10 Rue de la Paix 75002 Paris', name: '10 Rue de la Paix', postcode: '75002', city: 'Paris', cityCode: '75056', latitude: 48.8698, longitude: 2.3318, score: 0.98 }] })
  expect(String(fetch.mock.calls[0]?.[0])).toContain('https://data.geopf.fr/geocodage/search')
})

test('rejects short queries before calling IGN', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const response = await GET(new NextRequest('http://localhost/api/address/search?q=ab'))
  expect(response.status).toBe(400)
  expect(fetch).not.toHaveBeenCalled()
})
