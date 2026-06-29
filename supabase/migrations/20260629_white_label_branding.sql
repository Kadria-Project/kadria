-- Marque blanche du widget /projet : permet aux artisans des plans
-- Performance/Agence de remplacer le branding Kadria affiché dans le header
-- du widget par leur propre marque (logo et/ou nom). Le gating par plan est
-- appliqué côté serveur (jamais côté front) dans /api/artisan/config (PATCH)
-- et /api/artisan/public-config (GET) — ces colonnes peuvent donc exister
-- avec white_label_enabled=true même pour un artisan redescendu en Essentiel
-- (ex: après un downgrade), sans que cela ne se traduise jamais par un
-- affichage de marque blanche réel.
--
-- Convention : la table Artisan_config (nom historique avec majuscule, miroir
-- Supabase de la table Airtable du même nom) est référencée entre guillemets
-- doubles pour préserver la casse.

alter table public."Artisan_config"
  add column if not exists white_label_enabled boolean not null default false,
  add column if not exists widget_brand_name text,
  add column if not exists widget_brand_logo_url text;
