'use client'

import { FormEvent, useEffect, useState } from 'react'
import { KadriaLogo } from '@/src/components/KadriaLogo'

function callbackUrlFromLocation() {
  const value = new URLSearchParams(window.location.search).get('callbackUrl')
  return value?.startsWith('/') && !value.startsWith('//') ? value : null
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState<'password' | 'magic' | 'reset' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setCallbackUrl(callbackUrlFromLocation()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function requestMagicLink() {
    if (!email || !email.includes('@')) return setError('Adresse email invalide.')
    setLoading('magic'); setError('')
    try {
      const response = await fetch('/api/auth/send-magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, callbackUrl }) })
      const data = await response.json()
      if (!data.success) return setError('Impossible d’envoyer le lien pour le moment. Réessayez dans quelques instants.')
      setSent(true)
    } catch { setError('Impossible d’envoyer le lien pour le moment. Réessayez dans quelques instants.') } finally { setLoading(null) }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email || !email.includes('@') || !password) return setError('Adresse email ou mot de passe incorrect.')
    setLoading('password'); setError('')
    try {
      const response = await fetch('/api/auth/password/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, callbackUrl }) })
      const data = await response.json()
      if (!data.success) return setError(data.error || 'Impossible de vous connecter pour le moment. Réessayez dans quelques instants.')
      window.location.assign(data.redirectUrl || '/dashboard-v2')
    } catch { setError('Impossible de vous connecter pour le moment. Réessayez dans quelques instants.') } finally { setLoading(null) }
  }

  async function requestReset() {
    if (!email || !email.includes('@')) return setError('Adresse email invalide.')
    setLoading('reset'); setError('')
    try {
      const response = await fetch('/api/auth/password/reset-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await response.json()
      if (!data.success) return setError(data.error || 'Impossible d’envoyer le lien pour le moment. Réessayez dans quelques instants.')
      setSent(true)
    } catch { setError('Impossible d’envoyer le lien pour le moment. Réessayez dans quelques instants.') } finally { setLoading(null) }
  }

  const inputClass = 'mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-[15px] text-white outline-none focus:border-emerald-500'
  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-5 text-white"><div className="w-full max-w-md"><div className="mb-10 text-center"><div className="mb-2 flex justify-center"><KadriaLogo size="lg" theme="dark" noLink /></div><p className="text-sm text-zinc-500">Espace professionnel artisan</p></div>{sent ? <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center"><h1 className="text-xl font-bold">Email envoyé</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Si cette adresse est associée à un compte, vous allez recevoir un email. Vérifiez aussi vos spams.</p><button className="mt-6 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300" onClick={() => { setSent(false); setMode('login'); setError('') }}>Revenir à la connexion</button></div> : <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8"><h1 className="text-xl font-bold">{mode === 'forgot' ? 'Réinitialiser votre mot de passe' : 'Connexion à Kadria'}</h1>{mode === 'forgot' ? <><p className="mt-2 text-sm leading-6 text-zinc-400">Saisissez votre adresse email pour recevoir un lien sécurisé.</p><label className="mt-7 block text-xs font-semibold uppercase tracking-wider text-zinc-400" htmlFor="email">Adresse email</label><input id="email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><button disabled={loading !== null} onClick={() => void requestReset()} className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-3 font-bold text-zinc-950 disabled:bg-zinc-600">{loading === 'reset' ? 'Envoi…' : 'Recevoir le lien de réinitialisation'}</button><button className="mt-5 w-full text-sm text-zinc-400 underline" onClick={() => { setMode('login'); setError('') }}>Retour à la connexion</button></> : <form onSubmit={signIn}><label className="mt-7 block text-xs font-semibold uppercase tracking-wider text-zinc-400" htmlFor="email">Adresse email</label><input id="email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-zinc-400" htmlFor="password">Mot de passe</label><div className="relative"><input id="password" className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-5 text-xs text-zinc-400">{showPassword ? 'Masquer' : 'Afficher'}</button></div>{error && <p className="mt-4 text-sm text-red-400" role="alert">{error}</p>}<button disabled={loading !== null} className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-3 font-bold text-zinc-950 disabled:bg-zinc-600" type="submit">{loading === 'password' ? 'Connexion…' : 'Se connecter'}</button><button type="button" className="mt-5 text-sm text-zinc-400 underline" onClick={() => { setMode('forgot'); setError('') }}>Mot de passe oublié ?</button><div className="my-7 flex items-center gap-3 text-xs text-zinc-500"><span className="h-px flex-1 bg-zinc-800" />ou<span className="h-px flex-1 bg-zinc-800" /></div><button disabled={loading !== null} type="button" onClick={() => void requestMagicLink()} className="w-full rounded-lg border border-zinc-700 px-4 py-3 font-semibold text-zinc-100 disabled:text-zinc-500">{loading === 'magic' ? 'Envoi…' : 'Recevoir un lien magique'}</button></form>}{mode === 'forgot' && error && <p className="mt-4 text-sm text-red-400" role="alert">{error}</p>}</div>}</div></main>
}
