import { afterEach, expect, test, vi } from 'vitest'
import { ProjectEditActionAdapter, type ProjectEditFormData } from '../actions/ProjectEditActionAdapter'

const form: ProjectEditFormData = { projectType: 'Rénovation', trade: 'Peinture', city: 'Rouen', clientFirstName: 'Ana', clientName: 'Martin', clientPhone: '0600000000', clientEmail: 'ana@example.test', siteAddress: '1 rue Test' }
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

test('loads the minimal edit DTO and maps GET failures', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response(200, { success: true, edit: form })).mockResolvedValueOnce(response(500, { success: false, error: 'Erreur serveur.' })).mockResolvedValueOnce(response(403, { success: false, error: 'Accès refusé.' }))
  vi.stubGlobal('fetch', fetch)
  const adapter = new ProjectEditActionAdapter('project-1')
  await expect(adapter.load()).resolves.toEqual({ success: true, data: form })
  await expect(adapter.load()).resolves.toEqual({ success: false, status: 500, error: 'Erreur serveur.' })
  await expect(adapter.load()).resolves.toEqual({ success: false, status: 403, error: 'Accès refusé.' })
  expect(fetch).toHaveBeenCalledTimes(3)
})

test('saves the typed payload and preserves a PATCH failure', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response(200, { success: true })).mockResolvedValueOnce(response(500, { success: false, error: 'Erreur serveur.' }))
  vi.stubGlobal('fetch', fetch)
  const adapter = new ProjectEditActionAdapter('project-1')
  await expect(adapter.save(form)).resolves.toEqual({ success: true })
  await expect(adapter.save(form)).resolves.toEqual({ success: false, status: 500, error: 'Erreur serveur.' })
  expect(fetch.mock.calls[0][0]).toBe('/api/projects/project-1/workspace/edit')
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'PATCH' })
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(form)
})
