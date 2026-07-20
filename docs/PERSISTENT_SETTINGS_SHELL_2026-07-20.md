# Shell Parametres persistant

## Architecture

Avant : chaque sous-page montait `KadriaAppShell`, son provider de navigation,
sa topbar et sa cloche de notifications.

Apres :

```text
app/parametres/layout.tsx
└── KadriaAppShell
    └── SettingsWorkspaceLayout
        ├── navigation secondaire Parametres
        └── contenu de la sous-route
```

`KadriaPageContextProvider` et l'assistant restent dans le layout existant.
Les hooks de chaque section (entreprise, activite, assistants, automatisations,
facturation, equipe, acces et notifications) restent dans leurs pages : aucune
donnee specifique n'a ete deplacee vers un provider global.

## Wrappers retires

Les dix sous-pages ciblees, y compris l'historique des automatisations, ne
montent plus `KadriaAppShell`. `SettingsSection` factorise seulement le
conteneur, le fil d'Ariane, le titre et la description des pages standard.
L'historique conserve son en-tete metier propre.

La sous-navigation du sidebar est retiree pour eviter une double navigation
accessible : `SettingsWorkspaceLayout` est la navigation secondaire unique,
persistante et defilable sur mobile.

## Gardes et limites

Le test `persistent-settings-shell.test.ts` echoue si une page enfant reimporte
ou remonte `KadriaAppShell`; seul le layout parent est autorise a le faire.

Les redirections `/parametres` -> `/parametres/entreprise` et
`/parametres/profil-metier` -> `/parametres/activite` restent inchangees.
Les mesures authentifiees de persistance, reseau et focus restent a effectuer
sur une session de test ; elles ne sont pas deduites du build.
