import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import path from 'node:path'

const root = process.cwd()

describe('collaborator structure', () => {
  it('mounts the real assistant once from the shell and keeps no static panel', () => {
    const shell = readFileSync(path.join(root, 'src/components/workspace/KadriaAppShell.tsx'), 'utf8')
    // The desktop and mobile branches are mutually exclusive at runtime; both
    // deliberately host the same stateful assistant rather than mounting it globally.
    expect(shell.match(/<KadriaAssistantWidget\s*\/>/g)).toHaveLength(2)
    expect(existsSync(path.join(root, 'src/components/workspace/KadriaCollaboratorPanel.tsx'))).toBe(false)
  })

  it('does not use DOM querying to open Kadria', () => {
    const files = [
      'src/components/workspace/KadriaAppShell.tsx',
      'src/components/kadria-assistant/KadriaAssistantWidget.tsx',
      'src/components/workspace/shell/ShellContextProvider.tsx',
    ]
    for (const file of files) expect(readFileSync(path.join(root, file), 'utf8')).not.toContain('document.querySelector')
  })

  it('keeps contextual actions compact and lets the user clear local history', () => {
    const widget = readFileSync(path.join(root, 'src/components/kadria-assistant/KadriaAssistantWidget.tsx'), 'utf8')
    expect(widget).toContain('contextualSuggestions.slice(0, 4)')
    expect(widget).toContain('Effacer la conversation')
    expect(widget).toContain("sessionStorage.removeItem(SESSION_STORAGE_KEY)")
  })

  it('renders canonical assistant response metadata without an OpenAI-specific branch', () => {
    const widget = readFileSync(path.join(root, 'src/components/kadria-assistant/KadriaAssistantWidget.tsx'), 'utf8')
    expect(widget).toContain('assistantTitle')
    expect(widget).toContain('assistantEvidence')
    expect(widget).toContain('assistantFollowUp')
    expect(widget).not.toContain('openaiResponse')
  })

  it('keeps the desktop header and footer aligned with Shell dimensions', () => {
    const widget = readFileSync(path.join(root, 'src/components/kadria-assistant/KadriaAssistantWidget.tsx'), 'utf8')
    expect(widget).toContain('min-h-[76px]')
    expect(widget).toContain('h-10 shrink-0 items-center justify-center')
    expect(widget).toContain('flex-col gap-2 sm:flex-row sm:items-center')
    expect(widget).toContain('aria-label="Suggestions"')
  })
})
