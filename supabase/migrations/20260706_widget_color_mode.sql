alter table "Artisan_config"
add column if not exists widget_color_mode text not null default 'sobriety';

alter table "Artisan_config"
drop constraint if exists artisan_config_widget_color_mode_check;

alter table "Artisan_config"
add constraint artisan_config_widget_color_mode_check
check (widget_color_mode in ('sobriety', 'immersive', 'premium_dark'));
