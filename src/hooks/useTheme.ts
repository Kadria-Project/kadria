'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Charge la préférence depuis localStorage en priorité (instantané)
    const localTheme = localStorage.getItem('kadria-theme') as Theme | null
    if (localTheme === 'light' || localTheme === 'dark') {
      setThemeState(localTheme)
      document.documentElement.setAttribute('data-theme', localTheme)
    }
    setLoaded(true)

    // Puis synchronise avec la config Airtable (asynchrone)
    fetch('/api/artisan/config')
      .then(r => r.json())
      .then(data => {
        const remoteTheme = data?.config?.theme as Theme | undefined
        if (remoteTheme === 'light' || remoteTheme === 'dark') {
          setThemeState(remoteTheme)
          document.documentElement.setAttribute('data-theme', remoteTheme)
          localStorage.setItem('kadria-theme', remoteTheme)
        }
      })
      .catch(() => {})
  }, [])

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('kadria-theme', newTheme)

    // Sauvegarde async côté Airtable, ne bloque pas l'UI
    try {
      await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })
    } catch {
      // Échec silencieux — la préférence reste en localStorage
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, setTheme, toggleTheme, loaded }
}
