# Audit UX/UI — Planning & Équipe (Calendrier, Rendez-vous, Créneaux, Conflits, Affectation)

Périmètre : Planning, Agenda, Planning d'équipe, Rendez-vous, Gestion des
créneaux, Gestion des conflits, Affectation utilisateur, Vue mobile.
Méthode : lecture du code réel (`src/components/dashboard/DesktopAgendaView.tsx`,
`src/components/dashboard/MobileAgendaView.tsx`, `src/components/DemoCalendar.tsx`,
`src/components/DemoArtisanDashboard.tsx`, `src/contexts/DemoModeContext.tsx`,
`src/lib/demo-data.ts`) puis captures Playwright réelles (Chromium local) sur
`http://localhost:3000/demo-dashboard`, chaque PNG ouvert et vérifié
visuellement (outil Read, pas de confiance aveugle dans le fait qu'un fichier
existe). Aucune donnée réelle utilisée — uniquement les fixtures démo
fictives (`DEMO_ARTISAN`, `DEMO_EVENTS`, `DEMO_PROJECTS`).

## Constat structurel n°1 — Le calendrier démo n'est PAS le calendrier de production

C'est le résultat le plus important de ce lot, à lire avant tout le reste.

`DemoArtisanDashboard.tsx` (L3978-3987 et L4001-4005) ne monte jamais
`DesktopAgendaView.tsx` / `MobileAgendaView.tsx` — les deux composants réels,
riches en fonctionnalités "team scheduling" (filtre collaborateur Tous / Moi
/ `<collaborateur>` / Non affectés, réaffectation d'un rendez-vous via
`/api/appointments/:id/assign`, vue de charge par collaborateur
`insights.teamLoad`, connexion Google Calendar). À la place, un composant
séparé et plus simple, `DemoCalendar.tsx` (832 lignes, monté via
`DemoCalendarAdapter`), est utilisé — avec un commentaire explicite dans le
code :

> "Mode demo : DesktopAgendaView appelle reellement /api/projects et l'OAuth
> Google Calendar. On utilise DemoCalendarAdapter (etat local
> DemoModeContext) a la place."

Cette substitution est une décision technique défendable (éviter des appels
réseau réels non authentifiés en mode démo), mais elle a une conséquence
directe pour ce mandat d'audit : **les fonctionnalités "Gestion des
conflits", "Affectation utilisateur" et "Vue équipe" listées dans la mission
n'existent tout simplement pas dans l'écran réellement testable en mode
démo local.** Elles existent bien dans le code de production
(`DesktopAgendaView.tsx`), mais ne sont jamais rendues à l'écran depuis
`/demo-dashboard`. Il n'a donc pas été possible de les auditer visuellement
— ce n'est pas un manque d'effort de test, c'est une limite structurelle du
dispositif de démo actuel, documentée honnêtement plutôt que contournée.

`DemoCalendar.tsx` n'expose que : vue Mois, vue Semaine (grille horaire),
création d'événement (modale), édition d'événement (modale), suppression,
marquage "fait". Pas de vue Jour, pas de filtre collaborateur, pas
d'indicateur de conflit, pas de drag & drop.

## Constat structurel n°2 — Bug transversal Essentiel/Performance CONFIRMÉ sur cette zone

Le bug déjà documenté sur Dossiers, Kanban et Devis se reproduit à
l'identique sur le calendrier. `DesktopAgendaView`/le calendrier sont
protégés par `<FeatureGate feature="calendar" requiredPlan="performance">`
(`DemoArtisanDashboard.tsx` L3979) — en plan Essentiel réel, cet écran
devrait afficher un overlay de verrouillage "Disponible avec Performance".
Capturé : `planning-12-essential-desktop.png` (`?scenario=essential`) et
`planning-13-performance-desktop.png` (`?scenario=performance`) sont
**pixel-identiques**. Cause racine : `DEMO_PLAN` est une constante hardcodée
à `'performance'` (`DemoArtisanDashboard.tsx` L152), injectée telle quelle
dans `<PlanProvider plan={DEMO_PLAN}>` (L596) — jamais dérivée du
`scenario` choisi dans la toolbar d'audit. Le scénario `essential` modifie
correctement `artisan.plan` côté `DemoModeContext` (`getScenarioArtisan`,
`demo-data.ts` L1700-1706), mais `FeatureGate` lit un contexte totalement
différent (`PlanProvider` / `useCurrentPlan()`) qui n'a jamais connaissance
du scénario actif. Confirmé pour la 4e zone consécutive (Dossiers, Kanban,
Devis, Planning) — c'est un point unique dans le code (deux contextes de
plan déconnectés), pas quatre bugs indépendants.

## Constat structurel n°3 — Impasse de navigation vers le calendrier sur mobile

