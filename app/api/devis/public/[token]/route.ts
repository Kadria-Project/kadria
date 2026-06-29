import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, getDevisByToken, getUserByArtisanIdentifier } from '@/src/lib/airtable'
import { getPricingMention, getVatExemptionMention, getInsuranceLines, getDelayMention, getLaborMention, getTravelFeeMention } from '@/src/lib/devis-legal'
import type { QuoteCommercialSettings } from '@/src/lib/quote-suggestions'
import { isWhiteLabelAllowed } from '@/src/lib/devis-branding'
import { normalizePlan } from '@/src/lib/plans'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length !== 36) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const devis = await getDevisByToken(token)
    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    const [config, user] = await Promise.all([
      getArtisanConfig(devis.artisanId),
      getUserByArtisanIdentifier(devis.artisanId),
    ])

    // Defense serveur : exactement comme app/api/artisan/public-config/route.ts —
    // on ne fait jamais confiance a une valeur de plan ou de marque blanche
    // venant du front. Le plan reel de l'artisan est revalide ici ; si le
    // plan ne permet pas la marque blanche (Essentiel), whiteLabelEnabled est
    // force a false meme si la colonne vaut encore true en base.
    const plan = normalizePlan(user?.plan)
    const planAllowsWhiteLabel = isWhiteLabelAllowed(plan)
    const whiteLabelEnabled = planAllowsWhiteLabel && Boolean(config?.whiteLabelEnabled)

    let lignes: unknown[] = []
    try {
      const parsed = JSON.parse(devis.lignesJson || '[]')
      if (Array.isArray(parsed)) lignes = parsed
    } catch {
      lignes = []
    }

    const quoteSettings = (config?.businessConfig as { quoteSettings?: QuoteCommercialSettings } | undefined)?.quoteSettings
    const pricingMention = getPricingMention(quoteSettings)
    const vatExemptionMention = getVatExemptionMention(quoteSettings?.vatMode)
    const insuranceLines = getInsuranceLines({
      ...quoteSettings,
      insuranceCompany: quoteSettings?.insuranceCompany || config?.assureur,
      insurancePolicyNumber: quoteSettings?.insurancePolicyNumber || config?.numAssurance,
    })
    const fallbackInsuranceMention = !insuranceLines && !config?.assuranceNonRequise && config?.assureur
      ? `Assurance : ${config.assureur}${config.numAssurance ? ` — N° ${config.numAssurance}` : ''}`
      : null
    const delayMention = getDelayMention(devis.delaiExecution, quoteSettings?.defaultEstimatedDelay)
    const laborMention = getLaborMention(quoteSettings?.laborMentionMode, lignes as { description?: string }[])
    const travelFeeMention = getTravelFeeMention(quoteSettings?.travelFeeMentionMode, lignes as { description?: string }[])

    return NextResponse.json({
      pricing_mention: pricingMention,
      vat_exemption_mention: vatExemptionMention,
      insurance_lines: insuranceLines,
      fallback_insurance_mention: fallbackInsuranceMention,
      delay_mention: delayMention,
      labor_mention: laborMention,
      travel_fee_mention: travelFeeMention,
      id: devis.id,
      numero: devis.devisNumber,
      amount: devis.totalTTC,
      total_ht: devis.totalHT,
      total_tva: devis.totalTVA,
      lignes,
      artisan: {
        raison_sociale: config?.raisonSociale || config?.companyName || '',
        adresse: [config?.adressePro, config?.cpPro, config?.villePro].filter(Boolean).join(' '),
        siret: config?.siret || '',
        tva: config?.tvaNumber || '',
      },
      branding: {
        plan,
        white_label_enabled: whiteLabelEnabled,
        widget_brand_name: whiteLabelEnabled ? (config?.widgetBrandName || '') : '',
        widget_brand_logo_url: whiteLabelEnabled ? (config?.widgetBrandLogoUrl || '') : '',
        logo_url: config?.logoUrl || '',
        company_name: config?.companyName || '',
        raison_sociale: config?.raisonSociale || '',
        primary_color: config?.primaryColor || '',
        secondary_color: config?.secondaryColor || '',
      },
      client: {
        nom: devis.clientName,
        email: devis.clientEmail,
        adresse: devis.clientAddress,
        telephone: devis.clientPhone,
      },
      date_emission: devis.dateEmission,
      date_validite: devis.dateValidite,
      objet: devis.objet,
      conditions_paiement: devis.conditionsPaiement,
      delai_execution: devis.delaiExecution,
      mention_legale: devis.mentionsLegales,
      pdf_url: devis.pdfUrl,
      accepted: devis.accepted,
      accepted_at: devis.acceptedAt,
      declined: devis.statut === 'Refusé' || Boolean(devis.declinedAt) || Boolean(devis.declineReason),
      declined_at: devis.declinedAt,
      decline_reason: devis.declineReason,
      opens_count: devis.opensCount,
    })
  } catch (error) {
    console.error('[DEVIS PUBLIC GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
