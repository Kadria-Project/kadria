import type { AssistantSettings } from '@/src/hooks/useAssistantSettingsData'

export type AssistantSettingsDomain = 'identity' | 'appearance'
export type InstallationState = 'ready' | 'missing-public-id' | 'error'

export const ASSISTANT_FIELDS: Record<AssistantSettingsDomain, readonly (keyof AssistantSettings)[]> = {
  identity: ['welcomeName', 'welcomeMessage', 'assistantAvatarType', 'assistantAvatarUrl'],
  appearance: ['primaryColor', 'secondaryColor', 'widgetColorMode', 'whiteLabelEnabled', 'widgetBrandName', 'widgetBrandLogoUrl'],
}

export function getInstallationState(artisanId: string, loadError?: string): InstallationState {
  if (loadError) return 'error'
  return artisanId ? 'ready' : 'missing-public-id'
}

export function isWhiteLabelAllowed(plan: string): boolean {
  return plan === 'performance' || plan === 'entreprise'
}