Sur mobile, le bottom nav (`MobileBottomNav`) a 5 boutons : Accueil,
Dossiers, [+ Créer], Devis, Menu. Le bouton "Menu" appelle
`onMenuClick={() => setDashboardMode('value')}` (`DemoArtisanDashboard.tsx`
L4916) — c'est-à-dire qu'il **ramène à l'accueil au lieu d'ouvrir un menu ou
le calendrier**. Le seul élément qui référence `dashboardMode === 'calendar'`
sur desktop est la sidebar (`NAV_ITEMS`), absente du DOM sur mobile (nav
séparée). Résultat vérifié par test automatisé (clic sur "Menu", puis
recherche du libellé "Calendrier" — jamais trouvé ; clic sur l'action
contextuelle "Programmer l'intervention" de la carte Coach — mène à la fiche
projet, pas au calendrier) : **il n'existe aucun chemin de navigation
standard vers le calendrier sur mobile en mode démo.** Capturé dans
`planning-04-mobile-navigation-deadend.png` (montre la fiche projet atteinte
par la seule action cliquable en lien avec un rendez-vous, pas le
calendrier lui-même — capture conservée comme preuve du problème, pas comme
preuve d'un calendrier mobile qui fonctionne).

Sévérité : élevée si ce comportement existe aussi en production (à vérifier
par l'équipe produit — ce lot ne teste que le mode démo local ; si
`MobileAgendaView.tsx` réel est bien accessible en production via une autre
route/nav que celle observée ici, alors ce bug est spécifique au mode démo).

## Bug annexe — encodage corrompu "Non affectés" (code de production)

Repéré par lecture de code (pas capturable en démo, cf. constat n°1) :
`DesktopAgendaView.tsx` L1087, le libellé du bucket "non affectés" dans la
vue de charge par collaborateur est écrit en dur `'Non affectÃ©s'` — un
double encodage UTF-8 qui afficherait un texte corrompu à l'écran en
production réelle (hors démo).

## Captures produites et vérifiées visuellement

Toutes ouvertes avec l'outil Read (image) avant validation.

| Fichier | Écran | Scénario | Viewport | Résultat |
|---|---|---|---|---|
| `planning-01-normal-desktop.png` | Calendrier, vue Mois | normal | 1440×1000 | Validé — RDV/Relance/Rappel/Intervention colorés, légende claire |
| `planning-02-dense-desktop.png` | Calendrier, vue Mois | dense | 1280×800 | Validé — jusqu'à 3 événements/jour visibles, 4e+ nécessiterait scroll interne à la cellule (non testé au-delà) |
| `planning-03-empty-desktop.png` | Calendrier, vue Mois | empty | 1440×1000 | Validé — 1 seul événement résiduel, pas un vrai 0 (cohérent avec le constat déjà fait sur Dossiers/Kanban : `scenario=empty` ne vide jamais totalement) |
| `planning-04-mobile-navigation-deadend.png` | Fiche projet (atteinte en cherchant le calendrier) | normal | 390×844 | Validé comme preuve de l'impasse de navigation — PAS un calendrier mobile fonctionnel |
| `planning-05-semaine.png` | Calendrier, vue Semaine | normal | 1440×1000 | Validé — grille horaire propre, mais vide (aucun événement démo dans la semaine du 13 juillet 2026, qui est "aujourd'hui" dans les fixtures) |
| `planning-08-rendezvous.png` | Modale "Modifier l'événement" | normal | 1440×1000 | Validé — type/titre/date/heure/durée/notes pré-remplis, bouton "Marquer comme fait" et "Supprimer" présents |
| `planning-12-essential-desktop.png` | Calendrier, vue Mois | essential | 1440×1000 | Validé — pixel-identique à `planning-13`, preuve du bug de plan figé |
| `planning-13-performance-desktop.png` | Calendrier, vue Mois | performance | 1440×1000 | Validé — pixel-identique à `planning-12` |
| `planning-14-modal.png` | Modale "Nouvel événement" | normal | 1440×1000 | Validé — formulaire de création complet et cohérent avec la modale d'édition |

**9 captures produites, 9 ouvertes, 9 validées, 0 rejetée.** Aucune capture
supplémentaire n'a été produite pour "Jour", "Conflit", "Équipe",
"Affectation" ou "Drawer" car ces écrans/contrôles n'existent pas dans le
composant réellement rendu en mode démo (constat n°1) — les produire
aurait signifié capturer un écran qui ne représente pas la fonctionnalité
demandée, ce qui aurait été trompeur.

## Tests UX — par écran

### Calendrier, vue Mois (normal)
- Action principale : créer un événement (bouton vert "+ Événement", en
  haut à droite, bien contrasté) — visible immédiatement, compréhension en
  moins de 2 secondes.
- Regard guidé naturellement : en-tête Coach Kadria → Centre de progression
  → calendrier ; le calendrier arrive après deux blocs non liés au planning
  lui-même, ce qui rallonge le trajet du regard pour un artisan qui ouvrirait
  cet onglet 20×/jour spécifiquement pour voir son planning.
- Lisibilité des rendez-vous : bonne — 4 couleurs bien distinctes (RDV vert,
  Relance orange, Rappel bleu, Intervention violet), légende toujours
  visible au-dessus de la grille.
- Surcharge visuelle : non en scénario normal ; à la limite en dense (voir
  ci-dessous).
- Troncature : les libellés d'événements sont tronqués sans tooltip
  ("Relance devis - Sophi...") — déjà noté comme incohérence transversale.

### Calendrier, vue Mois (dense)
- Jusqu'à 4 événements visibles par cellule ; au-delà, pas de bouton "+N
  autres" observé sur les 2 premières semaines capturées — à vérifier sur un
  jour avec 5+ événements, non testé ici par manque de temps.
- Impression : la vue reste lisible mais commence à se sentir chargée ; pour
  un artisan avec une équipe active tous les jours, ce point mériterait un
  test avec un vrai volume de production.

### Calendrier, vue Semaine
- Grille horaire correcte et familière (8h-...), mais capturée vide car les
  événements démo (1er-8 juillet) ne couvrent pas la semaine "actuelle"
  (13-19 juillet) — un artisan testant cette vue le jour J verrait un
  planning vide, mauvaise première impression même si ce n'est qu'un artefact
  de fixtures et non un bug de code.

### Modale "Nouvel événement" / "Modifier l'événement"
- Cohérente entre création et édition (mêmes champs, même style).
- CTA clairs ("Créer l'événement" / "Mettre à jour"), bouton destructif
  ("Supprimer") bien différencié en rouge.
- Compréhension immédiate, aucun champ ambigu.

### Vue mobile
- Voir constat structurel n°3 — l'action principale attendue (consulter le
  planning) n'est atteignable par aucun chemin standard découvert dans ce
  lot. Score "Découvrabilité" au plancher pour cette raison précise.

