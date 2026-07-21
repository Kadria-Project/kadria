import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import path from 'node:path'

const root = process.cwd()

describe('collaborator structure', () => {
  it('mounts the real assistant once from the shell and keeps no static panel', () => {
    const shell = readFileSync(path.join(root, 'src/components/workspace/KadriaAppShell.tsx'), 'utf8')
    expect(shell.match(/<KadriaAssistantWidget\s*\/>/g)).toHaveLength(1)
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
})
