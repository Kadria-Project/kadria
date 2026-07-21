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

test('workspace PATCH accepts only its minimal mutation fields', () => {
  expect(() => validateWorkspaceAppointmentPatch({ projectId: 'p1', title: 'Visite', start: '2026-08-01T09:00', end: '2026-08-01T10:00', location: '', description: '', client_name: 'Camille', client_email: 'camille@example.test', client_phone: '0600000000' })).not.toThrow()
  expect(() => validateWorkspaceAppointmentPatch({ projectId: 'p1', status: 'cancelled' })).toThrow('Champ non autorisé.')
  expect(() => validateWorkspaceAppointmentPatch({ projectId: 'p1', assignedUserId: 'u2' })).toThrow('Champ non autorisé.')
})

test('appointment route scopes reads and mutations to project and tenant and returns only a DTO', async () => {
  const source = await readFile(join(resolve(process.cwd()), 'app/api/appointments/[id]/route.ts'), 'utf8')
  expect(source).toContain("request.nextUrl.searchParams.get('projectId')")
  expect(source).toContain('matchesWorkspaceProject(data.project_id, projectId)')
  expect(source).toContain('matchesWorkspaceProject(existing.project_id')
  expect(source).toContain("select('id, tenant_id, project_id, assigned_user_id, title, start_time, end_time, status, location, description, client_name, client_phone, client_email')")
  expect(source).not.toContain("select('*')")
  expect(source).toContain("appointment: { id: String(data.id), title: String(data.title || '')")
})
