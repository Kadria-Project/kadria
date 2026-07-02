-- Preparation du modele acompte artisan.
-- Aucun paiement reel n'est branche dans cette migration :
-- uniquement les colonnes necessaires pour la configuration artisan
-- et le futur suivi d'acompte sur les projets.

alter table public."Artisan_config"
  add column if not exists deposit_enabled boolean not null default false,
  add column if not exists deposit_type text default 'percentage',
  add column if not exists deposit_value numeric,
  add column if not exists stripe_connect_status text default 'not_connected',
  add column if not exists stripe_account_id text;

alter table public."Projects"
  add column if not exists deposit_status text default 'not_requested',
  add column if not exists deposit_amount numeric,
  add column if not exists deposit_requested_at timestamptz,
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists deposit_payment_url text,
  add column if not exists deposit_provider text;
