import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { getArtisanByEmail } from '@/src/lib/airtable'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: 'Kadria <onboarding@resend.dev>',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Vérifie que l'email existe dans Airtable Users
      if (!user.email) return false
      try {
        const artisan = await getArtisanByEmail(user.email)
        if (!artisan) {
          console.log('[AUTH] Email non autorisé:', user.email)
          return '/auth/unauthorized'
        }
        return true
      } catch (error) {
        console.error('[AUTH] Erreur vérification:', error)
        return false
      }
    },
    async session({ session }) {
      // Enrichit la session avec les données Airtable
      if (session.user?.email) {
        try {
          const artisan = await getArtisanByEmail(session.user.email)
          if (artisan) {
            session.user.artisanId = artisan.artisanId
            session.user.companyName = artisan.companyName
            session.user.primaryColor = artisan.primaryColor || '#22c55e'
            session.user.plan = artisan.plan
          }
        } catch (error) {
          console.error('[AUTH] Session error:', error)
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/dashboard-v2`
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
})

// Extend session types
declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      artisanId?: string
      companyName?: string
      primaryColor?: string
      plan?: string
    }
  }
}
