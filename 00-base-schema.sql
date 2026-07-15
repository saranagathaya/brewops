-- ════════════════════════════════════════════════════════════════
-- BASE SCHEMA — reconstructed 2026-07-07 from the live production
-- Supabase project (public schema only: tables, constraints, indexes,
-- views, functions, triggers, RLS policies), since no prior migration
-- captured the original schema this repo's history assumes as its
-- starting point (see README's "Database setup" section).
--
-- Generated via pg_catalog/information_schema introspection rather
-- than pg_dump (pg_dump wasn't available in the environment this was
-- produced in), originally validated only by parsing the whole file
-- with Postgres's own SQL parser (libpg-query). Since 2026-07-15 it is
-- also EXECUTION-validated: the full 00→18 sequence runs cleanly from
-- an empty database (the local staging stack — see tools/staging/).
-- That first real execution caught and fixed two bugs the parser
-- couldn't see: FK constraints ordered before the PK/UNIQUE
-- constraints they reference, and the missing default GRANTs added
-- below. Still treat it as a point-in-time snapshot, not a
-- hand-maintained migration: if you add new base
-- tables/functions/policies going forward, add them as a new numbered
-- migration file rather than editing this one — edit this file only
-- to fix errors in the snapshot itself, and re-verify any such edit
-- with a from-scratch rebuild on staging.
--
-- Order: extensions, enums, tables+columns, constraints, indexes,
-- views, functions, triggers, RLS enable + policies. Run this before
-- 01-* through 14-* on a fresh Supabase project.
--
-- SECURITY NOTE: the three "*-alert" triggers below call an edge
-- function over HTTP with a hardcoded Authorization bearer token.
-- The live project has a real service_role key inline there — that
-- key was NOT captured here (replaced with
-- '[REDACTED-SERVICE-ROLE-KEY]') because it grants full,
-- RLS-bypassing database access and must never live in git history.
-- If you rebuild from this file, recreate those triggers with a
-- freshly generated key pulled from Supabase Vault or an env var,
-- not hardcoded in the trigger DDL — the original design (secret
-- embedded directly in pg_trigger, visible to anyone who can read
-- pg_catalog) should be fixed while you're at it, not reproduced.
-- ════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "pg_cron";
create extension if not exists "pg_net";
create extension if not exists "pg_stat_statements";
create extension if not exists "pgcrypto";
create extension if not exists "supabase_vault";
create extension if not exists "uuid-ossp";

-- On hosted Supabase, anon/authenticated/service_role automatically get
-- SELECT/INSERT/UPDATE/DELETE on every public-schema table as platform
-- bootstrapping outside any SQL migration -- invisible until you rebuild
-- from scratch by connecting directly as `postgres` (e.g. via psql, not
-- the dashboard SQL editor), which uses `postgres`'s own DEFAULT
-- PRIVILEGES instead of `supabase_admin`'s -- and that default is missing
-- exactly SELECT/INSERT/UPDATE/DELETE (confirmed against a local
-- `supabase start` stack: every query failed "permission denied for
-- table X" regardless of RLS policy content, since Postgres checks
-- GRANTs before RLS). Restated explicitly here so a from-scratch rebuild
-- run outside the dashboard doesn't hit that wall; harmless / already
-- true if run against a real Supabase project via the dashboard.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;

-- Tables
create table if not exists "app_settings" (
  "key" text not null,
  "value" text not null,
  "updated_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "brands" (
  "id" uuid not null default gen_random_uuid(),
  "name" text not null,
  "slug" text not null,
  "logo_url" text,
  "primary_color" text default '#8B1A1A'::text,
  "secondary_color" text default '#A52020'::text,
  "accent_color" text default '#D4AF37'::text,
  "contact_email" text,
  "contact_phone" text,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "tagline" text
);

create table if not exists "coupon_redemptions" (
  "id" uuid not null default uuid_generate_v4(),
  "coupon_id" uuid,
  "order_id" uuid,
  "customer_id" uuid,
  "outlet_id" uuid,
  "discount_given" integer not null,
  "redeemed_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "coupons" (
  "id" uuid not null default uuid_generate_v4(),
  "code" text not null,
  "discount_type" text not null,
  "discount_value" integer not null,
  "min_order" integer default 0,
  "max_uses" integer,
  "uses_per_customer" integer default 1,
  "outlet_ids" uuid[],
  "beverage_ids" uuid[],
  "happy_hour_start" time without time zone,
  "happy_hour_end" time without time zone,
  "valid_from" date,
  "valid_until" date,
  "new_customers_only" boolean default false,
  "is_active" boolean default true,
  "total_used" integer default 0,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "customer_addresses" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid not null,
  "label" text default 'Home'::text,
  "address_line" text not null,
  "city" text,
  "notes" text,
  "is_default" boolean default false,
  "created_at" timestamp with time zone default now()
);

create table if not exists "customer_favourites" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid not null,
  "menu_item_id" uuid,
  "merch_item_id" uuid,
  "created_at" timestamp with time zone default now()
);

