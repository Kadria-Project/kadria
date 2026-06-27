-- Ajout des métiers secondaires (complémentaires) à artisan_business_profile.
-- primary_trade reste le métier principal unique ; covered_trades porte la
-- liste des métiers complémentaires déclarés par l'artisan dans le Profil
-- métier (page /parametres/profil-metier), distincte de primary_trade.
-- Aucune donnée existante n'est modifiée : défaut '{}' pour les lignes déjà
-- en base.

alter table artisan_business_profile
  add column if not exists covered_trades text[] not null default '{}';
