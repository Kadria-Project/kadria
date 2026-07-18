'use client'

import type { TenantRole } from '@/src/lib/team/types'
import { hasPermission } from '@/src/lib/team/permission-matrix'
import { PermissionGate } from '@/src/components/settings/PermissionGate'
import { ReadOnlyNotice } from '@/src/components/settings/ReadOnlyNotice'
import { CompanyIdentityCard } from '@/src/components/settings/company/CompanyIdentityCard'

export type CompanySettingsValues = {
  companyName: string; websiteUrl: string; googleReviewUrl: string; phone: string; notificationEmail: string
  adressePro: string; cpPro: string; villePro: string; logoUrl: string
  raisonSociale: string; formeJuridique: string; siret: string; tvaNumber: string; tvaAssujetti: boolean
  assureur: string; numAssurance: string; assuranceNonRequise: boolean; devisMentionLegale: string
}

type Props = { role: TenantRole | null; values: CompanySettingsValues; loading: boolean; isMobile?: boolean; uploading?: boolean; uploadError?: string | null; onUploadLogo?: (file: File) => Promise<void>; onRemoveLogo?: () => void; onSave: (values: CompanySettingsValues) => Promise<void>; onSaved: (values: CompanySettingsValues) => void }

export function CompanySettingsSection({ role, values, onSave, onSaved }: Props) {
  const canEdit = hasPermission(role ?? 'viewer', 'company.update')

  return <PermissionGate role={role} permission="company.read" fallback={<ReadOnlyNotice message="Vous n’avez pas accès aux informations de cette entreprise." />}>
    <CompanyIdentityCard values={values} onSave={async (nextValues) => { await onSave(nextValues); onSaved(nextValues) }} readOnly={!canEdit} />
  </PermissionGate>
}
