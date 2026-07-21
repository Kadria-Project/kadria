import { describe, expect, it } from 'vitest'
import { buildPerformanceAssistantResponse } from '../performance-insights'

const data = {
  period: '30d' as const,
  projects: [{ id: 'p1', project_title: 'Rénovation', created_at: '2026-07-01' }, { id: 'p2', project_title: 'Électricité', created_at: '2026-07-02' }],
  quotes: [{ project_id: 'p1', total_ttc: 12000, accepted: true, accepted_at: new Date().toISOString(), quote_sent_at: new Date().toISOString() }, { project_id: 'p2', total_ttc: 4000, accepted: true, accepted_at: new Date().toISOString(), quote_sent_at: new Date().toISOString() }],
}

describe('performance assistant insights', () => {
  it('summarizes canonical KPIs with an evidence level', () => {
    const response = buildPerformanceAssistantResponse('performance.summary', data)
    expect(response.details?.map((detail) => detail.id)).toEqual(['revenue', 'projects', 'conversion'])
    expect(response.evidence?.level).toBe('moderate')
  })

  it('returns only accepted-quote contributors with valid project routes', () => {
    const response = buildPerformanceAssistantResponse('performance.contributing_projects', data)
    expect(response.details).toHaveLength(2)
    expect(response.actions?.[0]).toMatchObject({ kind: 'navigate', href: '/dashboard-v2/projet/p1' })
  })

  it('keeps an empty period factual and limited', () => {
    const response = buildPerformanceAssistantResponse('performance.explain_change', { ...data, quotes: [] })
    expect(response.evidence?.level).toBe('limited')
    expect(response.summary).toContain('Aucune acceptation')
  })
})
