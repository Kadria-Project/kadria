-- Référentiel métier — preuves visuelles : remplace le simple booléen
-- "required_photos" par une liste structurée décrivant exactement quelles
-- photos demander, pourquoi, si elles sont obligatoires et dans quel ordre.
-- NOTE: ce fichier n'a PAS été exécuté contre une base Supabase réelle, au
-- même titre que 20260628_service_profiles.sql. À exécuter manuellement
-- (Supabase SQL editor ou CLI) avant mise en production.
--
-- Migration douce : l'ancienne colonne `required_photos` (boolean) n'est
-- PAS supprimée, pour ne casser aucun code existant (Service Matcher,
-- Action Engine, Mode Expert) qui la lit encore. La nouvelle colonne
-- `required_photos_list` est ajoutée en complément ; quand elle contient au
-- moins une entrée, elle devient la source de vérité pour l'UI et le Mode
-- Expert. Quand elle est vide, le comportement précédent (booléen seul)
-- reste inchangé.

alter table service_profiles
  add column if not exists required_photos_list jsonb not null default '[]'::jsonb;

comment on column service_profiles.required_photos_list is
  'Liste structurée des photos à demander pour cette prestation : [{ id, title, description, required, order }, ...]. Source unique = saisie artisan (Profil métier), jamais générée automatiquement.';

comment on column service_profiles.required_photos is
  'Champ historique (V1). Conservé pour compatibilité ascendante tant que required_photos_list est vide ou non consommée par un appelant donné.';
