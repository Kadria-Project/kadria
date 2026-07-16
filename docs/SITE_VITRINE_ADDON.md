# Add-on « Site vitrine artisan » — V1 démonstrateur

Démonstrateur : **AD Électricité**, électricien fictif à Reims.
Route publique : **`/site-demo/electricien`** (hors matcher du middleware ⇒ aucune authentification requise).

## Fonctionnement

Le site est entièrement piloté par une **configuration fortement typée** :

- `src/lib/site-vitrine/types.ts` — le contrat `SiteVitrineConfig` (identité, thème, prestations, réalisations, étude de cas, méthode, zone, avis, FAQ, horaires, mentions, flags de sections).
- `src/lib/site-vitrine/configs/ad-electricite.ts` — 100 % du contenu AD Électricité (données fictives, explicitement signalées comme telles dans les textes).
- `src/lib/site-vitrine/theme.ts` — conversion du thème typé en variables CSS scopées `--sv-*` + construction de l'URL du parcours de demande avec tracking.

Les composants (`src/components/site-vitrine/`) ne consomment **que** la config et les variables `--sv-*` — jamais les variables du dashboard Kadria ni son identité visuelle. Décliner un plombier/paysagiste/menuisier = une nouvelle config + une route `app/site-demo/<metier>/`, zéro copie de composant.

## Composants

| Fichier | Rôle | Client ? |
|---|---|---|
| `VitrineSite.tsx` | Assemblage complet depuis la config, injection du thème, skip-link | non |
| `SiteHeader.tsx` | Header sticky, nav, téléphone neutralisé, menu mobile accessible | oui |
| `Hero.tsx` | Hero éditorial asymétrique (typo + colonne technique avec schéma) | non |
| `TrustBand.tsx` | Engagements honnêtes sur fond nuit (liste `dl`, pas de cartes) | non |
| `Prestations.tsx` | 4 prestations « lead » en entrées de sommaire + 3 complémentaires en liste compacte | non |
| `CaseStudy.tsx` | Étude de cas borne 7 kW : 5 étapes + cartouche délai/budget indicatif | non |
| `Gallery.tsx` | 6 réalisations, rythme irrégulier (1 fiche large + grille) | non |
| `Method.tsx` | Frise verticale 5 étapes → conduit au formulaire | non |
| `ProjectIntake.tsx` | Point d'entrée vers le parcours Kadria (chips de besoin → `/projet`) | oui |
| `Zone.tsx` | Carte stylisée SVG (cercles concentriques, aucune dépendance carto) + communes par couronne | non |
| `Reviews.tsx` | Avis explicitement fictifs, prêt pour de vrais retours via config | non |
| `Faq.tsx` | `<details>/<summary>` natifs, accessibles sans JS | non |
| `FinalCta.tsx` / `SiteFooter.tsx` | Conversion finale, footer complet + mention « conçu avec Kadria » | non |
| `SchematicVisual.tsx` | Placeholders éditoriaux façon plan électrique (SVG par catégorie) | non |
| `SectionShell.tsx` / `motion.tsx` | Cartouche de section numéroté ; `Reveal` + `useStableReducedMotion` (import `motion/react`) | motion oui |

## Direction artistique

Base papier clair (`#f6f5f1`), bleu nuit `#101d33` / bleu profond `#1d3a66`, accent chaud cuivré `#c2410c` utilisé avec parcimonie (CTA, index, nœuds de schémas). Typo display **Archivo** (chargée via `next/font/google` dans le layout de la route uniquement, exposée en `--font-sv-display`), corps en Inter (police déjà chargée par le projet). Motifs « plan électrique » : cartouches numérotés en mono, filets, schémas SVG traits fins. Aucune ressemblance avec la landing Kadria (verte/sombre).

## Formulaire de projet — approche retenue

Après audit, l'option la plus sûre : **redirection vers le parcours conversationnel existant `/projet` en mode démo**.

