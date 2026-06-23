-- ============================================================
-- FIX: invoices table is missing the updated_at column that
-- its own trigger (trg_invoices_updated_at) tries to write to.
-- This was a gap in the original schema setup, not something
-- introduced later — every UPDATE on invoices was failing.
-- ============================================================

alter table invoices add column if not exists updated_at timestamptz default now();

-- Verify
select column_name from information_schema.columns
where table_name = 'invoices' and table_schema = 'public'
order by ordinal_position;
