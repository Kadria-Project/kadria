// Resolution centralisee du branding marque blanche applique aux pages devis
// (page detail artisan + page publique client). Cette logique NE concerne
// QUE le rendu visuel (logo / nom de marque / couleurs / mention footer) —
// elle ne doit jamais influencer le bloc legal de l'artisan (raison sociale,
// SIRET, TVA, adresse, assurance, mentions legales), qui reste toujours
// celui de l'artisan, intact, quel que soit le statut de la marque blanche.
//
// Regle canonique (identique a celle de src/components/chat/ChatWidgetInline.tsx) :
//   if (whiteLabelEnabled === true && plan in {performance, entreprise}):
//     show widgetBrandLogoUrl if present
//     else logoUrl if present
//     else widgetBrandName if present
//     else companyName if present
//     else "KADRIA"
//   else:
//     show "KADRIA"
//
// IMPORTANT : src/config/plans.ts a un FEATURE_DEFINITIONS.whiteLabel qui ne
// mentionne QUE 'entreprise' — c'est une definition DIVERGENTE/fausse par
// rapport au gating reel utilise partout ailleurs (ChatWidgetInline,
// app/api/artisan/public-config/route.ts, app/parametres/page.tsx). Ne PAS
// s'appuyer sur FEATURE_DEFINITIONS.whiteLabel pour decider qui a droit a la
// marque blanche : on recree ici la meme liste de plans que
// WHITE_LABEL_PLANS (ChatWidgetInline.tsx) sans importer depuis un composant
// React client.
const WHITE_LABEL_PLANS = new Set(['performance', 'entreprise']);

export function isWhiteLabelAllowed(plan: string | null | undefined): boolean {
  if (!plan) return false;
  return WHITE_LABEL_PLANS.has(plan);
}

export const DEFAULT_KADRIA_PRIMARY_COLOR = '#22c55e';
export const DEFAULT_KADRIA_SECONDARY_COLOR = '#18181b';

export const POWERED_BY_KADRIA_LABEL = 'Propulsé par Kadria';

export interface ResolveDevisBrandingInput {
  plan: string | null | undefined;
  whiteLabelEnabled: boolean | null | undefined;
  widgetBrandName?: string | null;
  widgetBrandLogoUrl?: string | null;
  logoUrl?: string | null;
  companyName?: string | null;
  raisonSociale?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface ResolvedDevisBranding {
  isWhiteLabelActive: boolean;
  brandName: string;
  brandLogoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  showKadriaBranding: boolean;
  poweredByLabel: string;
}

export function resolveDevisBranding(input: ResolveDevisBrandingInput): ResolvedDevisBranding {
  const {
    plan,
    whiteLabelEnabled,
    widgetBrandName,
    widgetBrandLogoUrl,
    logoUrl,
    companyName,
    raisonSociale,
    primaryColor,
    secondaryColor,
  } = input;

  const isWhiteLabelActive = whiteLabelEnabled === true && isWhiteLabelAllowed(plan);

  if (isWhiteLabelActive) {
    const brandName =
      widgetBrandName || companyName || raisonSociale || 'Votre entreprise';
    const brandLogoUrl = widgetBrandLogoUrl || logoUrl || null;

    return {
      isWhiteLabelActive: true,
      brandName,
      brandLogoUrl,
      primaryColor: primaryColor || DEFAULT_KADRIA_PRIMARY_COLOR,
      secondaryColor: secondaryColor || DEFAULT_KADRIA_SECONDARY_COLOR,
      showKadriaBranding: false,
      poweredByLabel: POWERED_BY_KADRIA_LABEL,
    };
  }

  return {
    isWhiteLabelActive: false,
    brandName: 'Kadria',
    brandLogoUrl: null,
    primaryColor: primaryColor || DEFAULT_KADRIA_PRIMARY_COLOR,
    secondaryColor: secondaryColor || DEFAULT_KADRIA_SECONDARY_COLOR,
    showKadriaBranding: true,
    poweredByLabel: POWERED_BY_KADRIA_LABEL,
  };
}
