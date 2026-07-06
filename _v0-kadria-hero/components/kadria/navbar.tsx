'use client'

import { motion } from 'motion/react'

export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-16"
      style={{
        background:
          'linear-gradient(to bottom, rgba(15,17,21,0.95) 0%, rgba(15,17,21,0.0) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--kadria)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3h4.5v4.5H3V3zM8.5 3H13v4.5H8.5V3zM3 8.5h4.5V13H3V8.5zM8.5 8.5H13V13H8.5V8.5z"
              fill="#0a1410"
            />
          </svg>
        </div>
        <span className="text-foreground font-semibold text-[15px] tracking-tight">
          Kadria
        </span>
      </div>

      {/* Links — hidden on mobile */}
      <div className="hidden md:flex items-center gap-7">
        {['Fonctionnalités', 'Démo', 'Tarifs', 'FAQ'].map((link) => (
          <a
            key={link}
            href="#"
            className="text-[13.5px] font-medium transition-colors duration-150"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.color =
                'var(--foreground)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.color =
                'var(--muted-foreground)'
            }}
          >
            {link}
          </a>
        ))}
      </div>

      {/* CTA */}
      <motion.a
        href="#"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150"
        style={{
          background: 'var(--kadria)',
          color: '#0a1410',
        }}
      >
        Essai gratuit
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 7h8M8 4l3 3-3 3" />
        </svg>
      </motion.a>

      {/* Mobile menu icon */}
      <button className="md:hidden p-2" aria-label="Menu">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>
    </motion.nav>
  )
}