- URL générée : `/projet?demoMode=true&source=site_vitrine_demo&trade=electricien&site=ad_electricite&need=<choix>`.
- `demoMode=true` est géré nativement par `ChatWidgetInline` : photos gardées en local (`URL.createObjectURL`), envoi du dossier **simulé** côté client — aucun dossier réel n'est créé pour l'artisan fictif, aucun contournement d'auth/multi-tenant.
- Le widget affiche lui-même le déroulé complet de la collecte : type de besoin, description, questions techniques métier, photos, délais, commune, coordonnées.

### Raccordement production (futur)

1. Créer le compte Kadria de l'artisan réel ; le site pointe alors vers `/projet?artisan_id=<id>` (sans `demoMode`), ce qui crée de vrais dossiers via `POST /api/projects`.
2. Faire lire par le widget les paramètres `source`, `trade`, `site`, `need` et les propager dans le payload (`source: 'site_vitrine'` au lieu de `'chat-widget'`) — le contrat d'URL est déjà en place côté site.
3. Optionnel : pré-amorcer l'intent du chat depuis `need`.

## Données fictives

Entreprise, coordonnées (`03 XX XX XX XX`, adresse et e-mail `.exemple`), réalisations, localisation des chantiers, avis, délai « 3 semaines » et budget « 1 500–2 000 € » : tout est fictif et **signalé** (badge hero, intro galerie, disclaimer avis, cartouche budget « démonstration », footer). Aucune certification, aucun logo tiers, aucune note Google.

## SEO — stratégie retenue et documentée

- **Démo = `noindex, nofollow`** (layout de la route), canonical cohérent, Open Graph présent pour le partage, **pas d'entrée sitemap**, **aucune donnée structurée LocalBusiness** (entreprise fictive ⇒ tout balisage « établissement » serait trompeur).
- Pour un **vrai site client** (futur) : domaine/sous-domaine propre, `index,follow`, JSON-LD `Electrician` (LocalBusiness) + `Service` par prestation + `FAQPage`, pages prestation et pages communes dédiées pour le SEO local, sitemap dédié, canonical par domaine, avis réels balisés uniquement s'ils sont authentiques.

## Évolution vers l'industrialisation (documenté, non implémenté)

- **Multi-thèmes** : `SiteTheme` est déjà le seul point d'entrée couleur ; ajouter des presets par métier.
- **Sous-domaines** : résolution `SiteVitrineConfig` par host dans le middleware (proxy) + `generateMetadata` par site ; les configs passeraient de fichiers TS à des lignes Supabase (`sites_vitrine`) éditées depuis le dashboard Kadria (couleurs, sections on/off via `SectionFlags`, prestations/réalisations, coordonnées).
- **Connexion formulaire** : voir raccordement ci-dessus.
- Volontairement absent de la V1 : CMS, i18n, éditeur visuel, multi-pages — le démonstrateur reste une seule page très aboutie.

## Limites connues

- Une seule page, un seul métier ; pas d'édition sans redéploiement.
- Le parcours `/projet` garde son habillage sombre Kadria (pas encore thémé aux couleurs du site vitrine).
- Les paramètres de tracking sont posés dans l'URL mais pas encore consommés par le widget (contrat prêt, lecture à implémenter côté widget).
- Photos réelles absentes : placeholders schématiques élégants en attendant (voir ci-dessous).

## Médias à fournir pour transformer la démo en vrai site client

Voir **`docs/SITE_VITRINE_MEDIAS.md`** (liste détaillée : hero, portrait, véhicule, chantiers, avant/après, réalisations).

## Contenus à remplacer pour un vrai client

Identité complète (nom, téléphone réel, e-mail, adresse, SIRET/assurance/qualifications dans les mentions légales), prestations et exemples réels, étude de cas réelle avec vrais délais/budgets, communes réelles, avis clients authentiques, horaires, politique de confidentialité réelle, passage `robots` en `index,follow`, ajout des données structurées et du sitemap.
