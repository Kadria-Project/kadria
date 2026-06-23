import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, updateArtisanConfig, getUserByArtisanIdentifier, updateUser } from '@/src/lib/airtable'
import { getSession } from '@/src/lib/auth-utils'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
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
        { success: false, error: 'Non authentifié' },
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
        { success: false, error: 'Le préfixe de numérotation ne peut pas dépasser 6 caractères' },
        { status: 400 }
      )
    }

    if (body.trades !== undefined && !Array.isArray(body.trades)) {
      return NextResponse.json(
        { success: false, error: 'trades doit être un tableau de métiers' },
        { status: 400 }
      )
    }

    // Mapping vers les noms de colonnes EXACTS de la table Supabase Artisan_config
    const fields: Record<string, unknown> = {}
    if (body.companyName  !== undefined) fields['company_name']     = body.companyName
    if (body.primaryTrade !== undefined) fields['primary_trade']    = body.primaryTrade
    if (body.phone        !== undefined) fields['phone']            = body.phone
    if (body.address      !== undefined) fields['address']          = body.address
    if (body.hours        !== undefined) fields['hours']            = body.hours
    if (body.logoUrl      !== undefined) fields['logo_url']         = body.logoUrl
    if (body.welcomeName  !== undefined) fields['welcome_name']     = body.welcomeName
    if (body.welcomeMessage !== undefined) fields['welcome_message'] = body.welcomeMessage
    if (body.primaryColor !== undefined) fields['primary_color']    = body.primaryColor
    if (body.secondaryColor !== undefined) fields['secondary_color'] = body.secondaryColor
    if (body.websiteUrl   !== undefined) fields['website_url']      = body.websiteUrl

    // Métiers : liste multi-sélection, avec compatibilité de l'ancien champ primary_trade (mono-métier)
    if (body.trades !== undefined) {
      const cleanedTrades = (body.trades as unknown[])
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map(v => v.trim())
      fields['trades'] = cleanedTrades
      if (cleanedTrades.length > 0 && body.primaryTrade === undefined) {
        fields['primary_trade'] = cleanedTrades[0]
      }
    }

    // Informations légales
    if (body.raisonSociale !== undefined) fields['raison_sociale'] = body.raisonSociale
    if (body.formeJuridique !== undefined) fields['forme_juridique'] = body.formeJuridique
    if (body.siret !== undefined) fields['siret'] = body.siret
    if (body.adressePro !== undefined) fields['adresse_pro'] = body.adressePro
    if (body.cpPro !== undefined) fields['cp_pro'] = body.cpPro
    if (body.tvaNumber !== undefined) fields['tva_number'] = body.tvaNumber
    if (body.tvaAssujetti !== undefined) fields['tva_assujetti'] = body.tvaAssujetti
    if (body.villePro !== undefined) fields['ville_pro'] = body.villePro

    // Assurance
    if (body.assureur !== undefined) fields['assureur'] = body.assureur
    if (body.numAssurance !== undefined) fields['num_assurance'] = body.numAssurance
    if (body.assuranceNonRequise !== undefined) fields['assurance_non_requise'] = body.assuranceNonRequise

    // Préférences devis
    if (body.devisPrefixe !== undefined) fields['devis_prefixe'] = body.devisPrefixe
    if (body.devisValidite !== undefined) fields['devis_validite'] = body.devisValidite
    if (body.devisTvaDefaut !== undefined) fields['devis_tva_defaut'] = body.devisTvaDefaut
    if (body.devisConditionsPaiement !== undefined) fields['devis_conditions_paiement'] = body.devisConditionsPaiement
    if (body.devisMentionLegale !== undefined) fields['devis_mention_legale'] = body.devisMentionLegale
    if (body.devisCompteur !== undefined) fields['devis_compteur'] = body.devisCompteur
    if (body.prestationsJson !== undefined) fields['prestations_json'] = body.prestationsJson

    // Onboarding : zone d'intervention, notifications, assistant vocal
    if (body.serviceArea !== undefined) fields['service_area'] = body.serviceArea
    if (body.interventionRadius !== undefined) fields['intervention_radius'] = body.interventionRadius
    if (body.notificationEmail !== undefined) fields['notification_email'] = body.notificationEmail
    if (body.vapiEnabled !== undefined) fields['vapi_enabled'] = body.vapiEnabled
    if (body.vapiGreeting !== undefined) fields['vapi_greeting'] = body.vapiGreeting

    console.log('[CONFIG PATCH] Champs reçus:', Object.keys(body))
    console.log('[CONFIG PATCH] Champs écrits Supabase:', Object.keys(fields))

    await updateArtisanConfig(session.artisanId, fields)

    // Identité (table Users) — champs distincts de Artisan_config
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
