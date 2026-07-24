import { expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { projectContactFields, type AppointmentProjectOption } from '../AppointmentCreateModal'

const replacementProject: AppointmentProjectOption = {
  id: 'project-y',
  clientFirstName: 'Nora',
  clientName: 'Durand',
  clientEmail: 'nora@example.test',
  clientPhone: '+33601020304',
  projectTitle: 'Rénovation',
  projectType: 'Rénovation',
  status: 'qualified',
  city: 'Lille',
  siteAddress: '8 rue Nationale',
}

test('replacing a linked project maps only its contact fields', () => {
  expect(projectContactFields(replacementProject)).toEqual({
    clientName: 'Nora Durand',
    clientEmail: 'nora@example.test',
    clientPhone: '+33601020304',
    location: '8 rue Nationale, Lille',
  })
  expect(projectContactFields({ ...replacementProject, clientFirstName: '', clientName: '', clientEmail: null, clientPhone: null, siteAddress: '', city: '' })).toEqual({
    clientName: '', clientEmail: '', clientPhone: '', location: '',
  })
})

test('project reassignment keeps the immutable appointment ID in the PATCH URL', async () => {
  const source = await readFile(join(resolve(process.cwd()), 'src/components/workspace/calendar/CalendarWorkspace.tsx'), 'utf8')
  expect(source).toContain("'/api/appointments/' + editingAppointmentId")
  expect(source).toContain('projectId: form.projectId')
  expect(source).not.toContain("'/api/appointments/' + form.projectId")
  expect(source).toContain('projectContactFields(project)')
})
