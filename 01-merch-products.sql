-- ════════════════════════════════════════════════════════════
-- Adds support for non-beverage retail products (coffee beans,
-- souvenirs, merchandise) — a separate product line from the
-- customizable beverage menu (menu_items/menu_categories).
--
-- Kept as its own table rather than extending menu_items because
-- merch has no size/temp/milk/sugar options and shouldn't carry
-- those meaningless columns. order_items gets a second nullable
-- FK so existing beverage orders are untouched.
-- ════════════════════════════════════════════════════════════

-- 1. Categories for merch (e.g. "Coffee Beans", "Souvenirs")
create table if not exists merch_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '🛍️',
  sort_order integer default 0,
  is_visible boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. The actual products
create table if not exists merch_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references merch_categories(id) on delete set null,
  name text not null,
  description text,
  emoji text default '🛍️',
  image_url text,
  base_price integer not null default 0,      -- stored in cents, same convention as menu_items
  original_price integer,                      -- for showing a strikethrough discount price
  badge_label text,
  stock_qty integer not null default 0,        -- real inventory count; out-of-stock when 0
  is_visible boolean default true,
  is_featured boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. order_items needs a second, nullable product reference.
--    menu_item_id stays as-is (and becomes nullable if it wasn't already,
--    since a merch-only order line has no menu item).
alter table order_items
  add column if not exists merch_item_id uuid references merch_items(id);

alter table order_items
  alter column menu_item_id drop not null;

-- Guard rail: exactly one of menu_item_id / merch_item_id must be set,
-- never both, never neither — keeps reporting unambiguous.
alter table order_items drop constraint if exists order_items_one_product_type_chk;
alter table order_items
  add constraint order_items_one_product_type_chk
  check (
    (menu_item_id is not null and merch_item_id is null)
    or (menu_item_id is null and merch_item_id is not null)
  );

-- 4. RLS — mirror whatever menu_items/menu_categories already allow,
--    since merch is just as public-readable as the beverage menu.
alter table merch_categories enable row level security;
alter table merch_items enable row level security;

drop policy if exists "merch_categories_public_read" on merch_categories;
create policy "merch_categories_public_read"
  on merch_categories for select
  using (is_visible = true);

drop policy if exists "merch_items_public_read" on merch_items;
create policy "merch_items_public_read"
  on merch_items for select
  using (is_visible = true);

-- Franchisor write access — mirrors the real policy already used by
-- menu_items (menu_items_franchisor_all), confirmed via pg_policies.
drop policy if exists "merch_categories_franchisor_all" on merch_categories;
create policy "merch_categories_franchisor_all"
  on merch_categories for all
  using (get_my_role() = 'franchisor');

drop policy if exists "merch_items_franchisor_all" on merch_items;
create policy "merch_items_franchisor_all"
  on merch_items for all
  using (get_my_role() = 'franchisor');

-- 5. Storage: merch photos reuse the existing brewops-images bucket
--    under a merch/ prefix — no new bucket needed.

-- 6. Atomic stock decrement — called once per cart line at checkout time
--    (see submitOrderToSupabase in the customer app). Using a single
--    UPDATE ... WHERE stock_qty >= qty makes this safe under concurrent
--    purchases: two customers buying the last bag simultaneously can't
--    both succeed, since the WHERE clause re-checks current stock at
--    the moment of the update, not at the moment the cart was built.
create or replace function decrement_merch_stock(p_item_id uuid, p_qty integer)
returns boolean
language plpgsql
security definer
as $$
declare
  rows_updated integer;
begin
  update merch_items
    set stock_qty = stock_qty - p_qty, updated_at = now()
    where id = p_item_id and stock_qty >= p_qty;
  get diagnostics rows_updated = row_count;
  return rows_updated > 0;
end;
$$;
