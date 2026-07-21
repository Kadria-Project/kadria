import { describe, expect, it } from 'vitest'
import { projectIntakeSchema, projectIntakeToProjectInput } from '../intake-contract'

const valid = { clientName: 'Dupont', clientPhone: '0600000000', siteAddress: '1 rue de Paris', source: 'quick-create' }

describe('project intake contract', () => {
  it('uses the same canonical project fields as the public intake model', () => {
    const parsed = projectIntakeSchema.parse(valid)
    expect(projectIntakeToProjectInput(parsed, 'artisan-1')).toMatchObject({ clientName: 'Dupont', clientPhone: '0600000000', siteAddress: '1 rue de Paris', source: 'quick-create' })
  })

  it('requires a contact method and a chantier address', () => {
    expect(projectIntakeSchema.safeParse({ clientName: 'Dupont', siteAddress: '1 rue de Paris' }).success).toBe(false)
    expect(projectIntakeSchema.safeParse({ clientName: 'Dupont', clientEmail: 'a@b.test' }).success).toBe(false)
  })

  it('keeps an explicitly selected canonical client separate from editable fields', () => {
    const parsed = projectIntakeSchema.parse({ ...valid, existingClientId: '1be11efc-77a0-4bad-b765-0e13f81b5dcf', clientFirstName: 'Alice' })
    expect(parsed.existingClientId).toBe('1be11efc-77a0-4bad-b765-0e13f81b5dcf')
    expect(parsed.clientFirstName).toBe('Alice')
  })
})
