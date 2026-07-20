import { expect, test, vi } from 'vitest'
vi.mock('@/src/lib/airtable', () => ({ TABLES: { projects: 'Projects', devis: 'Devis', activity: 'Activity' } }))
vi.mock('@/src/lib/project-responsibility', () => ({ authorizeProjectAccess: vi.fn() }))
vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from: vi.fn() } }))
vi.mock('@/src/lib/team/access', () => ({ PermissionError: class PermissionError extends Error { status = 403 } }))
import { parsePipelineCommand, pipelineForStatus } from './route'
test('pipeline contract exposes only real ordered transitions', () => { expect(pipelineForStatus('Nouveau').allowedTransitions).toEqual(['À rappeler', 'Qualifié', 'Perdu']); expect(pipelineForStatus('Devis envoyé').allowedTransitions).toEqual(['Gagné', 'Perdu']); expect(pipelineForStatus('Gagné').allowedTransitions).toEqual([]) })
test('pipeline commands reject unknown fields, loss reasons and direct terminal moves', () => { expect(() => parsePipelineCommand({ action: 'mark_won' })).not.toThrow(); expect(() => parsePipelineCommand({ action: 'mark_lost' })).not.toThrow(); expect(() => parsePipelineCommand({ action: 'mark_lost', lossReason: 'prix' })).toThrow(); expect(() => parsePipelineCommand({ action: 'move', targetStage: 'Gagné' })).toThrow(); expect(() => parsePipelineCommand({ action: 'move', targetStage: 'Inconnu' })).toThrow() })
