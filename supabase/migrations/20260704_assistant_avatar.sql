-- Avatar de l'assistant : permet à l'artisan de choisir l'image représentant
-- son assistant IA dans la bulle de chat (logo entreprise, image personnalisée,
-- avatar prédéfini, ou logo Kadria par défaut), au lieu d'afficher toujours
-- la lettre "K".
--
-- Convention : la table Artisan_config (nom historique avec majuscule, miroir
-- Supabase de la table Airtable du même nom) est référencée entre guillemets
-- doubles pour préserver la casse.

alter table public."Artisan_config"
  add column if not exists assistant_avatar_url text,
  add column if not exists assistant_avatar_type text not null default 'kadria_default';
