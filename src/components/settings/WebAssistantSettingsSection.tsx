'use client'

import { useState } from 'react'
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline'
import AssistantAvatarBubble, { PRESET_AVATARS } from '@/src/components/chat/AssistantAvatarBubble'
import { ReadOnlyNotice } from '@/src/components/settings/ReadOnlyNotice'

export type WidgetColorMode = 'sobriety' | 'immersive' | 'premium_dark'

export type WebAssistantSettingsValues = {
  companyName: string
  logoUrl: string
  plan: string
  assistantAvatarType: string
  assistantAvatarUrl: string
  welcomeName: string
  welcomeMessage: string
  primaryColor: string
  secondaryColor: string
  widgetColorMode: WidgetColorMode
  whiteLabelEnabled: boolean
  widgetBrandName: string
  widgetBrandLogoUrl: string
}

type WebAssistantSettingsSectionProps = {
  values: WebAssistantSettingsValues
  artisanId: string
  isMobile: boolean
  canManage: boolean
  uploadingAvatar: boolean
  uploadingWhiteLabelLogo: boolean
  uploadError: string | null
  showUploadError: boolean
  onValuesChange: (updater: (values: WebAssistantSettingsValues) => WebAssistantSettingsValues) => void
  onUploadAssistantAvatar: (file: File) => void
  onUploadWhiteLabelLogo: (file: File) => void
  onGoToBilling: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-hover)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: 'var(--text-1)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'system-ui',
}

const labelStyle: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '6px',
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--text-2)',
  fontSize: '13px',
  cursor: 'pointer',
}

