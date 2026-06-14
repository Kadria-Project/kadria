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
    if (body.raisonSociale !== undefined) fields['Raison Sociale']  = body.raisonSociale
    if (body.formeJuridique !== undefined) fields['Forme Juridique'] = body.formeJuridique
    if (body.siret         !== undefined) fields['SIRET']           = body.siret
    if (body.tvaNumber     !== undefined) fields['TVA Number']      = body.tvaNumber
    if (body.tvaAssujetti  !== undefined) fields['TVA Assujetti']   = body.tvaAssujetti
    if (body.adressePro    !== undefined) fields['Adresse Pro']      = body.adressePro
    if (body.cpPro         !== undefined) fields['CP Pro']           = body.cpPro
    if (body.villePro      !== undefined) fields['Ville Pro']        = body.villePro

    // Assurance
    if (body.assureur      !== undefined) fields['Assureur']         = body.assureur
    if (body.numAssurance  !== undefined) fields['Num Assurance']    = body.numAssurance
    if (body.assuranceNonRequise !== undefined) fields['Assurance Non Requise'] = body.assuranceNonRequise

    // Préférences devis
    if (body.devisPrefixe  !== undefined) fields['Devis Prefixe']    = body.devisPrefixe
    if (body.devisValidite !== undefined) fields['Devis Validite']   = body.devisValidite
    if (body.devisTvaDefaut !== undefined) fields['Devis TVA Defaut'] = body.devisTvaDefaut
    if (body.devisConditionsPaiement !== undefined) fields['Devis Conditions Paiement'] = body.devisConditionsPaiement
    if (body.devisMentionLegale !== undefined) fields['Devis Mention Legale'] = body.devisMentionLegale
    if (body.devisCompteur !== undefined) fields['Devis Compteur']   = body.devisCompteur
    if (body.prestationsJson !== undefined) fields['Prestations JSON'] = body.prestationsJson

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
