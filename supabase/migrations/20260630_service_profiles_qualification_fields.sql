-- Référentiel métier — questions de qualification structurées : remplace
-- progressivement le simple tableau de chaînes "qualification_questions"
-- par une liste typée (texte, nombre, oui/non, date, choix, choix
-- multiples, photo, téléphone, email, adresse, montant).
-- NOTE: ce fichier n'a PAS été exécuté contre une base Supabase réelle, au
-- même titre que les migrations service_profiles précédentes. À exécuter
-- manuellement (Supabase SQL editor ou CLI) avant mise en production.
--
-- Migration douce : l'ancienne colonne `qualification_questions` (text[])
-- n'est PAS supprimée, pour ne casser aucun code existant (chat, vocal,
-- Action Engine, Mode Expert) qui la lit encore. La nouvelle colonne
-- `qualification_fields` est ajoutée en complément ; quand elle contient au
-- moins une entrée, elle devient la source de vérité pour l'UI et le Mode
-- Expert. Quand elle est vide, le comportement précédent (liste de
-- questions simples) reste inchangé.

alter table service_profiles
  add column if not exists qualification_fields jsonb not null default '[]'::jsonb;

comment on column service_profiles.qualification_fields is
  'Liste structurée des questions de qualification pour cette prestation : [{ id, label, type, required, order, placeholder, helpText, unit, options, category, defaultValue }, ...]. Source unique = saisie artisan (Profil métier), jamais générée automatiquement.';

comment on column service_profiles.qualification_questions is
  'Champ historique (V1). Conservé pour compatibilité ascendante tant que qualification_fields est vide ou non consommée par un appelant donné.';