create table if not exists "daily_ops" (
  "id" uuid not null default uuid_generate_v4(),
  "outlet_id" uuid not null,
  "date" date not null default CURRENT_DATE,
  "beans_used_g" integer default 0,
  "milk_used_ml" integer default 0,
  "water_used_l" numeric(6,2) default 0,
  "electricity_kwh" numeric(6,2) default 0,
  "cups_used" integer default 0,
  "lids_used" integer default 0,
  "sleeves_used" integer default 0,
  "machine_cleans" integer default 0,
  "machine_flushes" integer default 0,
  "total_cups" integer default 0,
  "total_revenue" integer default 0,
  "brand_id" uuid
);

create table if not exists "home_banner" (
  "id" uuid not null default uuid_generate_v4(),
  "headline" text not null,
  "sub_text" text,
  "price_display" text,
  "bg_gradient" text,
  "image_url" text,
  "is_active" boolean default true,
  "updated_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "invite_codes" (
  "id" uuid not null default uuid_generate_v4(),
  "code" text not null,
  "role" text not null,
  "outlet_id" uuid,
  "used_by" uuid,
  "used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "invoices" (
  "id" uuid not null default uuid_generate_v4(),
  "invoice_number" text not null,
  "outlet_id" uuid not null,
  "period_start" date not null,
  "period_end" date not null,
  "revenue_amount" integer not null,
  "franchise_fee_pct" numeric(5,2) default 12,
  "franchise_fee" integer not null,
  "total_due" integer not null,
  "payment_account" text,
  "status" text default 'draft'::text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "paid_at" timestamp with time zone,
  "updated_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "issues" (
  "id" uuid not null default uuid_generate_v4(),
  "outlet_id" uuid not null,
  "reported_by" uuid,
  "category" text not null,
  "severity" text not null,
  "description" text not null,
  "status" text default 'open'::text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "machine_logs" (
  "id" uuid not null default uuid_generate_v4(),
  "outlet_id" uuid not null,
  "logged_by" uuid,
  "event_type" text not null,
  "notes" text,
  "logged_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "machines" (
  "id" uuid not null default uuid_generate_v4(),
  "outlet_id" uuid not null,
  "model" text not null,
  "serial_number" text,
  "last_service_at" date,
  "next_service_due" date,
  "status" text default 'ok'::text,
  "updated_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "menu_categories" (
  "id" uuid not null default uuid_generate_v4(),
  "name" text not null,
  "icon" text default '☕'::text,
  "sort_order" integer default 0,
  "is_visible" boolean default true,
  "created_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "menu_items" (
  "id" uuid not null default uuid_generate_v4(),
  "category_id" uuid,
  "name" text not null,
  "description" text,
  "emoji" text default '☕'::text,
  "image_url" text,
  "base_price" integer not null,
  "original_price" integer,
  "badge_label" text,
  "tags" text[] default '{}'::text[],
  "size_options" jsonb default '["Regular", "Large"]'::jsonb,
  "temp_options" jsonb default '["Hot", "Iced"]'::jsonb,
  "milk_options" jsonb default '["Full Cream", "Oat Milk", "Soy Milk"]'::jsonb,
  "sugar_options" jsonb default '["No Sugar", "Standard", "Extra Sweet"]'::jsonb,
  "large_upcharge" integer default 8000,
  "oat_upcharge" integer default 6000,
  "is_visible" boolean default true,
  "is_featured" boolean default false,
  "sort_order" integer default 0,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "detail_blocks" jsonb default '[]'::jsonb,
  "brand_id" uuid
);

create table if not exists "merch_categories" (
  "id" uuid not null default gen_random_uuid(),
  "name" text not null,
  "icon" text default '🛍️'::text,
  "sort_order" integer default 0,
  "is_visible" boolean default true,
  "created_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "merch_items" (
  "id" uuid not null default gen_random_uuid(),
  "category_id" uuid,
  "name" text not null,
  "description" text,
  "emoji" text default '🛍️'::text,
  "image_url" text,
  "base_price" integer not null default 0,
  "original_price" integer,
  "badge_label" text,
  "stock_qty" integer not null default 0,
  "is_visible" boolean default true,
  "is_featured" boolean default false,
  "sort_order" integer default 0,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "detail_blocks" jsonb default '[]'::jsonb,
  "brand_id" uuid
);

create table if not exists "order_items" (
  "id" uuid not null default uuid_generate_v4(),
  "order_id" uuid not null,
  "menu_item_id" uuid,
  "name" text not null,
  "emoji" text,
  "size" text default 'Regular'::text,
  "temperature" text default 'Hot'::text,
  "milk" text default 'Full Cream'::text,
  "sugar" text default 'Standard'::text,
  "quantity" integer not null default 1,
  "unit_price" integer not null,
  "line_total" integer not null,
  "merch_item_id" uuid,
  "brand_id" uuid,
  "image_url" text
);

create table if not exists "orders" (
  "id" uuid not null default uuid_generate_v4(),
  "order_number" text not null,
  "outlet_id" uuid not null,
  "customer_id" uuid,
  "customer_phone" text,
  "order_type" text not null,
  "status" text not null default 'pending'::text,
  "payment_method" text not null,
  "payment_status" text not null default 'pending'::text,
  "payment_account" text,
  "coupon_id" uuid,
  "subtotal" integer not null,
  "discount" integer default 0,
  "total" integer not null,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "delivery_address_text" text,
  "brand_id" uuid
);

create table if not exists "outlets" (
  "id" uuid not null default uuid_generate_v4(),
  "name" text not null,
  "location" text not null,
  "address" text,
  "lat" numeric(10,7),
  "lng" numeric(10,7),
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "profiles" (
  "id" uuid not null,
  "role" text not null,
  "full_name" text,
  "phone" text,
  "outlet_id" uuid,
  "avatar_url" text,
  "created_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "promo_slides" (
  "id" uuid not null default uuid_generate_v4(),
  "headline" text not null,
  "sub_text" text,
  "emoji" text default '☕'::text,
  "label_badge" text,
  "price_display" text,
  "bg_gradient" text default 'linear-gradient(145deg,#1a0a2e,#2d1040)'::text,
  "image_url" text,
  "sort_order" integer default 0,
  "is_visible" boolean default true,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "rent_schedules" (
  "id" uuid not null default uuid_generate_v4(),
  "outlet_id" uuid not null,
  "monthly_amount" integer not null,
  "due_day" integer default 1,
  "last_paid_at" date,
  "next_due_at" date,
  "status" text default 'current'::text,
  "brand_id" uuid
);

create table if not exists "stock" (
  "id" uuid not null default uuid_generate_v4(),
  "outlet_id" uuid not null,
  "item_name" text not null,
  "unit" text not null,
  "current_qty" numeric(10,2) not null default 0,
  "max_qty" numeric(10,2) not null,
  "low_threshold" numeric(10,2) not null,
  "updated_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "stock_requests" (
  "id" uuid not null default uuid_generate_v4(),
  "outlet_id" uuid not null,
  "requested_by" uuid,
  "items" jsonb not null,
  "urgency" text default 'normal'::text,
  "notes" text,
  "status" text default 'pending'::text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "fulfilled_at" timestamp with time zone,
  "brand_id" uuid
);

create table if not exists "supplier_payments" (
  "id" uuid not null default uuid_generate_v4(),
  "supplier_id" uuid not null,
  "amount" integer not null,
  "description" text,
  "due_date" date,
  "paid_at" timestamp with time zone,
  "status" text default 'pending'::text,
  "created_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "suppliers" (
  "id" uuid not null default uuid_generate_v4(),
  "name" text not null,
  "contact" text,
  "email" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "brand_id" uuid
);

create table if not exists "waste_logs" (
  "id" uuid not null default uuid_generate_v4(),
  "outlet_id" uuid not null,
  "logged_by" uuid,
  "item_name" text not null,
  "reason" text,
  "quantity" text not null,
  "estimated_cost" integer,
  "logged_at" timestamp with time zone default now(),
  "brand_id" uuid
);

-- Constraints
alter table "app_settings" add constraint "app_settings_pkey" PRIMARY KEY (key);
alter table "brands" add constraint "brands_pkey" PRIMARY KEY (id);
alter table "brands" add constraint "brands_slug_key" UNIQUE (slug);
alter table "coupon_redemptions" add constraint "coupon_redemptions_pkey" PRIMARY KEY (id);
alter table "coupons" add constraint "coupons_pkey" PRIMARY KEY (id);
alter table "coupons" add constraint "coupons_brand_code_key" UNIQUE (brand_id, code);
alter table "customer_addresses" add constraint "customer_addresses_pkey" PRIMARY KEY (id);
alter table "customer_favourites" add constraint "customer_favourites_pkey" PRIMARY KEY (id);
alter table "daily_ops" add constraint "daily_ops_pkey" PRIMARY KEY (id);
alter table "daily_ops" add constraint "daily_ops_outlet_id_date_key" UNIQUE (outlet_id, date);
alter table "home_banner" add constraint "home_banner_pkey" PRIMARY KEY (id);
alter table "invite_codes" add constraint "invite_codes_pkey" PRIMARY KEY (id);
alter table "invite_codes" add constraint "invite_codes_code_key" UNIQUE (code);
alter table "invoices" add constraint "invoices_pkey" PRIMARY KEY (id);
alter table "invoices" add constraint "invoices_invoice_number_key" UNIQUE (invoice_number);
alter table "issues" add constraint "issues_pkey" PRIMARY KEY (id);
alter table "machine_logs" add constraint "machine_logs_pkey" PRIMARY KEY (id);
alter table "machines" add constraint "machines_pkey" PRIMARY KEY (id);
alter table "machines" add constraint "machines_outlet_id_key" UNIQUE (outlet_id);
alter table "menu_categories" add constraint "menu_categories_pkey" PRIMARY KEY (id);
alter table "menu_items" add constraint "menu_items_pkey" PRIMARY KEY (id);
alter table "merch_categories" add constraint "merch_categories_pkey" PRIMARY KEY (id);
alter table "merch_items" add constraint "merch_items_pkey" PRIMARY KEY (id);
alter table "order_items" add constraint "order_items_pkey" PRIMARY KEY (id);
alter table "orders" add constraint "orders_pkey" PRIMARY KEY (id);
alter table "orders" add constraint "orders_order_number_key" UNIQUE (order_number);
alter table "outlets" add constraint "outlets_pkey" PRIMARY KEY (id);
alter table "profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
alter table "promo_slides" add constraint "promo_slides_pkey" PRIMARY KEY (id);
alter table "rent_schedules" add constraint "rent_schedules_pkey" PRIMARY KEY (id);
alter table "rent_schedules" add constraint "rent_schedules_outlet_id_key" UNIQUE (outlet_id);
alter table "stock" add constraint "stock_pkey" PRIMARY KEY (id);
alter table "stock" add constraint "stock_outlet_id_item_name_key" UNIQUE (outlet_id, item_name);
alter table "stock_requests" add constraint "stock_requests_pkey" PRIMARY KEY (id);
alter table "supplier_payments" add constraint "supplier_payments_pkey" PRIMARY KEY (id);
alter table "suppliers" add constraint "suppliers_pkey" PRIMARY KEY (id);
alter table "waste_logs" add constraint "waste_logs_pkey" PRIMARY KEY (id);

-- (foreign keys + check constraints, after all primary/unique keys above)
alter table "app_settings" add constraint "app_settings_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "coupon_redemptions" add constraint "coupon_redemptions_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "coupon_redemptions" add constraint "coupon_redemptions_coupon_id_fkey" FOREIGN KEY (coupon_id) REFERENCES coupons(id);
alter table "coupon_redemptions" add constraint "coupon_redemptions_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES profiles(id);
alter table "coupon_redemptions" add constraint "coupon_redemptions_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "coupons" add constraint "coupons_discount_type_check" CHECK ((discount_type = ANY (ARRAY['percent'::text, 'fixed'::text, 'free'::text])));
alter table "coupons" add constraint "coupons_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "customer_addresses" add constraint "customer_addresses_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "customer_favourites" add constraint "customer_favourites_one_product_type_chk" CHECK ((((menu_item_id IS NOT NULL) AND (merch_item_id IS NULL)) OR ((menu_item_id IS NULL) AND (merch_item_id IS NOT NULL))));
alter table "customer_favourites" add constraint "customer_favourites_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "customer_favourites" add constraint "customer_favourites_menu_item_id_fkey" FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;
alter table "customer_favourites" add constraint "customer_favourites_merch_item_id_fkey" FOREIGN KEY (merch_item_id) REFERENCES merch_items(id) ON DELETE CASCADE;
alter table "daily_ops" add constraint "daily_ops_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "daily_ops" add constraint "daily_ops_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "home_banner" add constraint "home_banner_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "invite_codes" add constraint "invite_codes_role_check" CHECK ((role = ANY (ARRAY['franchisee'::text, 'franchisor'::text])));
alter table "invite_codes" add constraint "invite_codes_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "invite_codes" add constraint "invite_codes_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "invite_codes" add constraint "invite_codes_used_by_fkey" FOREIGN KEY (used_by) REFERENCES auth.users(id);
alter table "invoices" add constraint "invoices_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text])));
alter table "invoices" add constraint "invoices_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "invoices" add constraint "invoices_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "issues" add constraint "issues_severity_check" CHECK ((severity = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])));
alter table "issues" add constraint "issues_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])));
alter table "issues" add constraint "issues_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "issues" add constraint "issues_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "issues" add constraint "issues_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES profiles(id);
alter table "machine_logs" add constraint "machine_logs_event_type_check" CHECK ((event_type = ANY (ARRAY['clean'::text, 'flush'::text, 'routine_service'::text, 'emergency_service'::text, 'issue_noticed'::text, 'part_replaced'::text])));
alter table "machine_logs" add constraint "machine_logs_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "machine_logs" add constraint "machine_logs_logged_by_fkey" FOREIGN KEY (logged_by) REFERENCES profiles(id);
alter table "machine_logs" add constraint "machine_logs_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "machines" add constraint "machines_status_check" CHECK ((status = ANY (ARRAY['ok'::text, 'due_soon'::text, 'overdue'::text, 'emergency'::text])));
alter table "machines" add constraint "machines_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "machines" add constraint "machines_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "menu_categories" add constraint "menu_categories_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "menu_items" add constraint "menu_items_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "menu_items" add constraint "menu_items_category_id_fkey" FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL;
alter table "merch_categories" add constraint "merch_categories_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "merch_items" add constraint "merch_items_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "merch_items" add constraint "merch_items_category_id_fkey" FOREIGN KEY (category_id) REFERENCES merch_categories(id) ON DELETE SET NULL;
alter table "order_items" add constraint "order_items_one_product_type_chk" CHECK ((((menu_item_id IS NOT NULL) AND (merch_item_id IS NULL)) OR ((menu_item_id IS NULL) AND (merch_item_id IS NOT NULL))));
alter table "order_items" add constraint "order_items_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "order_items" add constraint "order_items_menu_item_id_fkey" FOREIGN KEY (menu_item_id) REFERENCES menu_items(id);
alter table "order_items" add constraint "order_items_merch_item_id_fkey" FOREIGN KEY (merch_item_id) REFERENCES merch_items(id);
alter table "order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table "orders" add constraint "orders_order_type_check" CHECK ((order_type = ANY (ARRAY['pickup'::text, 'delivery'::text])));
alter table "orders" add constraint "orders_payment_method_check" CHECK ((payment_method = ANY (ARRAY['card'::text, 'cash'::text, 'qr'::text, 'voucher'::text])));
alter table "orders" add constraint "orders_payment_status_check" CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'cash_confirmed'::text, 'failed'::text, 'refunded'::text])));
alter table "orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'preparing'::text, 'ready'::text, 'completed'::text, 'cancelled'::text])));
alter table "orders" add constraint "orders_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "orders" add constraint "orders_coupon_id_fkey" FOREIGN KEY (coupon_id) REFERENCES coupons(id);
alter table "orders" add constraint "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES profiles(id);
alter table "orders" add constraint "orders_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "outlets" add constraint "outlets_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['franchisor'::text, 'franchisee'::text, 'customer'::text, 'platform_admin'::text])));
alter table "profiles" add constraint "profiles_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "profiles" add constraint "profiles_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "promo_slides" add constraint "promo_slides_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "rent_schedules" add constraint "rent_schedules_status_check" CHECK ((status = ANY (ARRAY['current'::text, 'due_soon'::text, 'overdue'::text])));
alter table "rent_schedules" add constraint "rent_schedules_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "rent_schedules" add constraint "rent_schedules_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "stock" add constraint "stock_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "stock" add constraint "stock_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "stock_requests" add constraint "stock_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'dispatched'::text, 'delivered'::text, 'fulfilled'::text])));
alter table "stock_requests" add constraint "stock_requests_urgency_check" CHECK ((urgency = ANY (ARRAY['critical'::text, 'urgent'::text, 'normal'::text])));
alter table "stock_requests" add constraint "stock_requests_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "stock_requests" add constraint "stock_requests_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);
alter table "stock_requests" add constraint "stock_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES profiles(id);
alter table "supplier_payments" add constraint "supplier_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text])));
alter table "supplier_payments" add constraint "supplier_payments_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "supplier_payments" add constraint "supplier_payments_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
alter table "suppliers" add constraint "suppliers_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "waste_logs" add constraint "waste_logs_reason_check" CHECK ((reason = ANY (ARRAY['spilled'::text, 'disposed'::text, 'expired'::text, 'quality_issue'::text, 'other'::text])));
alter table "waste_logs" add constraint "waste_logs_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES brands(id);
alter table "waste_logs" add constraint "waste_logs_logged_by_fkey" FOREIGN KEY (logged_by) REFERENCES profiles(id);
alter table "waste_logs" add constraint "waste_logs_outlet_id_fkey" FOREIGN KEY (outlet_id) REFERENCES outlets(id);

