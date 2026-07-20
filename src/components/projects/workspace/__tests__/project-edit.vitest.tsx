import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { ProjectEditDialog } from '../dialogs/ProjectEditDialog'

const form = { projectType: 'Rénovation', trade: 'Peinture', city: 'Rouen', clientFirstName: 'Ana', clientName: 'Martin', clientPhone: '', clientEmail: '', siteAddress: '' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const open = (onClose = vi.fn(), onSaved = vi.fn().mockResolvedValue(undefined)) => render(<ProjectEditDialog projectId="p1" onClose={onClose} onSaved={onSaved} />)

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

test('loads only once when the dialog is explicitly opened', async () => {
  const fetch = vi.fn().mockResolvedValue(reply(200, { success: true, edit: form }))
  vi.stubGlobal('fetch', fetch)
  open()
  expect(screen.getByText('Chargement…')).toBeVisible()
  await screen.findByDisplayValue('Rouen')
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('does not reload on rerender and starts one fresh GET after reopening', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(reply(200, { success: true, edit: form })).mockResolvedValueOnce(reply(200, { success: true, edit: { ...form, city: 'Paris' } }))
  vi.stubGlobal('fetch', fetch)
  const first = open()
  await screen.findByDisplayValue('Rouen')
  first.rerender(<ProjectEditDialog projectId="p1" onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />)
  expect(fetch).toHaveBeenCalledTimes(1)
  first.unmount()
  open()
  await screen.findByDisplayValue('Paris')
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(screen.queryByText('Erreur serveur.')).toBeNull()
  expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled()
})

test('renders a forbidden GET without a form or PATCH and can close', async () => {
  const fetch = vi.fn().mockResolvedValue(reply(403, { success: false, error: 'Accès refusé.' }))
  vi.stubGlobal('fetch', fetch)
  const close = vi.fn()
  const user = userEvent.setup()
  open(close)
  await screen.findByText('Accès refusé.')
  expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Annuler' }))
  expect(close).toHaveBeenCalledOnce()
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('renders a GET error without a partial form and can close without refresh', async () => {
  const fetch = vi.fn().mockResolvedValue(reply(500, { success: false, error: 'Erreur serveur.' }))
  vi.stubGlobal('fetch', fetch)
  const close = vi.fn()
  const saved = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup()
  open(close, saved)
  await screen.findByText('Erreur serveur.')
  expect(screen.queryByDisplayValue('Rouen')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Annuler' }))
  expect(close).toHaveBeenCalledOnce()
  expect(saved).not.toHaveBeenCalled()
})

test('keeps edited values and re-enables save after a PATCH error', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(reply(200, { success: true, edit: form })).mockResolvedValueOnce(reply(500, { success: false, error: 'Erreur serveur.' }))
  vi.stubGlobal('fetch', fetch)
  const user = userEvent.setup()
  open()
  const city = await screen.findByDisplayValue('Rouen')
  await user.clear(city); await user.type(city, 'Paris')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await screen.findByText('Erreur serveur.')
  expect(screen.getByDisplayValue('Paris')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled()
  expect(fetch).toHaveBeenCalledTimes(2)
})

test('submits once while PATCH is pending, then closes and refreshes once', async () => {
  let resolvePatch!: (response: Response) => void
  const pending = new Promise<Response>((resolve) => { resolvePatch = resolve })
  const fetch = vi.fn().mockResolvedValueOnce(reply(200, { success: true, edit: form })).mockReturnValueOnce(pending)
  vi.stubGlobal('fetch', fetch)
  const close = vi.fn(); const saved = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup()
  open(close, saved)
  await screen.findByDisplayValue('Rouen')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await user.click(screen.getByRole('button', { name: 'Enregistrement…' }))
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: 'Enregistrement…' })).toBeDisabled()
  resolvePatch(reply(200, { success: true }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(saved).toHaveBeenCalledOnce()
})
