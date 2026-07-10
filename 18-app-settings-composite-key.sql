-- ════════════════════════════════════════════════════════════════
-- Fix app_settings' primary key to actually scope by brand.
--
-- app_settings_pkey was PRIMARY KEY (key) alone — table-wide unique across
-- ALL brands, despite the table being brand-owned (brand_id column,
-- brand-scoped RLS policy). That means two different brands could never
-- both have a row for the same setting name: an upsert keyed on `key`
-- would silently overwrite the other brand's row with your own brand_id
-- and value. A real cross-brand data-corruption bug, caught because
-- saveAppSettingDB()'s upsert (onConflict: 'key,brand_id') failed outright
-- with "no unique or exclusion constraint matching" — the constraint it
-- expected never existed. Its only prior caller was dead code
-- (publishAppSettings(), never wired to any button), so this had never
-- actually been exercised before.
--
-- Safe to change: confirmed zero rows exist in app_settings for any brand
-- before this migration, so there's no data to reconcile.
-- ════════════════════════════════════════════════════════════════

alter table app_settings drop constraint app_settings_pkey;
alter table app_settings alter column brand_id set not null;
alter table app_settings add constraint app_settings_pkey primary key (brand_id, key);
