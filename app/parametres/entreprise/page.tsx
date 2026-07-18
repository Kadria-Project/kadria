'use client'

import { CompanySettingsSection } from '@/src/components/settings/sections/CompanySettingsSection'
import KadriaAppShell from '@/src/components/workspace/KadriaAppShell'
import { useCompanySettingsData } from '@/src/hooks/useCompanySettingsData'

export default function CompanySettingsPage() {
  const companySettings = useCompanySettingsData()

  return (
    <KadriaAppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-slate-500">
          Workspace <span aria-hidden="true">/</span> Paramètres <span aria-hidden="true">/</span>{' '}
          <span className="text-slate-700">Mon entreprise</span>
        </nav>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mon entreprise</h1>
          <p className="mt-2 text-sm text-slate-600">
            Gérez l’identité, les coordonnées et les informations publiques de votre entreprise.
          </p>
        </header>

        {companySettings.error && !companySettings.loading && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {companySettings.error}
          </p>
        )}

        <CompanySettingsSection
          role={companySettings.role}
          values={companySettings.values}
          loading={companySettings.loading}
          isMobile={companySettings.isMobile}
          uploading={companySettings.uploading}
          uploadError={companySettings.uploadError}
          onUploadLogo={companySettings.uploadLogo}
          onRemoveLogo={companySettings.removeLogo}
          onSave={companySettings.save}
          onSaved={companySettings.onSaved}
        />
      </main>
    </KadriaAppShell>
  )
}
