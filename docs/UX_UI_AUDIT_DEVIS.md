# Audit UX/UI local — Zone DEVIS (Playwright réel)

Mode : `KADRIA_LOCAL_UX_AUDIT=true`, `NODE_ENV !== 'production'`, socle d'audit local
existant (middleware + toolbar `UX AUDIT (local)` + scénarios `normal` / `dense` /
`empty` / `essential` / `performance`). Exécution synchrone avec Playwright/Chromium
headless (`/opt/pw-browsers/chromium-1194`), script `audit_devis_full.js` (racine du
repo, artefact temporaire — non committé volontairement, cf. section Nettoyage).

Aucun commit, aucun push. Résultats ci-dessous basés sur l'exécution réelle du
2026-07-12 (log complet : sortie de `node audit_devis_full.js`, captures dans
`docs/ux-audit-screenshots/devis-*.png`).

## Résumé exécutif

| Bloc | Statut |
|---|---|
| Liste des devis (normal/dense/empty) | **Partiel** — pas d'écran "Liste des devis" dédié trouvé ; capturé via l'onglet "Suivi commercial" (dashboard commercial global, pas une liste filtrée de devis) |
| Création | **Complet** |
| Édition | **Complet** (édition simulée par réouverture du builder — pas de bouton "Modifier" distinct trouvé sur un devis existant) |
| Aperçu / PDF | **Partiel** — page d'aperçu capturée, mais le clic "Télécharger PDF" n'a pas ouvert de popup dans ce run (timeout 30s), donc le rendu PDF simulé lui-même n'a pas pu être vérifié visuellement |
| Cycle de vie (brouillon/envoyé/accepté/refusé) | **Complet** — les 4 états ont été confirmés visuellement avec badges distincts |
| Essentiel / Performance | **Complet** — testé et **bug confirmé** (aucun verrouillage visuel en Essentiel, cf. P1 ci-dessous) |
| Mobile | **Partiel** — création et aperçu mobile confirmés ; la capture "liste mobile" a en réalité capturé le menu de navigation (sélecteur `Suivi commercial` obsolète sur mobile), pas la liste elle-même |

## Détail par bloc

### 1. Liste des devis

Il n'existe pas de route dédiée "liste des devis" indépendante détectée dans ce lot.
L'entrée la plus proche est l'onglet **Suivi commercial** du dashboard
(`/demo-dashboard`, clic sur l'item de nav), qui affiche un tableau de bord commercial
(CA potentiel, devis envoyés, taux de conversion, opportunités à sécuriser) — pas une
liste tabulaire de devis avec statut/montant par ligne.

- `devis-01-liste-normal-desktop.png` (scénario normal)
- `devis-02-liste-dense-desktop.png` (scénario dense)
- `devis-03-liste-empty-desktop.png` (scénario empty)

Les 3 captures desktop sont visuellement cohérentes avec leurs scénarios (chiffres
différents, section "Opportunités à sécuriser" vide en `empty`). Aucune anomalie
visuelle détectée sur ce sous-écran.

Statut : **Partiel** — le contenu existe et fonctionne, mais ce n'est pas la "liste des
devis" au sens strict demandée par la mission ; aucune vue tabulaire dédiée n'a été
localisée dans le temps imparti.

### 2. Création d'un devis

Flux réel exécuté sur le projet `demo_101` (Camille Durand, sans devis existant) :

1. Navigation fiche projet → clic **"Préparer un devis"** → redirection confirmée vers
   `/demo-dashboard/projet/demo_101/devis/new` (`devis-06-creation-initiale-desktop.png`)
2. Ajout d'une 2ème ligne via `[data-testid="devis-add-line"]`
   (`devis-07-ajout-ligne-desktop.png`)
3. Remplissage des 2 lignes (libellé, quantité, unité, prix, TVA) → calculs HT/TVA/TTC
   corrects et affichés en temps réel (`devis-09-calculs-desktop.png`, `devis-08-catalogue-desktop.png`)
4. Soumission (`[data-testid="devis-submit"]`) → redirection confirmée vers
   `/demo-dashboard/projet/demo_101/devis/demo-devis-demo_101`, devis créé avec le
   statut **Brouillon** (`devis-13-brouillon-desktop.png`)

Le bandeau vert "Mode démo — toutes les actions ci-dessous sont simulées localement.
Aucun devis réel, email ou PDF officiel n'est envoyé." est visible et cohérent sur
toutes les pages de détail devis.

Statut : **Complet**, aucune anomalie.

### 3. Édition d'un devis

Il n'y a pas de bouton "Modifier" séparé trouvé sur une fiche devis existante dans ce
lot — l'édition testée consiste à recréer/rouvrir le builder `/devis/new` sur le
projet `demo_102`, y remplir une ligne, soumettre, puis rouvrir `/devis/new` à nouveau
pour vérifier le comportement du formulaire (`devis-10-edition-desktop.png`) et tester
la suppression d'une ligne ajoutée (`devis-10b-edition-suppression-ligne-desktop.png`,
suppression confirmée visuellement — la ligne disparaît).

