import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  from: vi.fn(),
  filters: [] as Array<[string, string, unknown]>,
}))

vi.mock('@/src/lib/tenant-context', () => ({ getCurrentTenantContext: mocks.context }))
vi.mock('@/src/lib/supabase/server', () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }))

import { GET } from './route'

function builder(data: Record<string, unknown>[] = []) {
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => { mocks.filters.push(['eq', column, value]); return query },
    is: () => query,
    ilike: () => query,
    or: () => query,
    order: () => query,
    limit: () => query,
    then: (resolve: (value: { data: Record<string, unknown>[]; error: null }) => unknown) => resolve({ data, error: null }),
  }
  return query
}

describe('/api/shell/search', () => {
  beforeEach(() => {
    mocks.context.mockReset()
    mocks.from.mockReset()
    mocks.filters.length = 0
  })

  it('requires an authenticated tenant', async () => {
    mocks.context.mockResolvedValue(null)
    const response = await GET(new NextRequest('http://localhost/api/shell/search?q=ab'))
    expect(response.status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('does not query below the minimum length', async () => {
    mocks.context.mockResolvedValue({ tenantId: 'tenant-a', tenant: { timezone: 'Europe/Paris' } })
    const response = await GET(new NextRequest('http://localhost/api/shell/search?q=a'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, groups: [] })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('scopes every category query to the current tenant and returns compact routes', async () => {
    mocks.context.mockResolvedValue({ tenantId: 'tenant-a', tenant: { timezone: 'Europe/Paris' } })
    mocks.from
      .mockReturnValueOnce(builder([{ id: 'p1', project_title: 'Cuisine', status: 'Nouveau' }]))
      .mockReturnValueOnce(builder([{ id: 'c1', first_name: 'Ada', last_name: 'Lovelace', status: 'customer' }]))
      .mockReturnValueOnce(builder([{ id: 'q1', project_id: 'p1', devis_number: 'DEV-1', statut: 'Brouillon' }]))
      .mockReturnValueOnce(builder([{ id: 'a1', title: 'Visite', start_time: '2026-07-24T08:30:00+00:00', status: 'planned' }]))

    const response = await GET(new NextRequest('http://localhost/api/shell/search?q=cu'))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(mocks.filters.filter((filter) => filter[1] === 'tenant_id')).toEqual([
      ['eq', 'tenant_id', 'tenant-a'], ['eq', 'tenant_id', 'tenant-a'], ['eq', 'tenant_id', 'tenant-a'], ['eq', 'tenant_id', 'tenant-a'],
    ])
    expect(body.groups).toHaveLength(4)
    expect(body.groups[2].results[0]).toEqual(expect.objectContaining({ route: '/dashboard-v2/projet/p1/devis/q1' }))
    expect(body.groups[3].results[0]).toEqual(expect.objectContaining({ route: '/dashboard-v2/agenda?appointmentId=a1' }))
    expect(body.groups[3].results[0].subtitle).toMatch(/^(Aujourd’hui à 10 h 30|24 juillet 2026 à 10 h 30)$/)
  })
})
