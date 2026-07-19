'use client'

import { useCallback, useEffect, useState } from 'react'

export function useAccessSettingsData() {
  const [email, setEmail] = useState('')
  const [passwordConfigured, setPasswordConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [configResponse, passwordResponse] = await Promise.all([fetch('/api/artisan/config'), fetch('/api/auth/password')])
      const config = await configResponse.json()
      const password = await passwordResponse.json()
      if (!config.success || !password.success) throw new Error('Informations indisponibles.')
      setEmail(typeof config.config?.email === 'string' ? config.config.email : '')
      setPasswordConfigured(Boolean(password.configured))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Informations indisponibles.') } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  const magicLink = async () => {
    if (!email) return
    setAction('magic'); setMessage(null)
    try { const response = await fetch('/api/auth/send-magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const data = await response.json(); if (!data.success) throw new Error('Envoi impossible.'); setMessage('Lien de connexion envoyé.') } catch { setMessage('Envoi impossible.') } finally { setAction(null) }
  }
  const savePassword = async (password: string) => {
    setAction('password'); setMessage(null)
    try { const response = await fetch('/api/auth/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); const data = await response.json(); if (!data.success) throw new Error(data.error || 'Mise à jour impossible.'); setPasswordConfigured(true); setMessage('Mot de passe enregistré.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Mise à jour impossible.') } finally { setAction(null) }
  }
  const logout = async () => {
    setAction('logout'); setMessage(null)
    try { const response = await fetch('/api/auth/logout', { method: 'POST' }); const data = await response.json(); if (!data.success) throw new Error('Déconnexion impossible.'); window.location.assign(data.redirectUrl || '/login') } catch { setMessage('Déconnexion impossible.') } finally { setAction(null) }
  }
  return { email, passwordConfigured, loading, action, message, magicLink, savePassword, logout }
}
