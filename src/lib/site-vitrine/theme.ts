import type { CSSProperties } from 'react'
import type { SiteTheme } from './types'

/**
 * Convertit le thème typé d'un site vitrine en variables CSS scopées `--sv-*`,
 * posées sur le wrapper racine du site. Les composants site-vitrine ne
 * consomment QUE ces variables (jamais les variables du dashboard Kadria),
 * ce qui permet de re-thémer le même jeu de composants pour un autre métier
 * en changeant uniquement la config.
 */
export function themeToCssVars(theme: SiteTheme): CSSProperties {
  return {
    '--sv-paper': theme.paper,
    '--sv-paper-soft': theme.paperSoft,
    '--sv-ink': theme.ink,
    '--sv-body': theme.body,
    '--sv-muted': theme.muted,
    '--sv-night': theme.night,
    '--sv-brand': theme.brand,
    '--sv-accent': theme.accent,
    '--sv-accent-strong': theme.accentStrong,
    '--sv-line': theme.line,
    '--sv-line-dark': theme.lineOnDark,
  } as CSSProperties
}

/** Construit l'URL du parcours de demande avec le tracking de la config. */
export function buildIntakeUrl(
  formPath: string,
  tracking: Record<string, string>,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams({ ...tracking, ...extra })
  return `${formPath}?${params.toString()}`
}
