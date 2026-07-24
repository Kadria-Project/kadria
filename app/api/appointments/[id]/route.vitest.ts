import { expect, test, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

vi.mock('@/src/lib/auth-utils', () => ({ getSession: vi.fn() }))
vi.mock('@/src/lib/appointments/access', () => ({ canDeleteAppointment: vi.fn(), canAssignAppointments: vi.fn(), canEditAppointment: vi.fn(), findAppointmentConflict: vi.fn(), listAssignableAppointmentMembers: vi.fn(), logAppointmentActivity: vi.fn(), resolveProjectForAppointment: vi.fn() }))
vi.mock('@/src/lib/appointments/reconfirmation', () => ({ detectSubstantiveAppointmentChange: vi.fn(), recordAppointmentLifecycleActivity: vi.fn(), sendAppointmentReconfirmationEmail: vi.fn() }))
vi.mock('@/src/lib/calendar/event-types', () => ({ isEventType: vi.fn() }))
vi.mock('@/src/lib/google-calendar', () => ({ getCalendarIntegration: vi.fn(), getValidAccessToken: vi.fn() }))
vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from: vi.fn() } }))
vi.mock('@/src/lib/tenant-context', () => ({ getCurrentTenantContext: vi.fn(), tableHasColumn: vi.fn() }))
vi.mock('@/src/lib/push', () => ({ sendAppointmentPush: vi.fn() }))
vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }))

import { validateWorkspaceAppointmentPatch } from './route'

test('workspace PATCH accepts the canonical appointment edit payload and rejects unknown fields for every appointment', () => {
  const payload = { projectId: 'p1', title: 'Visite', start: '2026-08-01T09:00', end: '2026-08-01T10:00', location: '12 rue de la Paix', description: '', client_name: 'Camille', client_email: 'camille@example.test', client_phone: '0600000000', assignedUserId: 'u2', eventType: 'appointment', requestId: 'request-1' }
  expect(() => validateWorkspaceAppointmentPatch(payload)).not.toThrow()
  expect(() => validateWorkspaceAppointmentPatch({ ...payload, location: null })).not.toThrow()
  expect(() => validateWorkspaceAppointmentPatch({ ...payload, location: '   ' })).not.toThrow()
  expect(() => validateWorkspaceAppointmentPatch({ ...payload, location: 'x'.repeat(501) })).toThrow("L’adresse du rendez-vous n’a pas pu être enregistrée")
  expect(() => validateWorkspaceAppointmentPatch({ ...payload, location: { value: '12 rue de la Paix' } })).toThrow("L’adresse du rendez-vous n’a pas pu être enregistrée")
  expect(() => validateWorkspaceAppointmentPatch({ ...payload, unknown_field: true })).toThrow('Ce champ ne peut pas être modifié')
  expect(() => validateWorkspaceAppointmentPatch({ title: 'Sans projet', unknown_field: true })).toThrow('Ce champ ne peut pas être modifié')
})

test('appointment route scopes reads to the requested project but allows a valid project reassignment', async () => {
  const source = await readFile(join(resolve(process.cwd()), 'app/api/appointments/[id]/route.ts'), 'utf8')
  expect(source).toContain("request.nextUrl.searchParams.get('projectId')")
  expect(source).toContain('matchesWorkspaceProject(data.project_id, projectId)')
  expect(source).not.toContain('if (existing.project_id && !matchesWorkspaceProject')
  expect(source).toContain("code: 'APPOINTMENT_NOT_FOUND'")
  expect(source).toContain("code: 'PROJECT_NOT_FOUND'")
  expect(source).toContain("select('id, tenant_id, project_id, assigned_user_id, title, start_time, end_time, status, location, description, client_name, client_phone, client_email')")
  expect(source).not.toContain("select('*')")
  expect(source).toContain("appointment: { id: String(data.id), title: String(data.title || '')")
})