-- Indexes
CREATE INDEX idx_customer_addresses_customer ON public.customer_addresses USING btree (customer_id);
CREATE UNIQUE INDEX idx_customer_favourites_unique_menu ON public.customer_favourites USING btree (customer_id, menu_item_id) WHERE (menu_item_id IS NOT NULL);
CREATE UNIQUE INDEX idx_customer_favourites_unique_merch ON public.customer_favourites USING btree (customer_id, merch_item_id) WHERE (merch_item_id IS NOT NULL);
CREATE INDEX idx_stock_requests_outlet_status ON public.stock_requests USING btree (outlet_id, status, fulfilled_at DESC);

-- Views
create or replace view "network_revenue" as
SELECT o.brand_id,
    sum(d.total_revenue) AS total_today,
    sum(d.total_cups) AS cups_today,
    count(DISTINCT d.outlet_id) AS active_outlets
   FROM (daily_ops d
     JOIN outlets o ON ((o.id = d.outlet_id)))
  WHERE (d.date = CURRENT_DATE)
  GROUP BY o.brand_id;

create or replace view "outlet_health" as
SELECT o.id,
    o.name,
    o.location,
    o.brand_id,
    COALESCE(d.total_cups, 0) AS cups_today,
    COALESCE(d.total_revenue, 0) AS revenue_today,
    COALESCE(d.machine_cleans, 0) AS cleans_today,
    COALESCE(d.machine_flushes, 0) AS flushes_today,
    m.status AS machine_status,
    m.next_service_due,
    r.status AS rent_status,
    r.next_due_at AS rent_due,
    r.monthly_amount,
    ( SELECT count(*) AS count
           FROM orders ord
          WHERE ((ord.outlet_id = o.id) AND (ord.status <> ALL (ARRAY['completed'::text, 'cancelled'::text])))) AS live_orders
   FROM (((outlets o
     LEFT JOIN daily_ops d ON (((d.outlet_id = o.id) AND (d.date = CURRENT_DATE))))
     LEFT JOIN machines m ON ((m.outlet_id = o.id)))
     LEFT JOIN rent_schedules r ON ((r.outlet_id = o.id)))
  WHERE (o.is_active = true);

