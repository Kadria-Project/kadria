import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, updateArtisanConfig } from '@/src/lib/airtable'
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
    const config = await getArtisanConfig(session.artisanId)
    return NextResponse.json({ success: true, config })
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

    const config = await getArtisanConfig(session.artisanId)

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuration non trouvée pour cet Artisan ID' },
        { status: 404 }
      )
    }

    // Mapping vers les noms de champs EXACTS d'Airtable Artisan_config
    const fields: Record<string, unknown> = {}
    if (body.companyName  !== undefined) fields['Company Name']     = body.companyName
    if (body.primaryTrade !== undefined) fields['Primary Trade']    = body.primaryTrade
    if (body.phone        !== undefined) fields['Phone']            = body.phone
    if (body.address      !== undefined) fields['Address']          = body.address
    if (body.hours        !== undefined) fields['Hours']            = body.hours
    if (body.logoUrl      !== undefined) fields['Logo URL']         = body.logoUrl
    if (body.welcomeName  !== undefined) fields['Welcome Name']     = body.welcomeName
    if (body.welcomeMessage !== undefined) fields['Welcome Message'] = body.welcomeMessage
    if (body.primaryColor !== undefined) fields['Primary Color']    = body.primaryColor
    if (body.secondaryColor !== undefined) fields['Secondary Color'] = body.secondaryColor
    if (body.websiteUrl   !== undefined) fields['Website URL']      = body.websiteUrl
    if (body.trades       !== undefined) fields['Trades']           = body.trades

    // Informations légales
if (body.raisonSociale !== undefined) fields['raison_sociale'] = body.raisonSociale
if (body.formeJuridique !== undefined) fields['forme_juridique'] = body.formeJuridique
if (body.siret !== undefined) fields['siret'] = body.siret
if (body.adressePro !== undefined) fields['adresse_pro'] = body.adressePro
if (body.cpPro !== undefined) fields['cp_pro'] = body.cpPro

// À activer seulement si ces champs existent dans Airtable
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

    await updateArtisanConfig(config.id, fields)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CONFIG PATCH]', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
