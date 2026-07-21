import { describe, expect, it } from 'vitest'
import { getQuickCreateActions } from '../quick-create'
import { getShellContextFromPathname } from '@/src/components/workspace/shell/shell-context'

describe('quick create resolver', () => {
  it('only exposes proven actions for each shell context', () => {
    expect(getQuickCreateActions(getShellContextFromPathname('/dashboard-v2')).map((item) => item.id)).toEqual(['appointment'])
    expect(getQuickCreateActions(getShellContextFromPathname('/dashboard-v2/agenda')).map((item) => item.id)).toEqual(['appointment'])
    expect(getQuickCreateActions(getShellContextFromPathname('/dashboard-v2/projet/p-1'))).toEqual([
      expect.objectContaining({ id: 'appointment', href: '/dashboard-v2/agenda?quickCreate=appointment&projectId=p-1' }),
      expect.objectContaining({ id: 'quote', href: '/dashboard-v2/projet/p-1/devis/new' }),
    ])
    expect(getQuickCreateActions(getShellContextFromPathname('/dashboard-v2/performance'))).toEqual([])
    expect(getQuickCreateActions(getShellContextFromPathname('/parametres'))).toEqual([])
  })
})
