-- ════════════════════════════════════════════════════════════════
-- MULTI-BRAND MIGRATION -- STEP 4: RLS retrofit (brand isolation)
--
-- This is the step that actually ENFORCES brand isolation at the
-- database layer. Every policy that currently checks only
-- get_my_role() = 'franchisor' now ALSO checks brand_id = get_my_brand_id(),
-- so a franchisor from Brand A can never read or write Brand B's data,
-- even if the app had a bug that forgot to filter by brand.
--
-- IMPORTANT -- BEFORE RUNNING THIS:
-- Confirm you have a real database backup (see the pre-multi-brand
-- checkpoint manifest). This migration rewrites security policies on
-- nearly every table. It should not change what your existing single
-- brand's data shows (everything was backfilled to one brand in step 1),
-- but please verify in the app after running this that:
--   1. You can still log in as the franchisor and see your outlets/orders/etc.
--   2. You can still log in as a franchisee and see your outlet's data.
--   3. The customer app can still browse the menu and place an order.
--
-- Two policies are DROPPED entirely (not just narrowed) because they
-- were unused, overly-permissive leftover scaffolding -- confirmed via
-- code search that nothing in any of the three apps actually relies on
-- them:
--   - orders_anon_update: allowed ANYONE to update ANY order's any field
--     with zero restriction. No app code calls orders.update() without
--     being a logged-in franchisee/franchisor already, who have their
--     own proper policies.
--   - order_items_anon_select: allowed anyone to read all order line
--     items with zero restriction. No app code performs this query.
-- ════════════════════════════════════════════════════════════════

-- ── Drop the two unused, overly-permissive policies ──
drop policy if exists "orders_anon_update" on orders;
drop policy if exists "order_items_anon_select" on order_items;

-- ── Tier 1: franchisor policies -- add brand check to all 23 ──

drop policy if exists "app_settings_franchisor_write" on app_settings;
create policy "app_settings_franchisor_write" on app_settings for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "coupon_redemptions_franchisor" on coupon_redemptions;
create policy "coupon_redemptions_franchisor" on coupon_redemptions for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "coupons_franchisor_all" on coupons;
create policy "coupons_franchisor_all" on coupons for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "daily_ops_franchisor_all" on daily_ops;
create policy "daily_ops_franchisor_all" on daily_ops for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "home_banner_franchisor_all" on home_banner;
create policy "home_banner_franchisor_all" on home_banner for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "invite_codes_franchisor_all" on invite_codes;
create policy "invite_codes_franchisor_all" on invite_codes for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "invoices_franchisor_all" on invoices;
create policy "invoices_franchisor_all" on invoices for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "issues_franchisor" on issues;
create policy "issues_franchisor" on issues for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "machine_logs_franchisor" on machine_logs;
create policy "machine_logs_franchisor" on machine_logs for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "machines_franchisor" on machines;
create policy "machines_franchisor" on machines for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "menu_categories_franchisor_write" on menu_categories;
create policy "menu_categories_franchisor_write" on menu_categories for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "menu_items_franchisor_all" on menu_items;
create policy "menu_items_franchisor_all" on menu_items for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "merch_categories_franchisor_all" on merch_categories;
create policy "merch_categories_franchisor_all" on merch_categories for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "merch_items_franchisor_all" on merch_items;
create policy "merch_items_franchisor_all" on merch_items for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "order_items_franchisor_all" on order_items;
create policy "order_items_franchisor_all" on order_items for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "orders_franchisor_all" on orders;
create policy "orders_franchisor_all" on orders for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "outlets_franchisor_all" on outlets;
create policy "outlets_franchisor_all" on outlets for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "promo_slides_franchisor_all" on promo_slides;
create policy "promo_slides_franchisor_all" on promo_slides for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "rent_franchisor_all" on rent_schedules;
create policy "rent_franchisor_all" on rent_schedules for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "stock_franchisor_all" on stock;
create policy "stock_franchisor_all" on stock for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "stock_requests_franchisor" on stock_requests;
create policy "stock_requests_franchisor" on stock_requests for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "supplier_payments_franchisor" on supplier_payments;
create policy "supplier_payments_franchisor" on supplier_payments for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "suppliers_franchisor" on suppliers;
create policy "suppliers_franchisor" on suppliers for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

drop policy if exists "waste_franchisor" on waste_logs;
create policy "waste_franchisor" on waste_logs for all
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

-- ── Tier 4: profile read -- a franchisor should only see profiles
--      belonging to their own brand, not every franchisee/customer
--      across the whole platform ──

drop policy if exists "profiles_franchisor_read" on profiles;
create policy "profiles_franchisor_read" on profiles for select
  using (get_my_role() = 'franchisor' and brand_id = get_my_brand_id());

-- ── Platform admin access -- a platform_admin has brand_id = null and
--      needs to read/write the brands table itself, plus read across
--      all brands for oversight purposes. This is intentionally the
--      ONE role allowed to bypass brand scoping, since overseeing every
--      brand is the entire point of the role. ──

alter table brands enable row level security;

drop policy if exists "brands_platform_admin_all" on brands;
create policy "brands_platform_admin_all" on brands for all
  using (get_my_role() = 'platform_admin');

drop policy if exists "brands_public_read" on brands;
create policy "brands_public_read" on brands for select
  using (is_active = true);
-- (Public read is needed so the customer app can resolve a brand's
--  name/logo/colors from its slug before the customer has logged in.)

-- ── Verification -- confirm every franchisor-facing policy was
--      successfully recreated with the brand check. Should return 23
--      rows (the policies updated above), all containing "brand_id".
-- ════════════════════════════════════════════════════════════════
select tablename, policyname, qual
from pg_policies
where schemaname = 'public'
  and policyname like '%franchisor%'
order by tablename;
