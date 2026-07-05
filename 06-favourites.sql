-- ════════════════════════════════════════════════════════════
-- Adds a real "My Favourites" feature — previously a fake toast
-- with no backing table at all. Customers can favourite either a
-- beverage (menu_items) or a merch product (merch_items), so this
-- mirrors the same dual-nullable-FK pattern already used by
-- order_items for the same reason (one product, two possible types).
-- ════════════════════════════════════════════════════════════

create table if not exists customer_favourites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete cascade,
  merch_item_id uuid references merch_items(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Exactly one of menu_item_id / merch_item_id must be set, same guard
-- rail as order_items_one_product_type_chk.
alter table customer_favourites drop constraint if exists customer_favourites_one_product_type_chk;
alter table customer_favourites
  add constraint customer_favourites_one_product_type_chk
  check (
    (menu_item_id is not null and merch_item_id is null)
    or (menu_item_id is null and merch_item_id is not null)
  );

-- A customer can't favourite the same item twice — keeps the list clean
-- and makes "is this already favourited" a simple existence check.
create unique index if not exists idx_customer_favourites_unique_menu
  on customer_favourites (customer_id, menu_item_id) where menu_item_id is not null;
create unique index if not exists idx_customer_favourites_unique_merch
  on customer_favourites (customer_id, merch_item_id) where merch_item_id is not null;

alter table customer_favourites enable row level security;

drop policy if exists "customer_favourites_own_rows" on customer_favourites;
create policy "customer_favourites_own_rows"
  on customer_favourites for all
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);
