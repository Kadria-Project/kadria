import { NextRequest, NextResponse } from 'next/server'
import { getArtisanConfig, getUserByArtisanIdentifier } from '@/src/lib/airtable'
import { normalizePlan } from '@/src/lib/plans'

export async function GET(request: NextRequest) {
  const artisanId = request.nextUrl.searchParams.get('artisan_id')
  if (!artisanId) {
    return NextResponse.json({ success: false, error: 'artisan_id requis' }, { status: 400 })
  }

  try {
    const [config, user] = await Promise.all([
      getArtisanConfig(artisanId),
      getUserByArtisanIdentifier(artisanId),
    ])
    if (!config) {
      return NextResponse.json({ success: false, error: 'Artisan non trouvé' }, { status: 404 })
    }

    // Marque blanche : reservee aux plans Performance/Agence. Cette route
    // est publique (non authentifiee, utilisee par le widget embarque) —
    // on ne fait jamais confiance a la valeur stockee en base seule : le
    // plan reel de l'artisan est revalide ici (ex: si l'artisan a ete
    // redescendu en Essentiel apres un downgrade, white_label_enabled doit
    // rester force a false meme si la colonne vaut encore true en base).
    const plan = normalizePlan(user?.plan)
    const planAllowsWhiteLabel = plan === 'performance' || plan === 'entreprise'
    const whiteLabelEnabled = planAllowsWhiteLabel && config.whiteLabelEnabled

    // Retourne uniquement les champs publics nécessaires au widget
    return NextResponse.json({
      success: true,
      config: {
        companyName:    config.companyName,
        welcomeName:    config.welcomeName,
        welcomeMessage: config.welcomeMessage,
        primaryColor:   config.primaryColor,
        secondaryColor: config.secondaryColor,
        widgetColorMode: config.widgetColorMode || 'sobriety',
        logoUrl:        config.logoUrl,
        primaryTrade:   config.primaryTrade,
        active:         config.active,
        assistantAvatarType: config.assistantAvatarType,
        assistantAvatarUrl:  config.assistantAvatarUrl,
        plan,
        whiteLabelEnabled,
        widgetBrandName: whiteLabelEnabled ? config.widgetBrandName : '',
        widgetBrandLogoUrl: whiteLabelEnabled ? config.widgetBrandLogoUrl : '',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