-- Functions
CREATE OR REPLACE FUNCTION public.decrement_merch_stock(p_item_id uuid, p_qty integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  rows_updated integer;
begin
  update merch_items
    set stock_qty = stock_qty - p_qty, updated_at = now()
    where id = p_item_id and stock_qty >= p_qty;
  get diagnostics rows_updated = row_count;
  return rows_updated > 0;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  next_num integer;
begin
  select coalesce(max(cast(substring(order_number from 5) as integer)), 4800) + 1
  into next_num
  from orders;
  new.order_number = 'ORD-' || next_num;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_brand_accounts(p_brand_id uuid)
 RETURNS TABLE(user_id uuid, role text, full_name text, email text, outlet_name text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select
    p.id as user_id,
    p.role,
    p.full_name,
    u.email,
    o.name as outlet_name
  from profiles p
  join auth.users u on u.id = p.id
  left join outlets o on o.id = p.outlet_id
  where p.brand_id = p_brand_id
  order by p.role, p.full_name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_brand_id()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select brand_id from profiles where id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_outlet()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select outlet_id from profiles where id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_outlet_ranking()
 RETURNS TABLE(outlet_id uuid, month_revenue integer, month_cups integer, app_order_count integer, revenue_rank bigint, app_order_rank bigint, machine_compliance_rank bigint, total_outlets bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  my_outlet uuid;
begin
  my_outlet := get_my_outlet();
  if my_outlet is null then
    return; -- not a franchisee with an assigned outlet — return nothing
  end if;

  return query
  with monthly_stats as (
    select
      o.id as outlet_id,
      coalesce(sum(d.total_revenue), 0)::integer as month_revenue,
      coalesce(sum(d.total_cups), 0)::integer as month_cups,
      coalesce(sum(d.machine_cleans + d.machine_flushes), 0)::integer as month_machine_events
    from outlets o
    left join daily_ops d on d.outlet_id = o.id
      and d.date >= date_trunc('month', current_date)
    where o.is_active = true
    group by o.id
  ),
  app_order_counts as (
    select ord.outlet_id, count(*)::integer as app_order_count
    from orders ord
    where ord.customer_id is not null
      and ord.status = 'completed'
      and ord.created_at >= date_trunc('month', current_date)
    group by ord.outlet_id
  ),
  ranked as (
    select
      m.outlet_id,
      m.month_revenue,
      m.month_cups,
      coalesce(a.app_order_count, 0) as app_order_count,
      rank() over (order by m.month_revenue desc) as revenue_rank,
      rank() over (order by coalesce(a.app_order_count,0) desc) as app_order_rank,
      rank() over (order by m.month_machine_events desc) as machine_compliance_rank,
      count(*) over () as total_outlets
    from monthly_stats m
    left join app_order_counts a on a.outlet_id = m.outlet_id
  )
  select * from ranked where ranked.outlet_id = my_outlet;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select role from profiles where id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_role text;
  v_outlet_id uuid;
  v_full_name text;
begin
  v_role      := coalesce(new.raw_user_meta_data->>'role', 'customer');
  v_outlet_id := (new.raw_user_meta_data->>'outlet_id')::uuid;
  v_full_name := new.raw_user_meta_data->>'full_name';

  insert into public.profiles (id, role, full_name, phone, outlet_id)
  values (new.id, v_role, v_full_name, new.phone, v_outlet_id)
  on conflict (id) do nothing;

  -- If this signup used an invite code, mark it as used
  if new.raw_user_meta_data->>'invite_code' is not null then
    update invite_codes
    set used_by = new.id, used_at = now()
    where code = new.raw_user_meta_data->>'invite_code'
      and used_by is null;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recalculate_rent_statuses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update rent_schedules
  set status = case
    when next_due_at is null then status
    when next_due_at < current_date then 'overdue'
    when next_due_at <= current_date + interval '10 days' then 'due_soon'
    else 'current'
  end
  where next_due_at is not null
    and status is distinct from (
      case
        when next_due_at < current_date then 'overdue'
        when next_due_at <= current_date + interval '10 days' then 'due_soon'
        else 'current'
      end
    );
  -- The `is distinct from` guard means this only writes a row when the
  -- status actually needs to change — so it won't fire the webhook
  -- every single day for outlets whose status hasn't changed, only on
  -- the day something genuinely crosses into a new state.
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_coupon_usage()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update coupons set total_used = total_used + 1 where id = new.coupon_id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_daily_ops()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    insert into daily_ops (outlet_id, date, total_cups, total_revenue)
    values (
      new.outlet_id,
      current_date,
      (select coalesce(sum(quantity), 1) from order_items where order_id = new.id),
      new.total
    )
    on conflict (outlet_id, date) do update set
      total_cups    = daily_ops.total_cups    + excluded.total_cups,
      total_revenue = daily_ops.total_revenue + excluded.total_revenue;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

-- Triggers
CREATE TRIGGER "invoice-sent-alert" AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://fjmzsxslnzrtgcilttly.supabase.co/functions/v1/send-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer [REDACTED-SERVICE-ROLE-KEY]"}', '{}', '5000');
CREATE TRIGGER "machine-status-alert" AFTER UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://fjmzsxslnzrtgcilttly.supabase.co/functions/v1/send-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer [REDACTED-SERVICE-ROLE-KEY]"}', '{}', '5000');
CREATE TRIGGER "rent-overdue-alert" AFTER UPDATE ON public.rent_schedules FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://fjmzsxslnzrtgcilttly.supabase.co/functions/v1/send-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer [REDACTED-SERVICE-ROLE-KEY]"}', '{}', '5000');
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_coupon_redemptions AFTER INSERT ON public.coupon_redemptions FOR EACH ROW EXECUTE FUNCTION update_coupon_usage();
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_home_banner_updated_at BEFORE UPDATE ON public.home_banner FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_daily_ops AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_daily_ops();
CREATE TRIGGER trg_orders_number BEFORE INSERT ON public.orders FOR EACH ROW WHEN (((new.order_number IS NULL) OR (new.order_number = ''::text))) EXECUTE FUNCTION generate_order_number();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_promo_slides_updated_at BEFORE UPDATE ON public.promo_slides FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stock_requests_updated_at BEFORE UPDATE ON public.stock_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stock_updated_at BEFORE UPDATE ON public.stock FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
alter table "app_settings" enable row level security;
alter table "brands" enable row level security;
alter table "coupon_redemptions" enable row level security;
alter table "coupons" enable row level security;
alter table "customer_addresses" enable row level security;
alter table "customer_favourites" enable row level security;
alter table "daily_ops" enable row level security;
alter table "home_banner" enable row level security;
alter table "invite_codes" enable row level security;
alter table "invoices" enable row level security;
alter table "issues" enable row level security;
alter table "machine_logs" enable row level security;
alter table "machines" enable row level security;
alter table "menu_categories" enable row level security;
alter table "menu_items" enable row level security;
alter table "merch_categories" enable row level security;
alter table "merch_items" enable row level security;
alter table "order_items" enable row level security;
alter table "orders" enable row level security;
alter table "outlets" enable row level security;
alter table "profiles" enable row level security;
alter table "promo_slides" enable row level security;
alter table "rent_schedules" enable row level security;
alter table "stock" enable row level security;
alter table "stock_requests" enable row level security;
alter table "supplier_payments" enable row level security;
alter table "suppliers" enable row level security;
alter table "waste_logs" enable row level security;

-- Policies
create policy "app_settings_franchisor_write" on "app_settings" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "app_settings_public_read" on "app_settings" as permissive for select to public using (true);
create policy "brands_franchisor_own_update" on "brands" as permissive for update to public using (((get_my_role() = 'franchisor'::text) AND (id = get_my_brand_id())));
create policy "brands_platform_admin_all" on "brands" as permissive for all to public using ((get_my_role() = 'platform_admin'::text));
create policy "brands_public_read" on "brands" as permissive for select to public using ((is_active = true));
create policy "coupon_redemptions_franchisor" on "coupon_redemptions" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "coupon_redemptions_insert" on "coupon_redemptions" as permissive for insert to public with check (true);
create policy "coupons_franchisor_all" on "coupons" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "coupons_public_read" on "coupons" as permissive for select to public using ((is_active = true));
create policy "customer_addresses_own_rows" on "customer_addresses" as permissive for all to public using ((auth.uid() = customer_id)) with check ((auth.uid() = customer_id));
create policy "customer_favourites_own_rows" on "customer_favourites" as permissive for all to public using ((auth.uid() = customer_id)) with check ((auth.uid() = customer_id));
create policy "daily_ops_anon_read" on "daily_ops" as permissive for select to anon, authenticated using (true);
create policy "daily_ops_franchisee_own" on "daily_ops" as permissive for all to public using ((outlet_id = get_my_outlet()));
create policy "daily_ops_franchisor_all" on "daily_ops" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "home_banner_franchisor_all" on "home_banner" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "home_banner_public_read" on "home_banner" as permissive for select to public using ((is_active = true));
create policy "invite_codes_franchisor_all" on "invite_codes" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "invite_codes_platform_admin_all" on "invite_codes" as permissive for all to public using ((get_my_role() = 'platform_admin'::text));
create policy "invite_codes_public_read" on "invite_codes" as permissive for select to anon, authenticated using (true);
create policy "invite_codes_self_redeem" on "invite_codes" as permissive for update to authenticated using ((used_by IS NULL)) with check ((used_by = auth.uid()));
create policy "invoices_franchisee_read" on "invoices" as permissive for select to public using ((outlet_id = get_my_outlet()));
create policy "invoices_franchisor_all" on "invoices" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "issues_franchisee" on "issues" as permissive for all to public using ((outlet_id = get_my_outlet()));
create policy "issues_franchisor" on "issues" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "machine_logs_franchisee" on "machine_logs" as permissive for all to public using ((outlet_id = get_my_outlet()));
create policy "machine_logs_franchisor" on "machine_logs" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "machines_franchisee" on "machines" as permissive for select to public using ((outlet_id = get_my_outlet()));
create policy "machines_franchisor" on "machines" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "menu_categories_franchisor_write" on "menu_categories" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "menu_categories_public_read" on "menu_categories" as permissive for select to public using (true);
create policy "menu_items_franchisor_all" on "menu_items" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "menu_items_public_read" on "menu_items" as permissive for select to public using ((is_visible = true));
create policy "merch_categories_franchisor_all" on "merch_categories" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "merch_categories_public_read" on "merch_categories" as permissive for select to public using ((is_visible = true));
create policy "merch_items_franchisor_all" on "merch_items" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "merch_items_public_read" on "merch_items" as permissive for select to public using ((is_visible = true));
create policy "order_items_anon_insert" on "order_items" as permissive for insert to anon, authenticated with check (true);
create policy "order_items_customer_own" on "order_items" as permissive for select to public using ((order_id IN ( SELECT orders.id
   FROM orders
  WHERE (orders.customer_id = auth.uid()))));
create policy "order_items_franchisee_read" on "order_items" as permissive for select to public using ((order_id IN ( SELECT orders.id
   FROM orders
  WHERE (orders.outlet_id = get_my_outlet()))));
create policy "order_items_franchisor_all" on "order_items" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "orders_anon_insert" on "orders" as permissive for insert to anon, authenticated with check (true);
create policy "orders_customer_insert_authenticated" on "orders" as permissive for insert to authenticated with check (((customer_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['franchisee'::text, 'franchisor'::text]))));
create policy "orders_customer_own" on "orders" as permissive for select to public using ((customer_id = auth.uid()));
create policy "orders_customer_own_authenticated" on "orders" as permissive for select to authenticated using (((customer_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['franchisee'::text, 'franchisor'::text]))));
create policy "orders_franchisee_outlet" on "orders" as permissive for select to public using ((outlet_id = get_my_outlet()));
create policy "orders_franchisee_update" on "orders" as permissive for update to public using ((outlet_id = get_my_outlet()));
create policy "orders_franchisor_all" on "orders" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "outlets_franchisor_all" on "outlets" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "outlets_public_read" on "outlets" as permissive for select to public using (true);
create policy "profiles_franchisor_read" on "profiles" as permissive for select to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "profiles_insert_own" on "profiles" as permissive for insert to authenticated with check ((id = auth.uid()));
create policy "profiles_own_read" on "profiles" as permissive for select to public using ((id = auth.uid()));
create policy "profiles_own_update" on "profiles" as permissive for update to public using ((id = auth.uid()));
create policy "promo_slides_franchisor_all" on "promo_slides" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "promo_slides_public_read" on "promo_slides" as permissive for select to public using ((is_visible = true));
create policy "rent_franchisee_read" on "rent_schedules" as permissive for select to public using ((outlet_id = get_my_outlet()));
create policy "rent_franchisor_all" on "rent_schedules" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "stock_franchisee_own" on "stock" as permissive for all to public using ((outlet_id = get_my_outlet()));
create policy "stock_franchisor_all" on "stock" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "stock_requests_franchisee" on "stock_requests" as permissive for all to public using ((outlet_id = get_my_outlet()));
create policy "stock_requests_franchisor" on "stock_requests" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "supplier_payments_franchisor" on "supplier_payments" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "suppliers_franchisor" on "suppliers" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
create policy "waste_franchisee" on "waste_logs" as permissive for all to public using ((outlet_id = get_my_outlet()));
create policy "waste_franchisor" on "waste_logs" as permissive for all to public using (((get_my_role() = 'franchisor'::text) AND (brand_id = get_my_brand_id())));
