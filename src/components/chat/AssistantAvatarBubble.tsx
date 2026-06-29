'use client'

import { useState, useEffect } from 'react'

// ─── Presets ──────────────────────────────────────────────────────────────────
// Avatars "prêts à l'emploi" proposés à l'artisan, encodés en SVG inline (pas
// de dépendance externe, pas de droit d'image à gérer). Chaque preset est
// identifié par un id stable, résolu via la chaîne `preset:<id>` stockée dans
// assistantAvatarUrl quand assistantAvatarType === 'preset'.
export interface PresetAvatar {
  id: string
  label: string
  background: string
  svg: React.ReactNode
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'artisan_neutre',
    label: 'Artisan neutre',
    background: '#52525b',
    svg: (
      <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
      </svg>
    ),
  },
  {
    id: 'maison_travaux',
    label: 'Maison / travaux',
    background: '#0f766e',
    svg: (
      <svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    ),
  },
  {
    id: 'plomberie',
    label: 'Plomberie',
    background: '#2563eb',
    svg: (
      <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h6v4l4 4v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-3l2-2" />
        <path d="M7 4v4" />
      </svg>
    ),
  },
  {
    id: 'electricite',
    label: 'Électricité',
    background: '#ca8a04',
    svg: (
      <svg viewBox="0 0 24 24" width="58%" height="58%" fill="white" stroke="none">
        <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
      </svg>
    ),
  },
  {
    id: 'renovation',
    label: 'Rénovation',
    background: '#b45309',
    svg: (
      <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 3.5 18 7l-9.5 9.5L5 18l1.5-3.5z" />
        <path d="M12.5 5.5 16 9" />
      </svg>
    ),
  },
  {
    id: 'assistant_sobre',
    label: 'Assistant sobre',
    background: '#3f3f46',
    svg: (
      <svg viewBox="0 0 24 24" width="58%" height="58%" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="7" width="14" height="10" rx="2.5" />
        <path d="M9 11h.01M15 11h.01" />
        <path d="M12 3v4" />
      </svg>
    ),
  },
]

export function getPresetAvatar(id: string): PresetAvatar | undefined {
  return PRESET_AVATARS.find((p) => p.id === id)
}

export function isPresetRef(value?: string | null): boolean {
  return Boolean(value && value.startsWith('preset:'))
}

export function presetIdFromRef(value?: string | null): string {
  return value && value.startsWith('preset:') ? value.slice('preset:'.length) : ''
}

// ─── Bubble ───────────────────────────────────────────────────────────────────
export interface AssistantAvatarBubbleProps {
  size: number
  borderRadius?: string
  assistantAvatarType?: string
  assistantAvatarUrl?: string
  logoUrl?: string
  primaryColor?: string
  fallbackGradient?: string
  fontSize?: string
  fontWeight?: number
  textColor?: string
  border?: string
  boxShadow?: string
}

export default function AssistantAvatarBubble({
  size,
  borderRadius = '50%',
  assistantAvatarType = 'kadria_default',
  assistantAvatarUrl = '',
  logoUrl = '',
  primaryColor = '#22c55e',
  fallbackGradient,
  fontSize = '15px',
  fontWeight = 800,
  textColor = '#ecfdf5',
  border,
  boxShadow,
}: AssistantAvatarBubbleProps) {
  const [imageError, setImageError] = useState(false)

  // Réinitialise l'état d'erreur si la source change (ex: nouveau choix dans
  // les paramètres pendant l'aperçu live).
  useEffect(() => {
    setImageError(false)
  }, [assistantAvatarType, assistantAvatarUrl, logoUrl])

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    flexShrink: 0,
    overflow: 'hidden',
    border,
    boxShadow,
  }

  // 1) Avatar prédéfini (preset) : rendu en SVG inline, pas via <img>.
  if (assistantAvatarType === 'preset' && isPresetRef(assistantAvatarUrl) && !imageError) {
    const preset = getPresetAvatar(presetIdFromRef(assistantAvatarUrl))
    if (preset) {
      return (
        <div
          style={{
            ...baseStyle,
            background: preset.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {preset.svg}
        </div>
      )
    }
  }

  // 2) Image personnalisée (URL) ou logo entreprise réutilisé comme avatar.
  const imageSrc =
    assistantAvatarType === 'custom_upload' && assistantAvatarUrl
      ? assistantAvatarUrl
      : assistantAvatarType === 'company_logo' && logoUrl
        ? logoUrl
        : ''

  if (imageSrc && !imageError) {
    return (
      <div style={baseStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Avatar de l'assistant"
          onError={() => setImageError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )
  }

  // 3) Repli par défaut : la lettre "K" (comportement historique inchangé).
  return (
    <div
      style={{
        ...baseStyle,
        background: fallbackGradient || `linear-gradient(145deg, ${primaryColor} 0%, #0f3d24 130%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight,
        fontSize,
        color: textColor,
      }}
    >
      K
    </div>
  )
}