Limite honnête : ce test ne prouve pas qu'un devis "Brouillon" existant est
réellement éditable en place (formulaire pré-rempli avec les données sauvegardées) —
seul le comportement du formulaire vierge/ajout/suppression de lignes a été vérifié.
Aucune fiche devis existante avec un bouton "Modifier" explicite n'a été localisée.

Statut : **Complet** pour le formulaire (ajout/suppression de ligne, calculs), **non
vérifié** pour la réédition d'un devis brouillon déjà sauvegardé avec pré-remplissage.

### 4. Aperçu / PDF

- `devis-11-apercu-source-desktop.png` : page détail devis (source), OK.
- Clic sur **"Télécharger PDF"** : `page.waitForEvent('popup')` a expiré après
  30000ms — aucun onglet/popup ouvert dans ce run. Cause possible : le composant PDF
  simulé peut nécessiter un délai de génération supérieur, ou le déclenchement se fait
  différemment (téléchargement direct de fichier plutôt que popup HTML). Non
  reproduit avec succès dans ce lot → pas de capture du rendu PDF lui-même
  (`devis-11-apercu-desktop.png` n'a **pas** été produite).
- `devis-19-modal-confirmation-desktop.png` : capture de suivi après le clic
  (aucune modale de confirmation visible dans le screenshot — juste la page devis
  inchangée).
- Aperçu mobile : `devis-12-apercu-mobile.png` capturé avec succès (page détail devis
  responsive, lisible).

Statut : **Partiel** — la page source de l'aperçu est vérifiée, mais le rendu PDF
simulé n'a pas pu être confirmé visuellement dans ce run.

### 5. Cycle de vie (brouillon / envoyé / accepté / refusé)

4 états distincts confirmés sur des devis démo différents, badges et contenus
cohérents :

- **Brouillon** (`demo_101`, `devis-13-brouillon-desktop.png`) : badge orange
  "Brouillon", bouton "Envoyer maintenant" présent, "Ouvertures : 0", "Première
  ouverture : —", "Statut : Non ouvert".
- **Envoyé** (`demo_103`, `devis-14-envoye-desktop.png`) : badge vert "✓ Envoyé",
  boutons "Marquer comme accepté" / "Marquer comme refusé" présents, "Ouvertures : 2",
  "Statut : En attente".
- **Accepté** (`demo_104`, `devis-15-accepte-desktop.png`) : capturé.
- **Refusé** (`demo_109`, `devis-16-refuse-desktop.png`) : badge rouge "✗ Refusé",
  bloc "Devis refusé le 19 juin 2026" avec **motif du refus affiché en clair**
  ("Montant trop élevé par rapport au budget prévu, choix d'un autre prestataire") —
  bon niveau de détail visuel.

Statut : **Complet**, aucune anomalie fonctionnelle constatée. Les boutons d'action
("Marquer comme accepté/refusé", "Copier le lien client") sont cohérents avec l'état
du devis affiché.

### 6. Essentiel / Performance

Testé sur `demo_103` (devis "Envoyé") avec `?scenario=essential` et
`?scenario=performance`, plus le dashboard dans les deux scénarios.

**Bug confirmé, reproduit depuis la zone Dossiers/Kanban/Projet** : `devis-17-essential-locked.png`
et `devis-18-performance.png` sont **quasi identiques** — même détail des prestations,
mêmes boutons "Marquer comme accepté" / "Marquer comme refusé" pleinement actifs et
non grisés, aucun cadenas, badge "Essentiel" ou message d'upsell visible sur la page
devis en scénario `essential`. La seule différence visuelle entre les deux captures
est l'en-tête : "Kadria" (texte simple, gris) en `essential` vs **"Dupont Renovation"**
(marque personnalisée, verte) en `performance` — ce qui montre que le
personnalisation/branding (probablement une fonctionnalité Performance) fonctionne,
mais que **rien d'autre sur la page devis n'est verrouillé visuellement** pour le plan
Essentiel.

Confirmation sur le dashboard : `devis-17b-dashboard-essential.png` affiche toujours
le badge **"PRO"** à côté du logo Kadria (identique à `devis-17b-dashboard-performance.png`),
alors que le scénario demandé est `essential`. Ceci corrobore l'observation déjà faite
dans `docs/UX_UI_AUDIT_DOSSIERS_KANBAN_PROJET.md` (le plan reste figé en démo,
indépendamment du paramètre `scenario`).

Statut : **Complet** (testé avec succès) — verrouillage Essentiel **non confirmé
visuellement**, bug reproduit sur la zone Devis, cohérent avec le bug déjà documenté
sur Dossiers/Kanban.

### 7. Mobile

- **Création mobile** (`devis-20-mobile-creation.png`, projet `demo_102`,
  `/devis/new`) : formulaire mobile capturé avec succès, mise en page verticale
  cohérente.
- **Aperçu mobile** (`devis-12-apercu-mobile.png`, `demo_103`) : capturé avec succès.
- **Liste mobile** (`devis-04-liste-mobile.png`) : **capture incorrecte** — le script
  a ouvert le menu hamburger puis cherché un lien texte "Suivi commercial" qui
  n'existe plus sous ce libellé sur mobile (le menu affiche "Pipeline complet",
  "Valeur générée", "Agenda", "Mon abonnement", "Paramètres", "Support"). Résultat :
  la capture montre le bottom-sheet "Menu Kadria" ouvert, pas une liste de devis.
  Sélecteur obsolète, à corriger si ce script est réutilisé — non corrigé ici pour
  respecter la consigne de ne pas modifier le socle existant au-delà du strict
  nécessaire à l'exécution de l'audit.

