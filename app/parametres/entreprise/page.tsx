'use client'

import { hasPermission } from '@/src/lib/team/permission-matrix'
import { PermissionGate } from '@/src/components/settings/PermissionGate'
import { ReadOnlyNotice } from '@/src/components/settings/ReadOnlyNotice'
import { CompanySettingsSection } from '@/src/components/settings/sections/CompanySettingsSection'
import { CompanyBrandingCard } from '@/src/components/settings/company/CompanyBrandingCard'
import { CompanyContactCard } from '@/src/components/settings/company/CompanyContactCard'
import { CompanyLegalCard } from '@/src/components/settings/company/CompanyLegalCard'
import { PrimaryContactCard } from '@/src/components/settings/company/PrimaryContactCard'
import SettingsSection from '@/src/components/settings/SettingsSection'
import { useCompanySettingsData } from '@/src/hooks/useCompanySettingsData'
import { useProfileSettingsData } from '@/src/hooks/useProfileSettingsData'

export default function CompanySettingsPage() {
  const companySettings = useCompanySettingsData()
  const profileSettings = useProfileSettingsData(companySettings.role)
  const canEditCompany = hasPermission(companySettings.role ?? 'viewer', 'company.update')
  const companyFormKey = companySettings.loading ? 'company-loading' : JSON.stringify(companySettings.values)
  const profileFormKey = profileSettings.loading ? 'profile-loading' : JSON.stringify(profileSettings.values)

  return <SettingsSection title="Mon entreprise" description="Gérez l’identité, les coordonnées et les informations administratives de votre entreprise.">{companySettings.error && !companySettings.loading && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{companySettings.error}</p>}<div className="space-y-4"><CompanySettingsSection key={companyFormKey} role={companySettings.role} values={companySettings.values} loading={companySettings.loading} onSave={companySettings.save} onSaved={companySettings.onSaved} /><PrimaryContactCard key={profileFormKey} values={profileSettings.values} canUpdate={profileSettings.canUpdate} onSave={profileSettings.save} /><PermissionGate role={companySettings.role} permission="company.read" fallback={<ReadOnlyNotice message="Vous n’avez pas accès aux informations de cette entreprise." />}><CompanyContactCard key={`${companyFormKey}-contact`} values={companySettings.values} readOnly={!canEditCompany} onSave={companySettings.save} /><CompanyBrandingCard key={`${companyFormKey}-branding`} values={companySettings.values} uploading={companySettings.uploading} uploadError={companySettings.uploadError} onUploadLogo={companySettings.uploadLogo} onRemoveLogo={companySettings.removeLogo} onSave={companySettings.save} readOnly={!canEditCompany} /><CompanyLegalCard key={`${companyFormKey}-legal`} values={companySettings.values} readOnly={!canEditCompany} onSave={companySettings.save} /></PermissionGate></div></SettingsSection>
}
