# Fiche Projet — Lot 2 : comprendre le dossier

Le Lot 2 étend le brief compact du Lot 1, sans toucher aux mutations ni au contrôleur legacy.

## Architecture

Le même endpoint et le même builder serveur produisent désormais deux sous-contrats : `qualification` et `commercialSummary`. Le navigateur reçoit des libellés de compréhension, jamais les valeurs brutes de budget/délai, des coordonnées, collections, notes, messages, documents, photos, score, règles métier ou client Supabase.

## Qualification

La section présente ce qui est confirmé, ce qui manque, pourquoi cela compte, un niveau de preuve et une seule action de complétion lorsqu’elle est nécessaire. Une qualification incomplète est une réserve, jamais une urgence artificielle.

## Commercial

Le résumé porte sur le dernier devis pertinent : état, faits, compréhension, réserve et implication. Un devis envoyé sans décision reste une lecture faible ou modérée ; une absence de réponse ou une ouverture ne devient jamais une intention client.

## Reporté au Lot 3

Historique, documents, photos, communications, planning détaillé, devis détaillés, rendez-vous détaillés, formulaires et mutations restent hors périmètre.

## Validations

- tests Projet : 27/27 ;
- `npx tsc --noEmit` : succès ;
- lint ciblé et `git diff --check` : succès ;
- build final : succès en 100,3 s (compilation 35 s, TypeScript 55 s).
