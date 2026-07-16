'use client'

/**
 * Primitives d'animation du site vitrine.
 * - `useStableReducedMotion` : même pattern hydration-safe que la landing
 *   Kadria (src/components/landing/LandingHero.tsx) — la valeur réelle de
 *   `prefers-reduced-motion` n'est lue qu'après montage pour que SSR et
 *   premier rendu client coïncident.
 * - `Reveal` : apparition discrète au scroll, désactivée en reduced motion.
 */

import { useSyncExternalStore, type ReactNode } from 'react'
import { motion } from 'motion/react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

export function useStableReducedMotion() {
  // `useSyncExternalStore` avec un snapshot serveur `false` : le rendu SSR et
  // l'hydratation coïncident, puis React relit la vraie préférence juste
  // après — même garantie que le pattern `useStableReducedMotion` de la
  // landing Kadria, sans setState dans un effet.
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

type RevealProps = {
  children: ReactNode
  /** Décalage d'entrée en secondes. */
  delay?: number
  className?: string
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const shouldReduce = useStableReducedMotion()

  if (shouldReduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
