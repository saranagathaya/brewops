-- ════════════════════════════════════════════════════════════════
-- Fixes two confirmed cross-brand data isolation bugs found while
-- building a scripted RLS regression check (tools/rls-check):
--
-- 1. `orders` had zero real brand/outlet isolation for franchisor and
--    franchisee roles. Two policies checked role membership only,
--    with no brand or outlet condition, so Postgres OR'd them together
--    with the correctly-scoped policies and won out as the least
--    restrictive: ANY franchisor/franchisee account, from ANY brand,
--    could read (and insert into) every order in the system —
--    customer phone numbers, delivery addresses, payment methods,
--    totals, all of it. Verified live: a testbrand-coffee-co
--    franchisor account could read real Lietard order records.
--
--    These two policies are also fully redundant once removed:
--    - orders_franchisor_all already grants franchisors full access,
--      correctly scoped to their own brand.
--    - orders_franchisee_outlet already grants franchisees SELECT,
--      correctly scoped to their own outlet.
--    - orders_anon_insert already allows guest/walk-in checkout
--      inserts for anon+authenticated with no extra restriction,
--      so removing the insert-side policy below doesn't remove any
--      real capability (e.g. the franchisee app's walk-in-sale flow
--      goes through orders_anon_insert, not the policy being dropped).
--
-- 2. `outlet_health` and `network_revenue` are views owned by the
--    `postgres` role. Postgres views run against their underlying
--    tables using the OWNER's privileges by default, and `postgres`
--    bypasses RLS entirely — so both views exposed every brand's
--    outlet health / revenue data to any authenticated user,
--    regardless of role or brand, regardless of what the underlying
--    table policies said. Verified live: a testbrand-coffee-co
--    franchisee could read Lietard's real outlet names and machine
--    status through outlet_health. `security_invoker` (Postgres 15+;
--    Supabase runs 17) makes a view re-check RLS as the querying
--    user instead of the owner.
--
-- Note: `outlet_health` also joins `outlets` and `daily_ops`, both of
-- which have their own `using (true)` read policies with no brand
-- filter (a separate, lower-severity design point — see the
-- tools/rls-check README/report for details). This migration does not
-- touch those; it only removes the view-ownership bypass.
--
-- `13-multibrand-views.sql` was also retroactively updated to create
-- both views `with (security_invoker = true)` directly, since that file
-- does `drop view / create view` for both -- without that update,
-- re-running 13 in the future (disaster recovery, a fresh environment)
-- would silently recreate the views without this fix. The `alter view`
-- statements below are still needed for the live database this was
-- fixed on (which already had the views from before 13 was updated) and
-- remain a harmless no-op if run again after 13's version applies.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "orders_customer_own_authenticated" on orders;
drop policy if exists "orders_customer_insert_authenticated" on orders;

alter view outlet_health set (security_invoker = on);
alter view network_revenue set (security_invoker = on);