## Audit premium — notes sur 10

| Écran | Lisibilité | Hiérarchie | Cohérence | Densité | Rapidité | Impression premium | Compréhension immédiate | Découvrabilité |
|---|---|---|---|---|---|---|---|---|
| Calendrier Mois (normal) | 8 | 6 | 8 | 8 | 7 | 7 | 8 | 7 |
| Calendrier Mois (dense) | 6 | 6 | 8 | 5 | 6 | 6 | 7 | 7 |
| Calendrier Semaine | 7 | 6 | 8 | 8 | 6 | 6 | 6 | 6 |
| Modale création/édition | 9 | 8 | 9 | 8 | 8 | 8 | 9 | 8 |
| Vue mobile (calendrier) | — | — | — | — | — | — | — | 1 (inatteignable) |

Hiérarchie notée 6 sur le calendrier car le bloc Coach Kadria + Centre de
progression (non liés au planning) précèdent systématiquement la grille, ce
qui retarde l'accès à l'information recherchée par un utilisateur ouvrant
spécifiquement l'onglet Calendrier.

## Bugs

**P0** — aucun trouvé dans ce lot (aucun crash, aucune page blanche, aucune
fuite de donnée sensible).

**P1-PE-01 — Le calendrier démo ne reflète pas les fonctionnalités
"team scheduling" de production (conflits, affectation, vue équipe)**
- Capture : constat de code, non capturable (voir constat structurel n°1).
- Explication : `DemoArtisanDashboard.tsx` monte `DemoCalendar.tsx` au lieu
  de `DesktopAgendaView.tsx`/`MobileAgendaView.tsx`.
- Impact utilisateur : aucun impact direct sur la production réelle (c'est
  un problème de fidélité du dispositif de démo/audit, pas du produit livré
  aux artisans) — mais bloque toute validation UX future des fonctionnalités
  d'équipe sans passer par un compte réel authentifié.