Statut : **Partiel** — création et aperçu mobile confirmés, "liste mobile" non
confirmée (capture du mauvais écran).

## Interactions exécutées (résumé)

- Clic "Préparer un devis" (navigation projet → création)
- Ajout de ligne (`devis-add-line`)
- Remplissage de 2 lignes complètes (libellé, quantité, unité, prix, TVA) avec
  vérification des totaux calculés
- Soumission du formulaire (`devis-submit`) — 2 fois (projets `demo_101` et `demo_102`)
- Suppression d'une ligne ajoutée
- Clic "Télécharger PDF" (échec d'ouverture de popup, documenté ci-dessus)
- Navigation directe vers 3 devis à états différents (envoyé/accepté/refusé)
- Changement de `?scenario=` entre `essential` et `performance` sur la même page devis
  et sur le dashboard
- Ouverture menu mobile + tentative de clic sur item de navigation

Aucune modale de confirmation dédiée n'a été rencontrée pour les actions "Marquer
comme accepté/refusé" (non cliquées dans ce lot pour éviter toute mutation d'état
persistante non désirée sur les données démo partagées — seule la lecture visuelle a
été faite sur des devis déjà dans ces états).

## Appels réseau / surveillance métier

Surveillance active sur toutes les pages (filtre des appels `_next/`, favicon,
OpenStreetMap, Google Fonts, `/api/user/theme`) :

