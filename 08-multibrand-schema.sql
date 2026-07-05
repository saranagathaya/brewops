-- ════════════════════════════════════════════════════════════════
-- MULTI-BRAND MIGRATION -- STEP 1: Schema foundation
--
-- Adds a `brands` table and a `brand_id` column to every table that
-- currently implicitly belongs to "the one brand" (Lietard). This is
-- the foundation for full brand isolation -- later steps rewrite RLS
-- to actually enforce it.
--
-- SAFE TO RUN: this migration only ADDS structure and backfills
-- existing rows to a single brand row. It does not change any RLS
-- policy, does not remove any column, and does not change what any
-- current query returns. Existing app behavior is unaffected until
-- the RLS retrofit (a later migration) is applied.
--
-- Run this entire file in one go in the Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- -- 1. The brands table itself --
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,              -- used in the customer app URL: ?brand=<slug>
  logo_url text,
  primary_color text default '#8B1A1A',   -- hex values, applied as CSS variables at runtime
  secondary_color text default '#A52020',
  accent_color text default '#D4AF37',
  contact_email text,
  contact_phone text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- -- 2. Seed the one existing brand so every current row has somewhere
--      real to point to. Using a fixed, memorable UUID (not random) so
--      every backfill statement below can reference it directly without
--      needing a variable or a second query.
insert into brands (id, name, slug, primary_color, secondary_color, accent_color)
values ('00000000-0000-0000-0000-000000000001', 'Lietard Artisan Roast', 'lietard', '#8B1A1A', '#A52020', '#D4AF37')
on conflict (id) do nothing;

-- -- 3. Tier 1 -- directly brand-owned tables --
-- (profiles, outlets, menu_categories, menu_items, merch_categories,
--  merch_items, invite_codes, coupons, promo_slides, home_banner,
--  app_settings, suppliers)

alter table profiles add column if not exists brand_id uuid references brands(id);
update profiles set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table outlets add column if not exists brand_id uuid references brands(id);
update outlets set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table menu_categories add column if not exists brand_id uuid references brands(id);
update menu_categories set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table menu_items add column if not exists brand_id uuid references brands(id);
update menu_items set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table merch_categories add column if not exists brand_id uuid references brands(id);
update merch_categories set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table merch_items add column if not exists brand_id uuid references brands(id);
update merch_items set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table invite_codes add column if not exists brand_id uuid references brands(id);
update invite_codes set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table coupons add column if not exists brand_id uuid references brands(id);
update coupons set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table promo_slides add column if not exists brand_id uuid references brands(id);
update promo_slides set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table home_banner add column if not exists brand_id uuid references brands(id);
update home_banner set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table app_settings add column if not exists brand_id uuid references brands(id);
update app_settings set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

alter table suppliers add column if not exists brand_id uuid references brands(id);
update suppliers set brand_id = '00000000-0000-0000-0000-000000000001' where brand_id is null;

