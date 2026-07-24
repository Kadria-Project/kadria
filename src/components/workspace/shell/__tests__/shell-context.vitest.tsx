import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  getShellCapabilities,
  getShellContextFromPathname,
} from '../shell-context'

const navigation = vi.hoisted(() => ({ pathname: '/dashboard-v2' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn() }),
}))

import { ShellContextProvider, ShellContextSync, useShellContext } from '../ShellContextProvider'
import { toKadriaAssistantPageContext } from '@/src/lib/kadria-assistant/page-context'
import GlobalSearchDialog from '../../GlobalSearchDialog'
import KadriaMobileNavigation from '../../KadriaMobileNavigation'

function ContextProbe() {
  const { shellContext } = useShellContext()
  return <output data-testid="shell-context">{JSON.stringify(shellContext)}</output>
}

describe('shell route context', () => {
  it.each([
    ['/dashboard-v2', 'dashboard', '/dashboard-v2'],
    ['/dashboard-v2/a-faire', 'tasks', '/dashboard-v2/a-faire'],
    ['/dashboard-v2/suivi', 'tracking', '/dashboard-v2/suivi'],
    ['/dashboard-v2/agenda', 'calendar', '/dashboard-v2/agenda'],
    ['/dashboard-v2/clients', 'clients', '/dashboard-v2/clients'],
    ['/dashboard-v2/performance', 'performance', '/dashboard-v2/performance'],
    ['/parametres/automatisations', 'settings', '/parametres'],
    ['/ressources/guides?draft=true#top', 'resources', '/ressources'],
    ['/inconnue?token=secret#hash', 'unknown', '/unknown'],
  ])('normalizes %s', (pathname, pageType, route) => {
    const context = getShellContextFromPathname(pathname)
    expect(context.pageType).toBe(pageType)
    expect(context.route).toBe(route)
  })

  it('keeps a project identifier internal while normalizing its route', () => {
    const context = getShellContextFromPathname('/dashboard-v2/projet/abc-123?token=secret#section')
    expect(context).toMatchObject({
      pageType: 'project',
      route: '/dashboard-v2/projet/[id]',
      entity: { type: 'project', id: 'abc-123' },
    })
    expect(context.route).not.toContain('abc-123')
    expect(context.route).not.toContain('?')
    expect(context.route).not.toContain('#')
  })
})

describe('shell capabilities', () => {
  it('only exposes creation flows proven by the current page context', () => {
    expect(getShellCapabilities('project')).toMatchObject({ createAppointment: true, createQuote: true, createProject: true, createClient: false })
    expect(getShellCapabilities('dashboard')).toMatchObject({ createAppointment: true, createQuote: false, createProject: true })
    expect(getShellCapabilities('settings')).toMatchObject({ createAppointment: false, createQuote: false, createProject: false, createClient: false })
    expect(getShellCapabilities('unknown')).toEqual({ search: false, collaborator: false, createAppointment: false, createQuote: false, createProject: false, createClient: false })
  })
})

describe('ShellContextProvider', () => {
  it('updates with pathname changes and clears local enrichment on unmount', () => {
    navigation.pathname = '/dashboard-v2/projet/project-1'
    const view = render(<ShellContextProvider><ShellContextSync value={{ entity: { type: 'project', id: 'ignored', label: 'Cuisine Dupont' } }} /><ContextProbe /></ShellContextProvider>)
    expect(JSON.parse(screen.getByTestId('shell-context').textContent || '{}')).toMatchObject({ entity: { id: 'project-1', label: 'Cuisine Dupont' } })

    navigation.pathname = '/dashboard-v2/performance'
    view.rerender(<ShellContextProvider><ContextProbe /></ShellContextProvider>)
    const nextContext = JSON.parse(screen.getByTestId('shell-context').textContent || '{}')
    expect(nextContext.pageType).toBe('performance')
    expect(nextContext).not.toHaveProperty('entity')
  })

  it('fails explicitly when consumed outside its provider', () => {
    expect(() => render(<ContextProbe />)).toThrow('useShellContext must be used inside ShellContextProvider.')
  })

  it('opens global search with Ctrl+K and from the mobile trigger', () => {
    navigation.pathname = '/dashboard-v2'
    render(<ShellContextProvider><KadriaMobileNavigation /><GlobalSearchDialog /></ShellContextProvider>)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Recherche globale' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Recherche globale' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }))
    expect(screen.getByRole('dialog', { name: 'Recherche globale' })).toBeInTheDocument()
  })

  it('treats Clients as a first-level workspace on mobile', () => {
    navigation.pathname = '/dashboard-v2/clients'
    const view = render(<ShellContextProvider><KadriaMobileNavigation /></ShellContextProvider>)
    const scoped = within(view.container)
    expect(scoped.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/dashboard-v2/clients')
    expect(scoped.getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page')
    expect(scoped.getByRole('link', { name: 'Suivi' })).not.toHaveAttribute('aria-current')
  })
})

describe('Kadria assistant adapter', () => {
  it('uses the canonical shell context for dashboard, project, performance and settings', () => {
    expect(toKadriaAssistantPageContext(getShellContextFromPathname('/dashboard-v2'))).toMatchObject({ pageType: 'dashboard_home', route: '/dashboard-v2' })
    expect(toKadriaAssistantPageContext(getShellContextFromPathname('/dashboard-v2/projet/project-1'))).toMatchObject({ pageType: 'project_detail', route: '/dashboard-v2/projet/[id]', projectId: 'project-1' })
    expect(toKadriaAssistantPageContext(getShellContextFromPathname('/dashboard-v2/performance'))).toMatchObject({ pageType: 'performance', route: '/dashboard-v2/performance' })
    expect(toKadriaAssistantPageContext(getShellContextFromPathname('/parametres/entreprise'))).toMatchObject({ pageType: 'settings', route: '/parametres', section: 'entreprise' })
  })
})
