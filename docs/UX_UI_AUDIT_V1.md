# Audit UX/UI visuel — Espace artisan Kadria (V1 réel, basé Playwright)

Ce rapport REMPLACE la version précédente, qui était principalement basée sur
de la lecture de code. Celui-ci est fondé sur une navigation Playwright
réelle (clics, ouverture de panneaux, changement d'onglets) contre une
instance locale de l'application, en mode d'audit sécurisé (voir le rapport
final livré en fin de mission pour l'architecture du mode audit).

## Méthodologie

- Application démarrée localement avec `next dev` (voir note technique
  ci-dessous : `next build && next start` produit un artefact où `NODE_ENV`
  est figé à `production` au moment du build par le bundler Next.js, ce qui
  désactive intentionnellement le mode audit ; `next dev` était donc
  nécessaire pour exercer réellement le mode audit avec un `NODE_ENV`
  non-production).
- `KADRIA_LOCAL_UX_AUDIT=true` positionné uniquement pour ce serveur local.
- Navigateur : Chromium préinstallé (`/opt/pw-browsers/chromium`), piloté via
  `playwright-core` installé dans un répertoire scratch **hors du repo**
  (`/tmp/.../scratchpad/pw-tool`) — aucune dépendance ajoutée au projet.
- Routes testées : `/demo-dashboard` et `/demo-parametres`, seules routes
  couvertes par le mode d'audit (Option B, voir justification dans le
  rapport final).
- Données : `src/lib/demo-data.ts` (fixtures statiques déjà existantes dans
  le repo, artisan fictif "AB Elec", 10 clients, RDV, notifications, devis).
  Aucune donnée Supabase réelle, aucun réseau externe sollicité pour ces
  écrans.
- Captures : `docs/ux-audit-screenshots/*.png` (dossier ajouté à
  `.gitignore`, jamais commité, 21 fichiers PNG produits).

## Écrans réellement observés et testés

### 1. Dashboard — `/demo-dashboard` (desktop 1440×1000)
**Captures**: `desktop-dashboard-normal.png`, `desktop-dashboard-dense-param.png`

**Première impression**: Dashboard en thème sombre par défaut, dense dès le
premier écran : bandeau "Coach Kadria" avec 3 actions recommandées, bloc
"Centre de progression" (barre 83%), bloc "Valeur générée par Kadria" avec
filtres de période/source, puis une grille de KPIs (CA potentiel, CA gagné,
dossiers captés, devis envoyés/acceptés, taux de conversion). La hiérarchie
est cohérente (les actions les plus urgentes — relances, RDV à programmer —
sont tout en haut) mais la première vue est chargée : 3 blocs empilés avant
d'arriver aux KPIs chiffrés, ce qui repousse l'information "dure" sous la
ligne de flottaison sur un écran 1000px de haut.

**Cohérence UI**: cartes à coins arrondis, bordures fines colorées par
catégorie (vert = positif/paiement, orange = alerte/relance, bleu = neutre),
bouton principal vert plein cohérent avec le reste de l'app. Le paramètre
`?scenario=dense` n'a produit aucune variation visible dans le rendu capturé
(voir P2).

**Ergonomie**: navigation latérale à 5 items (Valeur générée, Suivi
commercial, Calendrier, Mes clients, Mes taches a faire) + bloc secondaire en
bas (Changer d'offre, Thème clair/sombre, Mon profil, Déconnexion). Sur
mobile, ce menu latéral est remplacé par un panneau "Menu Kadria" en
bottom-sheet accessible via un bouton dédié (`mobile-nav-open.png`),
listant des espaces supplémentaires non présents dans la sidebar desktop :
"Pipeline complet", "Agenda", "Mon abonnement", "Support". Cette asymétrie
entre nav desktop (5 items) et nav mobile (6 items différents, dont
"Pipeline complet" absent du desktop) est notable — voir P1.

**Mobile** (`mobile-dashboard-normal.png`, 390×844): la carte "Coach Kadria"
et le bloc "Centre de progression" occupent à eux seuls la quasi-totalité du
premier écran ; il faut scroller avant d'atteindre le moindre KPI chiffré.

### 2. Suivi commercial — `desktop-suivi-commercial.png`
Onglet atteint par clic réel depuis la nav latérale. Contenu visuellement
différent du dashboard, confirmé.

### 3. Calendrier — `desktop-calendrier.png`
Vue mensuelle (Juillet 2026), légende couleur (RDV / Relance / Rappel /
Intervention), bascule Mois/Semaine, bouton "+ Événement". Plusieurs jours
affichent 2 événements empilés avec troncature du texte ("Relance devis -
Sophi...") — lisibilité réduite dès que 2 événements tombent le même jour.

### 4. Mes clients — `desktop-mes-clients.png`
Tableau clients avec recherche + 6 filtres en ligne (relation, métier,
budget, score, date, source) — proches du bord droit du conteneur à
1440px, peu de marge si un filtre supplémentaire est ajouté. Colonnes :
Client, Contact, Dernière demande, Historique, Valeur client, Prochaine
action. Badges de statut ("À relancer", "Qualifié") cohérents avec les
codes couleur du dashboard.

### 5. Mes taches a faire — `desktop-mes-taches.png`
Onglet atteint, contenu distinct confirmé.

### 6. Notifications (panneau) — `desktop-notifications-open.png`
**Interaction réelle**: clic sur la cloche de notification (badge "4").
Panneau latéral droit avec 4 notifications non lues, bouton "Tout marquer
comme lu". Aucun overlay/backdrop assombrissant le reste de l'écran — le
dashboard reste visible et cliquable derrière, ambiguïté sur le caractère
modal ou non du panneau.

### 7. Paramètres — `/demo-parametres` (desktop et mobile)
**Captures**: `desktop-parametres.png`, `desktop-parametres-profil-m-tier.png`,
`desktop-parametres-catalogue-devis.png`, `desktop-parametres-coordonn-es.png`,
`desktop-parametres-apparence.png`, `mobile-parametres.png`

9 onglets horizontaux (Mon entreprise, Profil métier, Coordonnées, Infos
légales, Déplacements, Catalogue & devis, Mon widget, Apparence, Offre &
quotas). Le dernier onglet est tronqué par le bord du viewport à 1440px —
seule une lettre est visible, aucun indice de scroll. Bandeau vert "Mode
demo - ces informations sont fictives et ne sont pas enregistrees" —
présent uniquement en mode démo, bon signal de confiance. Formulaires
classiques (labels au-dessus des champs). Onglets cliqués et vérifiés
visuellement différents (Profil métier / Catalogue & devis / Coordonnées /
Apparence).

**Mobile** (`mobile-parametres.png`): la barre d'onglets horizontale n'est
pas adaptée à 390px — nécessite un scroll horizontal, sans indice visuel
(flèche ou fondu) signalant qu'il y a plus de contenu à droite.

### 8. Onboarding — `/demo-dashboard/onboarding`
**Captures**: `desktop-onboarding.png`, `desktop-onboarding-toolbaroff.png`
Page atteinte et capturée. Non explorée en profondeur (pas de clic sur les
étapes) faute de temps disponible dans ce lot.

## Écrans NON confirmés visuellement (limitation assumée)

Plusieurs clics ciblant des libellés génériques ("dossiers", "pipeline",
"devis", "planning") via des sélecteurs texte heuristiques ont **échoué
silencieusement** : Playwright a bien cliqué sur un élément correspondant au
texte, mais la capture obtenue après clic (`desktop-devis-list.png`,
`desktop-dossiers-pipeline.png`) est **strictement identique en octets** à
`desktop-dashboard-normal.png` — preuve qu'aucune navigation réelle vers un
écran "Devis" ou "Pipeline/Kanban" dédié n'a eu lieu. La nav desktop réelle
n'a pas d'item littéralement libellé "Dossiers" ou "Devis" ("Pipeline
complet" existe mais uniquement dans le menu mobile).

**Je ne certifie donc PAS avoir vu visuellement** : le Kanban/pipeline
complet, une liste de devis en écran dédié, la création de devis, l'aperçu
PDF d'un devis, la fiche projet (complète ou incomplète), le planning
d'équipe, le catalogue de prestations en écran dédié (distinct de l'onglet
"Catalogue & devis" des paramètres, celui-là bien vérifié), l'équipe et les
collaborateurs, le détail du centre de progression (bouton "Voir le détail"
jamais cliqué), l'assistant interne Kadria (le sélecteur prévu pour l'ouvrir
a en réalité activé le filtre de source "Assistant vocal" sur le dashboard —
capture `desktop-assistant-open.png` mal nommée, l'assistant n'a pas été
ouvert), les modales de confirmation d'action dangereuse, l'état verrouillé
Essentiel avec CTA d'upgrade, le scénario `empty`.

Ces écrans existent très probablement dans le code
(`DemoArtisanDashboard.tsx` fait plus de 6000 lignes et couvre manifestement
plus que ce qui a été cliqué dans ce lot), mais je n'ai pas la preuve
visuelle Playwright nécessaire pour les documenter avec le niveau de rigueur
demandé. Les documenter à partir de la seule lecture de code aurait
reproduit exactement le défaut de la version précédente que ce lot devait
corriger — je préfère les lister honnêtement comme non couverts plutôt que
de fabriquer une couverture qui n'a pas été vérifiée.

## Recommandations

### P1 — Impact élevé
- **Nav mobile ≠ nav desktop** : "Pipeline complet", "Mon abonnement",
  "Support" visibles seulement dans le menu mobile bottom-sheet.
  Preuve : `desktop-dashboard-normal.png` vs `mobile-nav-open.png`.
  Composants probables : sidebar desktop du dashboard vs menu mobile
  (`MobileDashboardView` ou équivalent). Effort : M.
- **Dernier onglet Paramètres tronqué sur desktop 1440px** ("Offre &
  quo..."), aucun indice de scroll horizontal. Preuve :
  `desktop-parametres.png`. Effort : S.

### P2 — Amélioration importante
- **`?scenario=dense` sans effet visible** sur les données affichées.
  Preuve : `desktop-dashboard-normal.png` vs
  `desktop-dashboard-dense-param.png` (quasi identiques). À investiguer côté
  `DemoModeContext.tsx` / paramètres non branchés au provider. Effort : M.
- **Panneau de notifications sans backdrop**, contenu du dashboard restant
  actionnable derrière. Preuve : `desktop-notifications-open.png`. Effort : S.
- **Filtres "Mes clients" proches de la limite du viewport** (6 dropdowns
  sur une ligne à 1440px). Preuve : `desktop-mes-clients.png`. Effort : S.

### P3 — Finition
- **Troncature de texte dans le calendrier** dès que 2 événements tombent
  le même jour ("Relance devis - Sophi..."). Preuve :
  `desktop-calendrier.png`. Effort : S.
- **Onglets Paramètres mobile sans indice de scroll horizontal**. Preuve :
  `mobile-parametres.png`. Effort : S.

### P0
Aucun bloquant fonctionnel identifié sur les écrans effectivement testés
dans ce lot.

## Performance perçue
Aucune mesure de timing rigoureuse effectuée (pas de trace de performance
Playwright). Observation qualitative : les transitions d'onglet dans le
dashboard (Suivi commercial, Calendrier, Mes clients, Mes taches a faire)
sont quasi instantanées (rendu client, pas de rechargement de page complet).
Aucun skeleton ni loader observé pendant ces transitions.