-- -- 4. Tier 2 -- scoped via outlet_id (brand = the outlet's brand) --
-- (orders, stock, stock_requests, machines, machine_logs, rent_schedules,
--  issues, waste_logs, daily_ops, invoices)

alter table orders add column if not exists brand_id uuid references brands(id);
update orders o set brand_id = ou.brand_id from outlets ou where o.outlet_id = ou.id and o.brand_id is null;

alter table stock add column if not exists brand_id uuid references brands(id);
update stock s set brand_id = ou.brand_id from outlets ou where s.outlet_id = ou.id and s.brand_id is null;

alter table stock_requests add column if not exists brand_id uuid references brands(id);
update stock_requests sr set brand_id = ou.brand_id from outlets ou where sr.outlet_id = ou.id and sr.brand_id is null;

alter table machines add column if not exists brand_id uuid references brands(id);
update machines m set brand_id = ou.brand_id from outlets ou where m.outlet_id = ou.id and m.brand_id is null;

alter table machine_logs add column if not exists brand_id uuid references brands(id);
update machine_logs ml set brand_id = ou.brand_id from outlets ou where ml.outlet_id = ou.id and ml.brand_id is null;

alter table rent_schedules add column if not exists brand_id uuid references brands(id);
update rent_schedules rs set brand_id = ou.brand_id from outlets ou where rs.outlet_id = ou.id and rs.brand_id is null;

alter table issues add column if not exists brand_id uuid references brands(id);
update issues i set brand_id = ou.brand_id from outlets ou where i.outlet_id = ou.id and i.brand_id is null;

alter table waste_logs add column if not exists brand_id uuid references brands(id);
update waste_logs wl set brand_id = ou.brand_id from outlets ou where wl.outlet_id = ou.id and wl.brand_id is null;

alter table daily_ops add column if not exists brand_id uuid references brands(id);
update daily_ops d set brand_id = ou.brand_id from outlets ou where d.outlet_id = ou.id and d.brand_id is null;

alter table invoices add column if not exists brand_id uuid references brands(id);
update invoices inv set brand_id = ou.brand_id from outlets ou where inv.outlet_id = ou.id and inv.brand_id is null;

-- -- 5. Tier 3 -- scoped via a parent row --
-- (order_items via order_id, coupon_redemptions via coupon_id,
--  supplier_payments via supplier_id)

alter table order_items add column if not exists brand_id uuid references brands(id);
update order_items oi set brand_id = o.brand_id from orders o where oi.order_id = o.id and oi.brand_id is null;

alter table coupon_redemptions add column if not exists brand_id uuid references brands(id);
update coupon_redemptions cr set brand_id = c.brand_id from coupons c where cr.coupon_id = c.id and cr.brand_id is null;

alter table supplier_payments add column if not exists brand_id uuid references brands(id);
update supplier_payments sp set brand_id = s.brand_id from suppliers s where sp.supplier_id = s.id and sp.brand_id is null;

-- -- 6. Verification query -- run this AFTER the above to confirm zero
--      rows were left with a null brand_id anywhere. If this returns
--      any rows, STOP and investigate before proceeding to add NOT NULL
--      constraints (a future migration) -- it means some row's foreign
--      key didn't match any existing outlet/order/coupon/supplier row.
-- ════════════════════════════════════════════════════════════════
select 'profiles' as table_name, count(*) as rows_missing_brand from profiles where brand_id is null
union all select 'outlets', count(*) from outlets where brand_id is null
union all select 'menu_categories', count(*) from menu_categories where brand_id is null
union all select 'menu_items', count(*) from menu_items where brand_id is null
union all select 'merch_categories', count(*) from merch_categories where brand_id is null
union all select 'merch_items', count(*) from merch_items where brand_id is null
union all select 'invite_codes', count(*) from invite_codes where brand_id is null
union all select 'coupons', count(*) from coupons where brand_id is null
union all select 'promo_slides', count(*) from promo_slides where brand_id is null
union all select 'home_banner', count(*) from home_banner where brand_id is null
union all select 'app_settings', count(*) from app_settings where brand_id is null
union all select 'suppliers', count(*) from suppliers where brand_id is null
union all select 'orders', count(*) from orders where brand_id is null
union all select 'stock', count(*) from stock where brand_id is null
union all select 'stock_requests', count(*) from stock_requests where brand_id is null
union all select 'machines', count(*) from machines where brand_id is null
union all select 'machine_logs', count(*) from machine_logs where brand_id is null
union all select 'rent_schedules', count(*) from rent_schedules where brand_id is null
union all select 'issues', count(*) from issues where brand_id is null
union all select 'waste_logs', count(*) from waste_logs where brand_id is null
union all select 'daily_ops', count(*) from daily_ops where brand_id is null
union all select 'invoices', count(*) from invoices where brand_id is null
union all select 'order_items', count(*) from order_items where brand_id is null
union all select 'coupon_redemptions', count(*) from coupon_redemptions where brand_id is null
union all select 'supplier_payments', count(*) from supplier_payments where brand_id is null
order by rows_missing_brand desc;
