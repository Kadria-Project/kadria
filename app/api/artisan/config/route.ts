import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, updateArtisanConfig, getUserByArtisanIdentifier, updateUser } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'

function isValidOptionalUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidDepositType(value: unknown): boolean {
  return value === undefined || value === null || value === 'percentage' || value === 'fixed'
}

function isValidWidgetColorMode(value: unknown): boolean {
  return value === undefined || value === null || value === 'sobriety' || value === 'immersive' || value === 'premium_dark'
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifie' },
        { status: 401 }
      )
    }
    const [config, user] = await Promise.all([
      getArtisanConfig(session.artisanId),
      getUserByArtisanIdentifier(session.artisanId),
    ])
    return NextResponse.json({
      success: true,
      config: config && {
        ...config,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        plan: session.plan,
      },
    })
  } catch (error) {
    console.error('[CONFIG GET]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifie' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (body.siret !== undefined && body.siret !== '' && !/^\d{14}$/.test(String(body.siret))) {
      return NextResponse.json(
        { success: false, error: 'Le SIRET doit contenir exactement 14 chiffres' },
        { status: 400 }
      )
    }

    if (body.devisPrefixe !== undefined && String(body.devisPrefixe).length > 6) {
      return NextResponse.json(
        { success: false, error: 'Le prefixe de numerotation ne peut pas depasser 6 caracteres' },
        { status: 400 }
      )
    }

    if (!isValidOptionalUrl(body.googleReviewUrl)) {
      return NextResponse.json(
        { success: false, error: "L'URL d'avis Google doit etre une URL valide" },
        { status: 400 }
      )
    }

    if (body.depositEnabled !== undefined && typeof body.depositEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'depositEnabled doit etre un booleen' },
        { status: 400 }
      )
    }

    if (!isValidDepositType(body.depositType)) {
      return NextResponse.json(
        { success: false, error: 'depositType doit etre percentage ou fixed' },
        { status: 400 }
      )
    }

    if (!isValidWidgetColorMode(body.widgetColorMode)) {
      return NextResponse.json(
        { success: false, error: 'widgetColorMode doit etre sobriety, immersive ou premium_dark' },
        { status: 400 }
      )
    }

    if (body.stripeConnectStatus !== undefined || body.stripeAccountId !== undefined) {
      return NextResponse.json(
        { success: false, error: 'Les champs Stripe Connect sont geres uniquement cote serveur' },
        { status: 403 }
      )
    }

    if (body.depositValue !== undefined && body.depositValue !== null && body.depositValue !== '') {
      const depositValue = Number(body.depositValue)
      if (!Number.isFinite(depositValue)) {
        return NextResponse.json(
          { success: false, error: 'depositValue doit etre numerique' },
          { status: 400 }
        )
      }

      const depositType = body.depositType === 'fixed' ? 'fixed' : 'percentage'
      if (depositType === 'percentage' && (depositValue < 1 || depositValue > 100)) {
        return NextResponse.json(
          { success: false, error: "Le pourcentage d'acompte doit etre compris entre 1 et 100" },
          { status: 400 }
        )
      }

      if (depositType === 'fixed' && depositValue < 0) {
        return NextResponse.json(
          { success: false, error: "Le montant fixe d'acompte doit etre superieur ou egal a 0" },
          { status: 400 }
        )
      }
    }

    if (body.trades !== undefined && !Array.isArray(body.trades)) {
      return NextResponse.json(
        { success: false, error: 'trades doit etre un tableau de metiers' },
        { status: 400 }
      )
    }

    if (body.businessConfig !== undefined) {
      const bc = body.businessConfig
      const isStringArrayOrUndefined = (value: unknown) =>
        value === undefined || (Array.isArray(value) && value.every((item) => typeof item === 'string'))
      const isCalendarMode = (value: unknown) => value === undefined || value === 'kadria' || value === 'google'

      if (
        typeof bc !== 'object' || bc === null ||
        !isStringArrayOrUndefined(bc.acceptedWorkTypes) ||
        !isStringArrayOrUndefined(bc.refusedWorkTypes) ||
        !isCalendarMode(bc.calendarMode)
      ) {
        return NextResponse.json(
          { success: false, error: 'businessConfig invalide : acceptedWorkTypes/refusedWorkTypes doivent etre des tableaux de chaines et calendarMode doit etre kadria ou google' },
          { status: 400 }
        )
      }

      if (bc.serviceCatalog !== undefined) {
        if (!Array.isArray(bc.serviceCatalog) || bc.serviceCatalog.length > 100) {
          return NextResponse.json(
            { success: false, error: 'businessConfig invalide : serviceCatalog doit etre un tableau de 100 elements maximum' },
            { status: 400 }
          )
        }
        const isValidItem = (item: unknown) => {
          if (typeof item !== 'object' || item === null) return false
          const current = item as Record<string, unknown>
          if (typeof current.label !== 'string' || !current.label.trim()) return false
          if (current.unitPriceHT !== undefined && current.unitPriceHT !== null && typeof current.unitPriceHT !== 'number') return false
          if (current.vatRate !== undefined && typeof current.vatRate !== 'number') return false
          return true
        }
        if (!bc.serviceCatalog.every(isValidItem)) {
          return NextResponse.json(
            { success: false, error: 'businessConfig invalide : chaque prestation du catalogue doit avoir un libelle, et un prix/TVA numeriques le cas echeant' },
            { status: 400 }
          )
        }
      }

      if (bc.quoteTemplates !== undefined) {
        if (!Array.isArray(bc.quoteTemplates) || bc.quoteTemplates.length > 50) {
          return NextResponse.json(
            { success: false, error: 'businessConfig invalide : quoteTemplates doit etre un tableau de 50 modeles maximum' },
            { status: 400 }
          )
        }
        const isValidLine = (line: unknown) => {
          if (typeof line !== 'object' || line === null) return false
          const current = line as Record<string, unknown>
          if (typeof current.label !== 'string' || !current.label.trim()) return false
          if (current.unitPriceHT !== undefined && current.unitPriceHT !== null && typeof current.unitPriceHT !== 'number') return false
          if (current.vatRate !== undefined && typeof current.vatRate !== 'number') return false
          return true
        }
        const isValidTemplate = (template: unknown) => {
          if (typeof template !== 'object' || template === null) return false
          const current = template as Record<string, unknown>
          if (typeof current.name !== 'string' || !current.name.trim()) return false
          if (!Array.isArray(current.lines) || current.lines.length > 20) return false
          return current.lines.every(isValidLine)
        }
        if (!bc.quoteTemplates.every(isValidTemplate)) {
          return NextResponse.json(
            { success: false, error: 'businessConfig invalide : chaque modele de devis doit avoir un nom et au plus 20 lignes valides (libelle requis, prix/TVA numeriques le cas echeant)' },
            { status: 400 }
          )
        }
      }

      if (bc.quoteSettings !== undefined) {
        const qs = bc.quoteSettings
        const isValidString = (value: unknown) => value === undefined || (typeof value === 'string' && value.length <= 1000)
        const isOneOf = (value: unknown, values: string[]) => value === undefined || (typeof value === 'string' && values.includes(value))
        if (
          typeof qs !== 'object' || qs === null ||
          (qs.defaultVatRate !== undefined && typeof qs.defaultVatRate !== 'number') ||
          (qs.defaultValidityDays !== undefined && typeof qs.defaultValidityDays !== 'number') ||
          (qs.defaultDepositPercent !== undefined && qs.defaultDepositPercent !== null &&
            (typeof qs.defaultDepositPercent !== 'number' || qs.defaultDepositPercent < 0 || qs.defaultDepositPercent > 100)) ||
          !isValidString(qs.defaultPaymentTerms) ||
          !isValidString(qs.defaultNotes) ||
          !isValidString(qs.defaultEstimatedDelay) ||
          !isOneOf(qs.quotePricingType, ['free', 'paid']) ||
          (qs.quoteFeeAmountTTC !== undefined && qs.quoteFeeAmountTTC !== null &&
            (typeof qs.quoteFeeAmountTTC !== 'number' || qs.quoteFeeAmountTTC < 0)) ||
          (qs.quoteFeeDeductible !== undefined && typeof qs.quoteFeeDeductible !== 'boolean') ||
          !isOneOf(qs.vatMode, ['vat_applicable', 'vat_exempt_293b']) ||
          (qs.insuranceEnabled !== undefined && typeof qs.insuranceEnabled !== 'boolean') ||
          !isOneOf(qs.insuranceType, ['rc_pro', 'decennale', 'rc_pro_decennale']) ||
          !isValidString(qs.insuranceCompany) ||
          !isValidString(qs.insurancePolicyNumber) ||
          !isValidString(qs.insuranceCoveredActivities) ||
          !isValidString(qs.insuranceGeographicCoverage) ||
          !isValidString(qs.insuranceProviderAddress) ||
          !isOneOf(qs.laborMentionMode, ['included', 'detailed', 'not_applicable']) ||
          !isOneOf(qs.travelFeeMentionMode, ['included', 'detailed', 'not_charged', 'not_applicable'])
        ) {
          return NextResponse.json(
            { success: false, error: 'businessConfig invalide : quoteSettings contient une valeur incorrecte (type, enumeration ou longueur de texte)' },
            { status: 400 }
          )
        }
      }
    }

    const fields: Record<string, unknown> = {}
    if (body.companyName !== undefined) fields['company_name'] = body.companyName
    if (body.primaryTrade !== undefined) fields['primary_trade'] = body.primaryTrade
    if (body.phone !== undefined) fields['phone'] = body.phone
    if (body.address !== undefined) fields['address'] = body.address
    if (body.hours !== undefined) fields['hours'] = body.hours
    if (body.logoUrl !== undefined) fields['logo_url'] = body.logoUrl
    if (body.welcomeName !== undefined) fields['welcome_name'] = body.welcomeName
    if (body.welcomeMessage !== undefined) fields['welcome_message'] = body.welcomeMessage
    if (body.primaryColor !== undefined) fields['primary_color'] = body.primaryColor
    if (body.secondaryColor !== undefined) fields['secondary_color'] = body.secondaryColor
    if (body.widgetColorMode !== undefined) fields['widget_color_mode'] = body.widgetColorMode || 'sobriety'
    if (body.websiteUrl !== undefined) fields['website_url'] = body.websiteUrl
    if (body.googleReviewUrl !== undefined) fields['google_review_url'] = body.googleReviewUrl
    if (body.depositEnabled !== undefined) fields['deposit_enabled'] = body.depositEnabled
    if (body.depositType !== undefined) fields['deposit_type'] = body.depositType || 'percentage'
    if (body.depositValue !== undefined) fields['deposit_value'] = body.depositValue === '' ? null : body.depositValue
    if (body.assistantAvatarType !== undefined) fields['assistant_avatar_type'] = body.assistantAvatarType
    if (body.assistantAvatarUrl !== undefined) fields['assistant_avatar_url'] = body.assistantAvatarUrl

    // Marque blanche du widget : reservee aux plans Performance/Agence.
    // session.plan provient de getSession(), qui revalide deja le plan reel
    // cote serveur (cf. src/lib/auth-utils.ts) — on ne fait jamais confiance
    // a une valeur envoyee par le front pour activer cette fonctionnalite.
    const planAllowsWhiteLabel = session.plan === 'performance' || session.plan === 'entreprise'
    if (body.whiteLabelEnabled !== undefined) {
      fields['white_label_enabled'] = planAllowsWhiteLabel ? Boolean(body.whiteLabelEnabled) : false
    }
    if (body.widgetBrandName !== undefined) fields['widget_brand_name'] = body.widgetBrandName
    if (body.widgetBrandLogoUrl !== undefined) fields['widget_brand_logo_url'] = body.widgetBrandLogoUrl

    if (body.trades !== undefined) {
      const cleanedTrades = (body.trades as unknown[])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
      fields['trades'] = cleanedTrades
      if (cleanedTrades.length > 0 && body.primaryTrade === undefined) {
        fields['primary_trade'] = cleanedTrades[0]
      }
    }

    if (body.raisonSociale !== undefined) fields['raison_sociale'] = body.raisonSociale
    if (body.formeJuridique !== undefined) fields['forme_juridique'] = body.formeJuridique
    if (body.siret !== undefined) fields['siret'] = body.siret
    if (body.adressePro !== undefined) fields['adresse_pro'] = body.adressePro
    if (body.cpPro !== undefined) fields['cp_pro'] = body.cpPro
    if (body.tvaNumber !== undefined) fields['tva_number'] = body.tvaNumber
    if (body.tvaAssujetti !== undefined) fields['tva_assujetti'] = body.tvaAssujetti
    if (body.villePro !== undefined) fields['ville_pro'] = body.villePro

    if (body.assureur !== undefined) fields['assureur'] = body.assureur
    if (body.numAssurance !== undefined) fields['num_assurance'] = body.numAssurance
    if (body.assuranceNonRequise !== undefined) fields['assurance_non_requise'] = body.assuranceNonRequise

    if (body.devisPrefixe !== undefined) fields['devis_prefixe'] = body.devisPrefixe
    if (body.devisValidite !== undefined) fields['devis_validite'] = body.devisValidite
    if (body.devisTvaDefaut !== undefined) fields['devis_tva_defaut'] = body.devisTvaDefaut
    if (body.devisConditionsPaiement !== undefined) fields['devis_conditions_paiement'] = body.devisConditionsPaiement
    if (body.devisMentionLegale !== undefined) fields['devis_mention_legale'] = body.devisMentionLegale
    if (body.devisCompteur !== undefined) fields['devis_compteur'] = body.devisCompteur
    if (body.prestationsJson !== undefined) fields['prestations_json'] = body.prestationsJson

    if (body.serviceArea !== undefined) fields['service_area'] = body.serviceArea
    if (body.interventionRadius !== undefined) fields['intervention_radius'] = body.interventionRadius
    if (body.notificationEmail !== undefined) fields['notification_email'] = body.notificationEmail
    if (body.vapiEnabled !== undefined) fields['vapi_enabled'] = body.vapiEnabled
    if (body.vapiGreeting !== undefined) fields['vapi_greeting'] = body.vapiGreeting

    if (body.travelConfig !== undefined) fields['travel_config'] = body.travelConfig

    if (body.businessConfig !== undefined) {
      const existingConfig = await getArtisanConfig(session.artisanId)
      const existingBusinessConfig =
        existingConfig?.businessConfig && typeof existingConfig.businessConfig === 'object'
          ? (existingConfig.businessConfig as Record<string, unknown>)
          : {}
      fields['business_config'] = { ...existingBusinessConfig, ...body.businessConfig }
    }

    console.log('[CONFIG PATCH] Champs recus:', Object.keys(body))
    console.log('[CONFIG PATCH] Champs ecrits Supabase:', Object.keys(fields))

    await updateArtisanConfig(session.artisanId, fields)

    const userFields: Record<string, unknown> = {}
    if (body.firstName !== undefined) userFields['first_name'] = body.firstName
    if (body.lastName !== undefined) userFields['last_name'] = body.lastName
    if (body.email !== undefined) userFields['email'] = body.email
    if (Object.keys(userFields).length > 0) {
      await updateUser(session.artisanId, userFields)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CONFIG PATCH]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
