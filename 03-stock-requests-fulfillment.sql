-- ════════════════════════════════════════════════════════════
-- Adds delivery/fulfillment tracking to stock_requests so the
-- franchisee app's "Cycle Summary" can show REAL delivery dates
-- instead of hardcoded demo dates.
--
-- Safe to run multiple times (uses IF NOT EXISTS / coalesce).
-- ════════════════════════════════════════════════════════════

-- 1. Add fulfilled_at — the real timestamp a delivery was marked received.
--    (created_at already exists and represents when the REQUEST was made,
--     not when it was fulfilled — these are different events.)
alter table stock_requests
  add column if not exists fulfilled_at timestamp with time zone;

-- 2. Backfill: any existing request with no status set becomes 'pending'
--    so the franchisor's new Stock Requests screen has a clean starting state.
update stock_requests
  set status = 'pending'
  where status is null;

-- 3. Going forward, default new requests to 'pending' automatically
--    (the franchisee app's insert doesn't set status explicitly today).
alter table stock_requests
  alter column status set default 'pending';

-- 4. Helpful index since the franchisor screen will filter by outlet + status,
--    and the franchisee Cycle Summary will look up the most recent fulfilled
--    request per outlet.
create index if not exists idx_stock_requests_outlet_status
  on stock_requests (outlet_id, status, fulfilled_at desc);
