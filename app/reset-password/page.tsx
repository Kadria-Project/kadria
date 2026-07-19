'use client'

import { FormEvent, useEffect, useState } from 'react'
import { KadriaLogo } from '@/src/components/KadriaLogo'

function readRecoveryTokens() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  window.history.replaceState(null, '', window.location.pathname)
  return { accessToken, refreshToken }
}

export default function ResetPasswordPage() {
  const [tokens, setTokens] = useState<{ accessToken: string | null; refreshToken: string | null } | null>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setTokens(readRecoveryTokens()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tokens?.accessToken || !tokens.refreshToken) return setMessage('Le lien de réinitialisation n’est plus valide. Demandez-en un nouveau.')
    if (password.length < 12) return setMessage('Choisissez un mot de passe d’au moins 12 caractères.')
    if (password !== confirmation) return setMessage('Les deux mots de passe ne correspondent pas.')
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/auth/password/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, password }),
      })
      const data = await response.json()
      if (!data.success) return setMessage(data.error || 'Impossible de modifier le mot de passe pour le moment.')
      window.location.assign(data.redirectUrl || '/login')
    } catch {
      setMessage('Impossible de modifier le mot de passe pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-5 text-white"><div className="w-full max-w-md"><div className="mb-10 text-center"><div className="mb-2 flex justify-center"><KadriaLogo size="lg" theme="dark" noLink /></div><p className="text-sm text-zinc-500">Espace professionnel artisan</p></div><form onSubmit={submit} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><h1 className="text-xl font-bold">Créer un nouveau mot de passe</h1><p className="mt-2 text-sm leading-6 text-zinc-400">Choisissez un mot de passe d’au moins 12 caractères.</p><label className="mt-7 block text-xs font-semibold uppercase tracking-wider text-zinc-400" htmlFor="password">Nouveau mot de passe</label><input id="password" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-white" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-zinc-400" htmlFor="confirmation">Confirmer le mot de passe</label><input id="confirmation" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-white" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />{message && <p className="mt-4 text-sm text-red-400" role="alert">{message}</p>}<button disabled={loading || !tokens} className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-3 font-bold text-zinc-950 disabled:bg-zinc-600" type="submit">{loading ? 'Mise à jour…' : 'Enregistrer le mot de passe'}</button></form></div></main>
}