- **Aucun appel** vers Stripe, Resend, un service d'email/SMS, ou une écriture
  Supabase n'a été détecté sur l'ensemble du parcours (création, soumission, cycle de
  vie, essential/performance).
- Seuls appels réseau non-benign observés :
  - `GET https://images.unsplash.com/...` ×2 (avatars/illustrations décoratives,
    inoffensif)
  - `GET .../devis/new?_rsc=...` et `GET .../devis/demo-devis-...?_rsc=...` (appels
    RSC internes Next.js normaux, pas des appels métier externes)
- **Conclusion : aucun appel métier réel accidentel détecté.** Cohérent avec le
  bandeau "Mode démo" affiché sur chaque page devis.

## Erreurs console

Sur chaque page, des erreurs `net::ERR_CONNECTION_RESET` et
`net::ERR_TUNNEL_CONNECTION_FAILED` apparaissent de façon systématique et répétée
(jusqu'à 10 occurrences sur les pages "Suivi commercial"). Après analyse, ces erreurs
sont liées à l'environnement d'exécution sandboxé (proxy réseau de l'environnement
Claude Code, pas au code applicatif) — elles apparaissent aussi bien sur des pages
sans aucun appel réseau métier. **Non attribuables à un bug applicatif Kadria** ; à
confirmer si reproduit hors sandbox, mais aucune preuve qu'il s'agisse d'un bug du
produit dans ce contexte.

## Bugs / anomalies constatés

1. **[P1] Essentiel ne verrouille rien visuellement sur la page devis** — reproduit
   depuis la zone Dossiers/Kanban (voir `docs/UX_UI_AUDIT_DOSSIERS_KANBAN_PROJET.md`).
   Preuve : `devis-17-essential-locked.png` vs `devis-18-performance.png` quasi
   identiques (mêmes actions, mêmes données, aucun badge/cadenas), et badge plan
   "PRO" figé sur le dashboard indépendamment du `scenario` demandé
   (`devis-17b-dashboard-essential.png` / `devis-17b-dashboard-performance.png`).
2. **[P2] Pas de vue "liste des devis" dédiée identifiée** — seul un dashboard
   commercial agrégé a été trouvé sous "Suivi commercial" ; à vérifier si une vraie
   liste/tableau de devis existe ailleurs dans l'app (non trouvée dans ce lot).
3. **[P2] Clic "Télécharger PDF" n'ouvre pas de popup** dans l'environnement de test
   (timeout 30s) — à vérifier si c'est un problème d'environnement (popup bloqué en
   headless) ou un vrai défaut fonctionnel.
4. **[P3] Sélecteur de nav mobile obsolète dans le script d'audit** ("Suivi
   commercial" n'existe plus tel quel sur mobile) — impact sur la qualité de cet
   audit uniquement, pas un bug applicatif en soi, mais signale que le libellé de nav
   mobile a divergé du libellé desktop ("Pipeline complet" vs "Suivi commercial"),
   ce qui est en soi une petite incohérence de nommage entre desktop et mobile.

## Nettoyage

Les scripts `audit_devis3.js` et `audit_devis_full.js` restent à la racine du repo en
tant qu'artefacts de travail locaux (non committés, présents seulement dans l'arbre de
travail). Aucun commit ni push effectué, conformément à la consigne.

## Build

`npm run build` exécuté en fin de tâche → **succès**, génération statique complète,
aucune erreur de compilation.

## Conclusion

**ZONE DEVIS — AUDIT VISUEL INCOMPLET**

Complet : création, cycle de vie (4 états), test essentiel/performance (avec bug
confirmé), build.
Partiel : liste des devis (pas de vue dédiée trouvée), édition (formulaire testé mais
pas la réédition d'un brouillon existant pré-rempli), aperçu/PDF (page source vue,
rendu PDF simulé non confirmé), mobile (création et aperçu OK, liste mobile capturée
par erreur — mauvais écran).

Aucun appel métier réel détecté (Stripe/Resend/email/SMS/écriture Supabase) sur
l'ensemble du parcours testé. Aucun commit, aucun push.