export function WebAssistantSettingsSection({
  values,
  artisanId,
  isMobile,
  canManage,
  uploadingAvatar,
  uploadingWhiteLabelLogo,
  uploadError,
  showUploadError,
  onValuesChange,
  onUploadAssistantAvatar,
  onUploadWhiteLabelLogo,
  onGoToBilling,
}: WebAssistantSettingsSectionProps) {
  const [copied, setCopied] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const sectionCard: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: isMobile ? '16px' : '24px',
    marginBottom: '16px',
    minWidth: 0,
  }

  return (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                🎨 Mon widget
              </h2>
              {!canManage && (
                <ReadOnlyNotice message="Les réglages du widget sont réservés au propriétaire et aux administrateurs." />
              )}
              <fieldset disabled={!canManage} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Apparence du widget
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Choisissez le rendu visuel utilisé sur votre site et dans l&apos;aperçu.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                  {([
                    {
                      value: 'sobriety',
                      label: 'Sobre',
                      description: 'Clair, discret, compatible avec toutes les couleurs.',
                    },
                    {
                      value: 'immersive',
                      label: 'Immersif',
                      description: 'Met davantage votre couleur de marque en avant.',
                    },
                    {
                      value: 'premium_dark',
                      label: 'Sombre premium',
                      description: 'Rendu haut de gamme sur fond sombre.',
                    },
                  ] as Array<{ value: WidgetColorMode; label: string; description: string }>).map((mode) => {
                    const active = values.widgetColorMode === mode.value
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => onValuesChange(c => ({ ...c, widgetColorMode: mode.value }))}
                        style={{
                          textAlign: 'left',
                          padding: '14px',
                          borderRadius: '12px',
                          border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: active ? 'var(--accent-soft, rgba(34,197,94,0.12))' : 'var(--bg-hover)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          boxShadow: active ? '0 0 0 1px rgba(34,197,94,0.15) inset' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ color: active ? 'var(--accent)' : 'var(--text-1)', fontSize: '13px', fontWeight: 700 }}>
                            {mode.label}
                          </span>
                          {active && (
                            <span style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700 }}>
                              ✓ Actif
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--text-3)', fontSize: '12px', lineHeight: 1.5 }}>
                          {mode.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Tester mon widget
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 12px' }}>
                  Visualisez et testez le widget tel qu&apos;il apparaîtra sur votre site.
                </p>
                <div style={{
                  background: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  height: isMobile ? '480px' : '560px',
                }}>
                  <ChatWidgetInline
                    key={previewKey}
                    artisanId={artisanId}
                    artisanName={values.companyName || "l'artisan"}
                    primaryColor={values.primaryColor}
                    secondaryColor={values.secondaryColor}
                    widgetColorMode={values.widgetColorMode}
                    welcomeNameOverride={values.welcomeName}
                    welcomeMessageOverride={values.welcomeMessage}
                    assistantAvatarType={values.assistantAvatarType}
                    assistantAvatarUrl={values.assistantAvatarUrl}
                    logoUrl={values.logoUrl}
                    whiteLabelEnabled={values.plan === 'performance' || values.plan === 'entreprise' ? values.whiteLabelEnabled : false}
                    widgetBrandName={values.widgetBrandName}
                    widgetBrandLogoUrl={values.widgetBrandLogoUrl}
                    companyNameOverride={values.companyName}
                    planOverride={values.plan}
                    fitParentHeight
                    previewMode
                  />
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '8px', marginTop: '12px',
                }}>
                  <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
                    ⚠️ Les messages envoyés ici servent uniquement à tester le widget. Aucun dossier réel n&apos;est créé.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewKey(k => k + 1)}
                    style={{
                      background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)',
                      borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Réinitialiser la conversation
                  </button>
                </div>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Avatar de l&apos;assistant
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Choisissez l&apos;image qui apparaîtra dans la bulle de votre assistant, à la place du logo Kadria.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <AssistantAvatarBubble
                    assistantAvatarType={values.assistantAvatarType}
                    assistantAvatarUrl={values.assistantAvatarUrl}
                    logoUrl={values.logoUrl}
                    primaryColor={values.primaryColor}
                    size={48}
                  />
                  <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>Aperçu dans le widget</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {([
                    { id: 'company_logo', label: "Logo de l'entreprise" },
                    { id: 'custom_upload', label: 'Image personnalisée' },
                    { id: 'preset', label: 'Avatar proposé' },
                    { id: 'kadria_default', label: 'Logo Kadria par défaut' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onValuesChange(c => ({ ...c, assistantAvatarType: opt.id }))}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: values.assistantAvatarType === opt.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: values.assistantAvatarType === opt.id ? 'var(--accent-soft, rgba(34,197,94,0.12))' : 'var(--bg-hover)',
                        color: values.assistantAvatarType === opt.id ? 'var(--accent)' : 'var(--text-2)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {values.assistantAvatarType === 'custom_upload' && (
                  <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
                    <label style={labelStyle}>Image personnalisée</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {values.assistantAvatarUrl && (
                        <AssistantAvatarBubble
                          assistantAvatarType="custom_upload"
                          assistantAvatarUrl={values.assistantAvatarUrl}
                          size={40}
                        />
                      )}
                      <label
                        style={{
                          padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                          border: '1px solid var(--border)', background: 'var(--bg-hover)',
                          color: 'var(--text-2)', cursor: uploadingAvatar ? 'default' : 'pointer',
                          opacity: uploadingAvatar ? 0.6 : 1,
                        }}
                      >
                        {uploadingAvatar ? 'Import en cours...' : 'Importer une image'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploadingAvatar}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) onUploadAssistantAvatar(file)
                            e.target.value = ''
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onValuesChange(c => ({ ...c, assistantAvatarType: 'kadria_default', assistantAvatarUrl: '' }))}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                          border: '1px solid var(--border)', background: 'var(--bg-hover)',
                          color: 'var(--text-2)', cursor: 'pointer',
                        }}
                      >
                        Réinitialiser
                      </button>
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                      PNG, JPG ou WEBP, 4 Mo maximum.
                    </p>
                    {uploadError && showUploadError && (
                      <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{uploadError}</p>
                    )}
                  </div>
                )}

                {values.assistantAvatarType === 'preset' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '10px', maxWidth: isMobile ? '100%' : '420px' }}>
                    {PRESET_AVATARS.map(preset => {
                      const ref = `preset:${preset.id}`
                      const active = values.assistantAvatarUrl === ref
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onValuesChange(c => ({ ...c, assistantAvatarUrl: ref }))}
                          title={preset.label}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            padding: '8px', borderRadius: '10px', cursor: 'pointer',
                            border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: active ? 'var(--accent-soft, rgba(34,197,94,0.12))' : 'var(--bg-hover)',
                          }}
                        >
                          <AssistantAvatarBubble
                            assistantAvatarType="preset"
                            assistantAvatarUrl={ref}
                            size={36}
                          />
                          <span style={{ fontSize: '10.5px', color: 'var(--text-3)', textAlign: 'center' }}>{preset.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Couleurs
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Couleur principale</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={values.primaryColor}
                        onChange={e => onValuesChange(c => ({ ...c, primaryColor: e.target.value }))}
                        style={{
                          width: isMobile ? '40px' : '48px', height: '44px',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          background: 'transparent', cursor: 'pointer',
                          padding: '2px',
                        }}
                      />
                      <input
                        value={values.primaryColor}
                        onChange={e => onValuesChange(c => ({ ...c, primaryColor: e.target.value }))}
                        placeholder="#22c55e"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                      Couleur du header et des boutons CTA
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Couleur secondaire</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={values.secondaryColor}
                        onChange={e => onValuesChange(c => ({ ...c, secondaryColor: e.target.value }))}
                        style={{
                          width: isMobile ? '40px' : '48px', height: '44px',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          background: 'transparent', cursor: 'pointer',
                          padding: '2px',
                        }}
                      />
                      <input
                        value={values.secondaryColor}
                        onChange={e => onValuesChange(c => ({ ...c, secondaryColor: e.target.value }))}
                        placeholder="var(--bg-elevated)"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                      Fond du widget
                    </p>
                  </div>
                </div>

                {/* Palette de couleurs suggestions */}
                <div style={{ marginTop: '16px' }}>
                  <p style={{ ...labelStyle, marginBottom: '8px' }}>Palettes suggérées</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { name: 'Kadria', primary: '#22c55e', secondary: '#09090b' },
                      { name: 'Océan', primary: '#3b82f6', secondary: '#0f172a' },
                      { name: 'Ardoise', primary: '#64748b', secondary: '#0f172a' },
                      { name: 'Terracotta', primary: '#ea580c', secondary: '#1c0a00' },
                      { name: 'Violet', primary: '#8b5cf6', secondary: '#0f0a1e' },
                      { name: 'Or', primary: '#d97706', secondary: '#1c1000' },
                    ].map(palette => (
                      <button
                        key={palette.name}
                        onClick={() => onValuesChange(c => ({
                          ...c,
                          primaryColor: palette.primary,
                          secondaryColor: palette.secondary,
                        }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'var(--bg-hover)', border: '1px solid var(--border)',
                          borderRadius: '8px', padding: '6px 12px',
                          cursor: 'pointer', color: 'var(--text-1)', fontSize: '12px',
                        }}
                      >
                        <div style={{
                          width: '14px', height: '14px', borderRadius: '50%',
                          background: palette.primary,
                        }} />
                        {palette.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Message d&apos;accueil
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Personnalisez le premier message affiché au prospect.
                  Le moteur de qualification Kadria reste identique.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Message d&apos;accueil personnalisé</label>
                    <textarea
                      value={values.welcomeMessage}
                      onChange={e => onValuesChange(c => ({ ...c, welcomeMessage: e.target.value }))}
                      placeholder="Bonjour ! Je suis l'assistant de Martin Rénovation. Je vais vous aider à préparer votre projet. Pour commencer, quel type de travaux souhaitez-vous réaliser ?"
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    />
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '5px 0 0' }}>
                      Si vide, le message Kadria par défaut est utilisé.
                    </p>
                  </div>
                </div>
              </div>

              {/* Marque blanche — réservée aux plans Performance/Agence */}
              <div style={sectionCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)' }}>
                    Marque blanche
                  </h3>
                  <span style={{
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80',
                    borderRadius: '999px',
                    padding: '2px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}>
                    Performance
                  </span>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Affichez votre propre marque dans l&apos;assistant, à la place du branding Kadria.
                </p>

                {values.plan !== 'performance' && values.plan !== 'entreprise' ? (
                  <div style={{
                    background: 'var(--bg-hover)',
                    border: '1px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px' }}>
                      🔒 Cette fonctionnalité est réservée aux plans <strong>Performance</strong> et <strong>Agence</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => onGoToBilling()}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'var(--accent)',
                        border: 'none',
                        color: '#09090b',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Passer au plan Performance
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={values.whiteLabelEnabled}
                        onChange={e => onValuesChange(c => ({ ...c, whiteLabelEnabled: e.target.checked }))}
                      />
                      Activer la marque blanche
                    </label>

                    <div>
                      <label style={labelStyle}>Nom affiché dans le widget</label>
                      <input
                        value={values.widgetBrandName}
                        onChange={e => onValuesChange(c => ({ ...c, widgetBrandName: e.target.value }))}
                        placeholder="Ma Marque"
                        disabled={!values.whiteLabelEnabled}
                        style={{ ...inputStyle, opacity: values.whiteLabelEnabled ? 1 : 0.6 }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Logo de la marque</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', opacity: values.whiteLabelEnabled ? 1 : 0.6 }}>
                        {values.widgetBrandLogoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={values.widgetBrandLogoUrl}
                            alt="Aperçu du logo de marque"
                            style={{ height: '32px', maxWidth: '160px', objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        )}
                        <label
                          style={{
                            padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                            border: '1px solid var(--border)', background: 'var(--bg-hover)',
                            color: 'var(--text-2)',
                            cursor: !values.whiteLabelEnabled || uploadingWhiteLabelLogo ? 'default' : 'pointer',
                          }}
                        >
                          {uploadingWhiteLabelLogo ? 'Import en cours...' : 'Importer un logo marque blanche'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={!values.whiteLabelEnabled || uploadingWhiteLabelLogo}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) onUploadWhiteLabelLogo(file)
                              e.target.value = ''
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {values.logoUrl && (
                          <button
                            type="button"
                            disabled={!values.whiteLabelEnabled}
                            onClick={() => onValuesChange(c => ({ ...c, widgetBrandLogoUrl: c.logoUrl }))}
                            style={{
                              padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--text-2)', cursor: values.whiteLabelEnabled ? 'pointer' : 'default',
                            }}
                          >
                            Utiliser le logo entreprise
                          </button>
                        )}
                        {values.widgetBrandLogoUrl && (
                          <button
                            type="button"
                            disabled={!values.whiteLabelEnabled}
                            onClick={() => onValuesChange(c => ({ ...c, widgetBrandLogoUrl: '' }))}
                            style={{
                              padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--text-3)', cursor: values.whiteLabelEnabled ? 'pointer' : 'default',
                            }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                        PNG, JPG ou WEBP, 4 Mo maximum.
                      </p>
                      {uploadError && showUploadError && (
                        <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{uploadError}</p>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                    }}>
                      {(() => {
                        // Même règle que ChatWidgetInline.resolveWidgetBranding :
                        // marque blanche active (et plan Performance/Agence,
                        // déjà garanti par cette section) → logo de marque >
                        // logo entreprise pour l'image, nom de marque >
                        // companyName > "Kadria" pour le texte. Sinon "Kadria".
                        const isWhiteLabelActive = values.whiteLabelEnabled
                        const previewLogoUrl = isWhiteLabelActive ? (values.widgetBrandLogoUrl || values.logoUrl || '') : ''
                        const previewLabel = isWhiteLabelActive
                          ? (values.widgetBrandName || values.companyName || 'Kadria')
                          : 'Kadria'
                        return (
                          <>
                            {previewLogoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={previewLogoUrl}
                                alt=""
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : null}
                            <span style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600 }}>
                              {previewLabel}
                            </span>
                          </>
                        )
                      })()}
                      <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>Aperçu du header</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Code d'intégration */}
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Intégration sur votre site
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 14px' }}>
                  Copiez ce code et collez-le sur votre site
                  pour afficher le widget Kadria.
                </p>
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                  position: 'relative',
                }}>
                  <pre style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#4ade80',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    lineHeight: 1.6,
                  }}>
                    {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadria-beta.vercel.app'}/widget.js" data-artisan-id="${artisanId}"></script>`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadria-beta.vercel.app'}/widget.js" data-artisan-id="${artisanId}"></script>`
                      )
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: copied ? 'rgba(34,197,94,0.2)' : 'var(--bg-hover)',
                      border: '1px solid',
                      borderColor: copied ? 'var(--accent)' : 'var(--border)',
                      color: copied ? '#4ade80' : 'var(--text-2)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? '✓ Copié !' : 'Copier'}
                  </button>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '8px 0 0' }}>
                  Collez ce code avant la balise &lt;/body&gt; de votre site.
                  Le widget apparaît automatiquement aux couleurs de votre entreprise.
                </p>
              </div>
              </fieldset>
            </div>
  )
}
