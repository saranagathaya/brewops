-- ════════════════════════════════════════════════════════════
-- Adds:
-- 1. Saved customer addresses (multiple per customer, pick one
--    at checkout) — closes the existing "Address Manager" Me-tab
--    placeholder that only ever showed a "Coming soon" toast.
-- 2. A real delivery address snapshot on orders, since orders
--    currently has NO address field at all despite order_type
--    already supporting 'delivery'.
-- ════════════════════════════════════════════════════════════

-- 1. Saved addresses
create table if not exists customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  label text default 'Home',              -- e.g. "Home", "Work", "Other"
  address_line text not null,
  city text,
  notes text,                              -- e.g. gate code, landmark
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists idx_customer_addresses_customer
  on customer_addresses (customer_id);

alter table customer_addresses enable row level security;

-- Customers can only ever see/manage their own saved addresses.
drop policy if exists "customer_addresses_own_rows" on customer_addresses;
create policy "customer_addresses_own_rows"
  on customer_addresses for all
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

-- 2. orders needs an address snapshot — stored as text on the order itself
--    (not just a FK to customer_addresses) so the delivery address is
--    preserved exactly as it was at order time, even if the customer
--    later edits or deletes the saved address it came from.
alter table orders
  add column if not exists delivery_address_text text;

-- 3. profiles: full_name/phone already exist and are already editable
--    via the existing signup flow — no new columns needed there. The
--    Me tab settings page (customer app) reuses these two columns.