- Effort estimé : M (brancher un adaptateur démo pour `DesktopAgendaView`
  qui mocke `/api/appointments/list`, `/api/team/members-lite`,
  `/api/projects` avec les fixtures `DemoModeContext`, à l'image de ce qui
  existe déjà pour d'autres écrans).

**P1-PE-02 — Plan Essentiel ne verrouille jamais le calendrier en démo
(bug transversal confirmé sur une 4e zone)**
- Capture : `planning-12-essential-desktop.png` vs
  `planning-13-performance-desktop.png` (identiques).
- Explication : `DEMO_PLAN` hardcodé à `'performance'`, déconnecté du
  `scenario` (voir constat structurel n°2).
- Impact utilisateur : en démo uniquement — empêche de valider visuellement
  le comportement de gating pour les prospects en plan Essentiel.
- Effort estimé : S (dériver `DEMO_PLAN` de `getScenarioArtisan(scenario).plan`
  au lieu d'une constante — correction ponctuelle et commune aux 4 zones
  déjà touchées par ce même bug).

**P1-PE-03 — Impasse de navigation vers le calendrier sur mobile**
- Capture : `planning-04-mobile-navigation-deadend.png`.
- Explication : bouton "Menu" du bottom nav mobile renvoie à l'accueil au
  lieu d'ouvrir un menu/le calendrier (voir constat structurel n°3).
- Impact utilisateur : si ce comportement existe en production (non vérifié
  par ce lot, qui teste uniquement `/demo-dashboard`), un artisan sur mobile
  ne pourrait pas consulter son planning depuis la navigation principale —
  impact élevé vu la fréquence d'usage attendue (20×/jour) et le fait que le
  mobile est probablement le device principal sur chantier.
- Effort estimé : S s'il s'agit d'un simple mauvais handler (`onMenuClick`)
  à corriger côté démo ; à requalifier après vérification en production.

**P2-PE-04 — Libellé "Non affectés" corrompu en encodage (code réel, hors
démo)**
- Capture : aucune (repéré par lecture de code, non affichable en démo).
- Explication : `'Non affectÃ©s'` en dur dans `DesktopAgendaView.tsx` L1087.
- Impact utilisateur : texte visiblement cassé pour tout artisan utilisant
  la vue de charge par collaborateur en production réelle.
- Effort estimé : S (remplacer par `'Non affectés'` avec le bon encodage
  source, vérifier l'encodage du fichier).

**P2-PE-05 — Vue Semaine vide par défaut sur les fixtures démo**
- Capture : `planning-05-semaine.png`.
- Explication : les événements démo sont concentrés début juillet, la
  semaine "actuelle" (13-19 juillet 2026 dans les fixtures) est vide.
- Impact utilisateur : aucun en production réelle (artefact de fixtures) ;
  en démo, donne une première impression de vide/panne pour quiconque teste
  la vue Semaine sans changer de semaine.
- Effort estimé : S (ajouter 1-2 événements démo dans la semaine courante).

**P3-PE-06 — Troncature des libellés d'événements sans tooltip**
- Capture : `planning-02-dense-desktop.png` ("Relance devis - Sophi...").
- Explication : déjà noté comme incohérence transversale (voir
  `UX_UI_DESIGN_INCONSISTENCIES.md`).
- Impact utilisateur : mineur, l'artisan doit ouvrir l'événement pour voir
  le nom complet.
- Effort estimé : S (tooltip natif `title=` au minimum).

**P3-PE-07 — Absence de vue "Jour"**
- Capture : aucune (fonctionnalité absente, pas un écran mal rendu).
- Explication : seuls "Mois" et "Semaine" existent dans `DemoCalendar.tsx`
  (la mission demandait de vérifier une vue Jour ; elle n'existe pas dans le
  composant testable).
- Impact utilisateur : à évaluer avec l'équipe produit — un artisan avec une
  grosse journée peut préférer une vue Jour dense en RDV ; non bloquant si
  la vue Semaine suffit en usage réel.
- Effort estimé : M si demandée (nouvelle vue à développer).

## Confirmation du bug transversal Essentiel/Performance

**Confirmé dans cette zone**, pour la 4e fois consécutive (après Dossiers,
Kanban, Devis). Le plan reste figé sur "performance" indépendamment du
scénario sélectionné, avec la même cause racine documentée à chaque fois
(`DEMO_PLAN` hardcodé dans `DemoArtisanDashboard.tsx`). Voir P1-PE-02
ci-dessus et la section dédiée dans `UX_UI_DESIGN_INCONSISTENCIES.md`.

## Limites de ce lot (honnêteté méthodologique)

- Les fonctionnalités "Gestion des conflits", "Affectation utilisateur" et
  "Vue équipe" demandées dans la mission n'ont pas pu être testées
  visuellement : elles ne sont pas rendues par le composant utilisé en mode
  démo local (`DemoCalendar.tsx`), seulement par le composant de production
  réel (`DesktopAgendaView.tsx`) qui nécessite une authentification et un
  backend réels non disponibles dans ce mode d'audit. Analysé par lecture de
  code à la place, avec citations précises des lignes concernées.
- La vue mobile du calendrier n'a pas pu être capturée dans son état
  "peuplé" car elle n'est pas atteignable par la navigation standard — seule
  l'impasse elle-même a été capturée comme preuve.
- Ce lot n'a pas testé le comportement en production réelle (compte
  authentifié réel) — seulement `/demo-dashboard` avec
  `KADRIA_LOCAL_UX_AUDIT=true`. Les constats sur le calendrier de production
  (`DesktopAgendaView.tsx`) viennent de la lecture de code, pas de captures.
