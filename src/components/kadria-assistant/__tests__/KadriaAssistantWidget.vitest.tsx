import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ pathname: '/dashboard-v2' }))

vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname, useRouter: () => ({ push: vi.fn() }) }))

import KadriaAssistantWidget from '../KadriaAssistantWidget'
import { ShellContextProvider, useShellContext } from '@/src/components/workspace/shell/ShellContextProvider'
import { createCollaboratorContextSnapshot } from '@/src/lib/kadria-assistant/collaborator-context'
import { getShellContextFromPathname } from '@/src/components/workspace/shell/shell-context'

function OpenCollaborator() {
  const { openCollaborator } = useShellContext()
  return <button type="button" onClick={() => openCollaborator()}>Ouvrir le Collaborateur</button>
}

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderWidget() {
  return render(<ShellContextProvider><OpenCollaborator /><KadriaAssistantWidget /></ShellContextProvider>)
}

describe('KadriaAssistantWidget Today Actions refresh state', () => {
  beforeEach(() => {
    navigation.pathname = '/dashboard-v2'
    sessionStorage.clear()
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows an explicit refresh state before an empty response is finalized', async () => {
    let resolve!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((done) => { resolve = done })))
    renderWidget()
    screen.getByRole('button', { name: 'Ouvrir le Collaborateur' }).click()

    expect(await screen.findByText('Je regarde vos priorités...')).toBeVisible()
    expect(screen.queryByText("Rien d'urgent pour le moment.")).toBeNull()

    resolve(reply(200, { success: true, actions: [] }))
    await waitFor(() => expect(screen.queryByText('Je regarde vos priorités...')).toBeNull())
    expect(screen.getByText("Rien d'urgent pour le moment.")).toBeVisible()
  })

  it('keeps restored content visible while exposing the active refresh', async () => {
    const context = createCollaboratorContextSnapshot(getShellContextFromPathname('/dashboard-v2'), '2026-07-22T00:00:00.000Z')
    sessionStorage.setItem('kadria-assistant-session', JSON.stringify({ messages: [{ role: 'assistant', content: 'Conversation restaurée', context }], usage: null }))
    let resolve!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((done) => { resolve = done })))
    renderWidget()
    screen.getByRole('button', { name: 'Ouvrir le Collaborateur' }).click()

    expect(await screen.findByText('Conversation restaurée')).toBeVisible()
    expect(await screen.findByText('Je regarde vos priorités...')).toBeVisible()

    resolve(reply(500, { success: false, error: 'Priorités indisponibles.' }))
    await waitFor(() => expect(screen.queryByText('Je regarde vos priorités...')).toBeNull())
  })
})
