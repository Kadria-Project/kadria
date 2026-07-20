import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { AppointmentCreateDialog } from '../dialogs/AppointmentCreateDialog'
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
afterEach(() => vi.unstubAllGlobals())
test('validates dates and refreshes once after creation', async () => { const fetch = vi.fn().mockResolvedValue(reply(200, { success: true })); vi.stubGlobal('fetch', fetch); const close = vi.fn(); const saved = vi.fn().mockResolvedValue(undefined); const user = userEvent.setup(); render(<AppointmentCreateDialog projectId="p1" onClose={close} onSaved={saved} />); await user.type(screen.getByLabelText('Début'), '2026-08-01T09:00'); await user.type(screen.getByLabelText('Fin'), '2026-08-01T10:00'); await user.click(screen.getByRole('button', { name: 'Enregistrer' })); expect(fetch).toHaveBeenCalledOnce(); expect(saved).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce() })
