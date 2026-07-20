import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { AppointmentEditDialog } from '../dialogs/AppointmentEditDialog'
import { AppointmentCancelDialog } from '../dialogs/AppointmentCancelDialog'
import { AppointmentAssignDialog } from '../dialogs/AppointmentAssignDialog'
import { ProjectWorkspaceSectionContent } from '../ProjectWorkspaceSectionContent'

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const appointment = { id: 'a1', title: 'Visite', start: '2026-08-01T09:00:00.000Z', end: '2026-08-01T10:00:00.000Z', status: 'confirmed', assignedUserId: 'u1', location: 'Paris', description: '' }
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

test('edit loads one minimal appointment, preserves form values on PATCH error, and submits once', async () => {
  let resolvePatch!: (response: Response) => void
  const pending = new Promise<Response>((resolve) => { resolvePatch = resolve })
  const fetch = vi.fn().mockResolvedValueOnce(reply(200, { success: true, appointment })).mockResolvedValueOnce(reply(500, { success: false, error: 'Erreur serveur.' })).mockReturnValueOnce(pending)
  vi.stubGlobal('fetch', fetch); const user = userEvent.setup(); const close = vi.fn(); const saved = vi.fn().mockResolvedValue(undefined)
  render(<AppointmentEditDialog projectId="p1" appointmentId="a1" onClose={close} onSaved={saved} />)
  expect(await screen.findByDisplayValue('Visite')).toBeVisible(); expect(fetch).toHaveBeenCalledOnce()
  await user.clear(screen.getByLabelText('Titre')); await user.type(screen.getByLabelText('Titre'), 'Visite modifiée'); await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(await screen.findByText('Erreur serveur.')).toBeVisible(); expect(screen.getByDisplayValue('Visite modifiée')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Enregistrer' })); await user.click(screen.getByRole('button', { name: 'Enregistrement…' })); expect(fetch).toHaveBeenCalledTimes(3)
  resolvePatch(reply(200, { success: true })); await waitFor(() => expect(close).toHaveBeenCalledOnce()); expect(saved).toHaveBeenCalledOnce()
})

test('edit renders an out-of-project response without exposing a form', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(404, { success: false, error: 'Rendez-vous introuvable' })))
  render(<AppointmentEditDialog projectId="p1" appointmentId="other" onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(await screen.findByText('Rendez-vous introuvable')).toBeVisible(); expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull()
})

test('cancel closes without mutation and otherwise keeps its confirmation open after an error', async () => {
  const noMutation = vi.fn(); const user = userEvent.setup(); const first = render(<AppointmentCancelDialog projectId="p1" appointmentId="a1" label="Visite" onClose={noMutation} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Conserver' })); expect(noMutation).toHaveBeenCalledOnce(); first.unmount()
  let resolveDelete!: (response: Response) => void; const pending = new Promise<Response>((resolve) => { resolveDelete = resolve }); const fetch = vi.fn().mockResolvedValueOnce(reply(500, { success: false, error: 'Erreur serveur.' })).mockReturnValueOnce(pending); vi.stubGlobal('fetch', fetch); const close = vi.fn(); const saved = vi.fn().mockResolvedValue(undefined)
  render(<AppointmentCancelDialog projectId="p1" appointmentId="a1" label="Visite" onClose={close} onSaved={saved} />); await user.click(screen.getByRole('button', { name: 'Annuler le rendez-vous' })); expect(await screen.findByText('Erreur serveur.')).toBeVisible(); await user.click(screen.getByRole('button', { name: 'Annuler le rendez-vous' })); await user.click(screen.getByRole('button', { name: 'Annulation…' })); expect(fetch).toHaveBeenCalledTimes(2); resolveDelete(reply(200, { success: true })); await waitFor(() => expect(close).toHaveBeenCalledOnce()); expect(saved).toHaveBeenCalledOnce()
})

test('assign fetches options only when opened, preselects the current responsible, and preserves an error', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(reply(200, { success: true, options: [{ id: 'u1', label: 'Ana Martin' }, { id: 'u2', label: 'Sam Doe' }] })).mockResolvedValueOnce(reply(403, { success: false, error: 'Responsable indisponible.' }))
  vi.stubGlobal('fetch', fetch); const user = userEvent.setup(); const close = vi.fn(); const saved = vi.fn()
  render(<AppointmentAssignDialog projectId="p1" appointmentId="a1" assignedUserId="u1" onClose={close} onSaved={saved} />); expect(fetch).toHaveBeenCalledOnce(); expect((await screen.findByLabelText('Responsable') as HTMLSelectElement).value).toBe('u1'); await user.selectOptions(screen.getByLabelText('Responsable'), 'u2'); await user.click(screen.getByRole('button', { name: 'Enregistrer' })); expect(await screen.findByText('Responsable indisponible.')).toBeVisible(); expect(screen.getByRole('dialog')).toBeVisible(); expect(close).not.toHaveBeenCalled(); expect(saved).not.toHaveBeenCalled()
})

test('engagement exposes only enabled appointment actions without loading a detail', () => {
  const state = { status: 'ready' as const, data: { appointments: [{ id: 'a1', type: 'appointment', status: 'confirmed', startsAt: '2026-08-01T09:00', endsAt: '2026-08-01T10:00', label: 'Visite', assigneeId: 'u1', location: null }] } }
  const edit = vi.fn(); render(<ProjectWorkspaceSectionContent section="engagement" state={state} onEditAppointment={edit} />)
  expect(screen.getByRole('button', { name: 'Modifier' })).toBeVisible(); expect(screen.queryByRole('button', { name: 'Responsable' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Annuler le rendez-vous' })).toBeNull()
})
