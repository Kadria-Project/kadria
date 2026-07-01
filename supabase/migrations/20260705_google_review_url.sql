-- Lien d'avis Google configurable par artisan : permet une demande d'avis
-- manuelle depuis la fiche projet, sans automatisation ni scheduler.
--
-- Convention : la table Artisan_config (nom historique avec majuscule, miroir
-- Supabase de la table Airtable du meme nom) est referencee entre guillemets
-- doubles pour preserver la casse.

alter table public."Artisan_config"
  add column if not exists google_review_url text;
