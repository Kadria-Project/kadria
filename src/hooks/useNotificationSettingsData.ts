'use client'

/** Les préférences navigateur restent portées par BrowserPushSettings ; ce point
 * d’entrée dédié évite toute dépendance à l’ancien contrôleur /parametres. */
export function useNotificationSettingsData() {
  return { available: typeof window !== 'undefined' && 'Notification' in window }
}
