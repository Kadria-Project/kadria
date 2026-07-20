# Contrat de donnees — workspace A faire

Le workspace A faire consomme exclusivement `GET /api/operations-center?scope=tasks`.
Le contrat renvoie :

| Champ | Utilisation |
| --- | --- |
| `generatedAt` | Fraicheur de l'observation. |
| `dataQuality` | Distingue une information insuffisante d'un etat calme. |
| `workbench.waitingForApproval` | Validations explicites a traiter. |
| `workbench.todayActions` | Actions recommandees maintenant. |
| `workbench.needsAttention` | Situations bloquantes ou en echec. |
| `workbench.summary` et `permissions` | Contexte de confiance produit par les regles Operations Center. |

Ne sont pas transmis au navigateur de A faire : recommandations completes,
opportunites, risques, actions groupees, sante operationnelle, charge
commerciale ou terrain. Ils restent calcules serveur afin de ne modifier ni
les regles Operations Center ni les garanties de permissions.

Le calcul serveur conserve les sources necessaires aux situations : dossiers,
rendez-vous, configuration, equipe et metadonnees d'automatisation. La page
ne charge plus les projets, evenements, usage, profil, catalogue ou
integrations du monolithe `ArtisanDashboard`.
