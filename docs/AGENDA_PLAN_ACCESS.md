# Acces Agenda

L'Agenda Kadria est inclus pour tous les plans actifs : Essentiel, Performance et Agence.

Cette regle couvre le planning, les vues Jour/Semaine/Equipe, la creation et la modification de rendez-vous, l'affectation, les confirmations, les filtres, les notifications et la synchronisation Google Calendar lorsqu'elle est configuree.

L'acces Agenda ne contourne pas les controles de securite existants : session valide, compte et tenant actifs, isolation artisan/tenant, permissions de role, validation des donnees et OAuth Google Calendar restent applicables. Les quotas de projets, devis et Vapi ne sont pas modifies.

Les routes historiques `/api/events` ne verifient plus le niveau de plan ; elles conservent l'authentification et la verification que l'evenement ou le projet appartient bien a l'artisan courant.
