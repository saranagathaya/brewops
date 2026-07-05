-- ════════════════════════════════════════════════════════════════
-- MULTI-BRAND MIGRATION -- STEP 6 (final): View rewrites + invite
-- code / list-query audit fixes
--
-- Two views (outlet_health, network_revenue) were built before
-- multi-brand and have no brand awareness at all:
--
-- outlet_health: joins through outlets but never selects/exposes
--   brand_id, so the app can't filter it per-brand even though the
--   franchisor app needs to. Rebuilt to include brand_id directly.
--
-- network_revenue: aggregates ALL of daily_ops with ZERO grouping by
--   outlet or brand -- this currently returns one combined number
--   representing every brand's revenue mixed together. Confirmed via
--   code search that nothing in any of the three apps actually
--   queries this view at all -- it's dead, leftover scaffolding from
--   before Network Insights was rebuilt with real per-outlet queries.
--   Rebuilt with proper brand grouping so it's safe if anything ever
--   does query it.
-- ════════════════════════════════════════════════════════════════

drop view if exists outlet_health;
create view outlet_health as
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
          WHERE ord.outlet_id = o.id AND (ord.status <> ALL (ARRAY['completed'::text, 'cancelled'::text]))) AS live_orders
   FROM outlets o
     LEFT JOIN daily_ops d ON d.outlet_id = o.id AND d.date = CURRENT_DATE
     LEFT JOIN machines m ON m.outlet_id = o.id
     LEFT JOIN rent_schedules r ON r.outlet_id = o.id
  WHERE o.is_active = true;

drop view if exists network_revenue;
create view network_revenue as
SELECT
    o.brand_id,
    sum(d.total_revenue) AS total_today,
    sum(d.total_cups) AS cups_today,
    count(DISTINCT d.outlet_id) AS active_outlets
   FROM daily_ops d
   JOIN outlets o ON o.id = d.outlet_id
  WHERE d.date = CURRENT_DATE
  GROUP BY o.brand_id;

-- Verification -- confirm both views now expose brand_id (or group by
-- it) and can be filtered per-brand.
select 'outlet_health' as view_name, count(*) as row_count, count(distinct brand_id) as distinct_brands
from outlet_health
union all
select 'network_revenue', count(*), count(distinct brand_id)
from network_revenue;
