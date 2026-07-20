import { expect, test, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

vi.mock('@/src/lib/airtable', () => ({ TABLES: { projects: 'Projects', activity: 'Activity' } }))
vi.mock('@/src/lib/project-responsibility', () => ({ authorizeProjectAccess: vi.fn() }))
vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from: vi.fn() } }))
vi.mock('@/src/lib/team/access', () => ({ PermissionError: class PermissionError extends Error { status = 403 } }))

import { parseProjectEditInput } from '@/app/api/projects/[id]/workspace/edit/route'

test('edit payload parser keeps the allowlist and distinguishes absent, empty and invalid values', () => {
  expect(parseProjectEditInput({ city: ' Rouen ', clientPhone: '' })).toEqual({ city: 'Rouen', clientPhone: '' })
  expect(parseProjectEditInput({})).toEqual({})
  expect(() => parseProjectEditInput({ clientPhone: null })).toThrow('Valeur invalide.')
  expect(() => parseProjectEditInput({ status: 'Gagné' })).toThrow('Champ non autorisé.')
  expect(() => parseProjectEditInput({ clientEmail: 'invalid' })).toThrow('E-mail invalide.')
})

test('edit route applies update authorization, minimal columns and narrow PATCH refreshes', async () => {
  const source = await readFile(join(resolve(process.cwd()), 'app/api/projects/[id]/workspace/edit/route.ts'), 'utf8')
  expect(source).toContain("requiredPermission: 'projects.update'")
  expect(source).toContain("select: 'id, project_type, trade, city, client_first_name, client_name, client_phone, client_email, site_address'")
  expect(source).toContain("select: 'id'")
  expect(source).not.toContain("select('*')")
  expect(source).toContain("refresh: ['brief', 'client', 'history']")
  expect(source).not.toContain('window.location.reload')
})
