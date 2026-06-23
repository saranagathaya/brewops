-- ============================================================
-- BREWOPS — LIÉTARD ARTISAN ROAST
-- Supabase Database Schema + RLS Policies + Seed Data
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ── EXTENSIONS ──
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";   -- for scheduled jobs (optional)

-- ============================================================
-- 1. OUTLETS (franchise locations)
-- ============================================================
create table if not exists outlets (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  location      text not null,
  address       text,
  lat           numeric(10,7),
  lng           numeric(10,7),
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ============================================================
-- 2. USERS (franchisor + franchisees — extends Supabase auth)
-- ============================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('franchisor','franchisee','customer')),
  full_name     text,
  phone         text,
  outlet_id     uuid references outlets(id),   -- null for franchisor/customer
  avatar_url    text,
  created_at    timestamptz default now()
);

-- ============================================================
-- 3. MENU (CMS — controlled by franchisor)
-- ============================================================
create table if not exists menu_categories (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  icon          text default '☕',
  sort_order    integer default 0,
  is_visible    boolean default true,
  created_at    timestamptz default now()
);

create table if not exists menu_items (
  id            uuid primary key default uuid_generate_v4(),
  category_id   uuid references menu_categories(id) on delete set null,
  name          text not null,
  description   text,
  emoji         text default '☕',
  image_url     text,
  base_price    integer not null,             -- in LKR cents (e.g. 55000 = LKR 550)
  original_price integer,                     -- for strikethrough
  badge_label   text,                         -- "New", "Limited", "Today Special"
  tags          text[] default '{}',
  size_options  jsonb default '["Regular","Large"]',
  temp_options  jsonb default '["Hot","Iced"]',
  milk_options  jsonb default '["Full Cream","Oat Milk","Soy Milk"]',
  sugar_options jsonb default '["No Sugar","Standard","Extra Sweet"]',
  large_upcharge integer default 8000,        -- +LKR 80 for large
  oat_upcharge   integer default 6000,        -- +LKR 60 for oat milk
  is_visible    boolean default true,
  is_featured   boolean default false,
  sort_order    integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 4. PROMO CONTENT (CMS — controlled by franchisor)
-- ============================================================
create table if not exists promo_slides (
  id            uuid primary key default uuid_generate_v4(),
  headline      text not null,
  sub_text      text,
  emoji         text default '☕',
  label_badge   text,
  price_display text,
  bg_gradient   text default 'linear-gradient(145deg,#1a0a2e,#2d1040)',
  image_url     text,
  sort_order    integer default 0,
  is_visible    boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists home_banner (
  id            uuid primary key default uuid_generate_v4(),
  headline      text not null,
  sub_text      text,
  price_display text,
  bg_gradient   text,
  image_url     text,
  is_active     boolean default true,
  updated_at    timestamptz default now()
);

-- ============================================================
-- 5. COUPONS
-- ============================================================
create table if not exists coupons (
  id              uuid primary key default uuid_generate_v4(),
  code            text not null unique,
  discount_type   text not null check (discount_type in ('percent','fixed','free')),
  discount_value  integer not null,           -- percent: 0-100, fixed: LKR cents
  min_order       integer default 0,          -- minimum order value in LKR cents
  max_uses        integer,                    -- null = unlimited
  uses_per_customer integer default 1,
  outlet_ids      uuid[],                     -- null = all outlets
  beverage_ids    uuid[],                     -- null = all beverages
  happy_hour_start time,                      -- null = all day
  happy_hour_end   time,
  valid_from      date,
  valid_until     date,
  new_customers_only boolean default false,
  is_active       boolean default true,
  total_used      integer default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists coupon_redemptions (
  id            uuid primary key default uuid_generate_v4(),
  coupon_id     uuid references coupons(id),
  order_id      uuid,                         -- references orders(id) set after insert
  customer_id   uuid references profiles(id),
  outlet_id     uuid references outlets(id),
  discount_given integer not null,            -- actual LKR cents discounted
  redeemed_at   timestamptz default now()
);

-- ============================================================
-- 6. ORDERS
-- ============================================================
create table if not exists orders (
  id              uuid primary key default uuid_generate_v4(),
  order_number    text not null unique,       -- e.g. ORD-4821
  outlet_id       uuid not null references outlets(id),
  customer_id     uuid references profiles(id),
  customer_phone  text,
  order_type      text not null check (order_type in ('pickup','delivery')),
  status          text not null default 'pending'
                  check (status in ('pending','confirmed','preparing','ready','completed','cancelled')),
  payment_method  text not null check (payment_method in ('card','cash','qr','voucher')),
  payment_status  text not null default 'pending'
                  check (payment_status in ('pending','paid','cash_confirmed','failed','refunded')),
  payment_account text,                       -- which bank account received payment
  coupon_id       uuid references coupons(id),
  subtotal        integer not null,           -- LKR cents before discount
  discount        integer default 0,          -- LKR cents discounted
  total           integer not null,           -- LKR cents final
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references orders(id) on delete cascade,
  menu_item_id  uuid references menu_items(id),
  name          text not null,                -- snapshot at time of order
  emoji         text,
  size          text default 'Regular',
  temperature   text default 'Hot',
  milk          text default 'Full Cream',
  sugar         text default 'Standard',
  quantity      integer not null default 1,
  unit_price    integer not null,             -- LKR cents
  line_total    integer not null              -- LKR cents
);

-- ============================================================
-- 7. DAILY OPS (franchisee daily data entry)
-- ============================================================
create table if not exists daily_ops (
  id              uuid primary key default uuid_generate_v4(),
  outlet_id       uuid not null references outlets(id),
  date            date not null default current_date,
  -- Consumables
  beans_used_g    integer default 0,
  milk_used_ml    integer default 0,
  water_used_l    numeric(6,2) default 0,
  electricity_kwh numeric(6,2) default 0,
  cups_used       integer default 0,
  lids_used       integer default 0,
  sleeves_used    integer default 0,
  -- Machine
  machine_cleans  integer default 0,
  machine_flushes integer default 0,
  -- Summary (updated throughout day)
  total_cups      integer default 0,
  total_revenue   integer default 0,          -- LKR cents
  unique (outlet_id, date)
);

-- ============================================================
-- 8. STOCK
-- ============================================================
create table if not exists stock (
  id            uuid primary key default uuid_generate_v4(),
  outlet_id     uuid not null references outlets(id),
  item_name     text not null,
  unit          text not null,               -- 'g', 'ml', 'L', 'units', 'kWh'
  current_qty   numeric(10,2) not null default 0,
  max_qty       numeric(10,2) not null,      -- full delivery quantity
  low_threshold numeric(10,2) not null,      -- trigger alert below this
  updated_at    timestamptz default now(),
  unique (outlet_id, item_name)
);

create table if not exists stock_requests (
  id            uuid primary key default uuid_generate_v4(),
  outlet_id     uuid not null references outlets(id),
  requested_by  uuid references profiles(id),
  items         jsonb not null,              -- [{"name":"Cup Lids","qty":500,"urgent":true}]
  urgency       text default 'normal' check (urgency in ('critical','urgent','normal')),
  notes         text,
  status        text default 'pending' check (status in ('pending','approved','dispatched','delivered')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 9. MACHINE LOGS
-- ============================================================
create table if not exists machine_logs (
  id            uuid primary key default uuid_generate_v4(),
  outlet_id     uuid not null references outlets(id),
  logged_by     uuid references profiles(id),
  event_type    text not null check (event_type in ('clean','flush','routine_service','emergency_service','issue_noticed','part_replaced')),
  notes         text,
  logged_at     timestamptz default now()
);

create table if not exists machines (
  id              uuid primary key default uuid_generate_v4(),
  outlet_id       uuid not null references outlets(id) unique,
  model           text not null,
  serial_number   text,
  last_service_at date,
  next_service_due date,
  status          text default 'ok' check (status in ('ok','due_soon','overdue','emergency')),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 10. WASTE LOGS
-- ============================================================
create table if not exists waste_logs (
  id            uuid primary key default uuid_generate_v4(),
  outlet_id     uuid not null references outlets(id),
  logged_by     uuid references profiles(id),
  item_name     text not null,
  reason        text check (reason in ('spilled','disposed','expired','quality_issue','other')),
  quantity      text not null,               -- e.g. "0.5 L" or "3 units"
  estimated_cost integer,                    -- LKR cents
  logged_at     timestamptz default now()
);

-- ============================================================
-- 11. ISSUES & COMPLAINTS
-- ============================================================
create table if not exists issues (
  id            uuid primary key default uuid_generate_v4(),
  outlet_id     uuid not null references outlets(id),
  reported_by   uuid references profiles(id),
  category      text not null,
  severity      text not null check (severity in ('high','medium','low')),
  description   text not null,
  status        text default 'open' check (status in ('open','in_progress','resolved','closed')),
  resolved_at   timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 12. FINANCE — INVOICES, RENT, SUPPLIERS
-- ============================================================
create table if not exists invoices (
  id              uuid primary key default uuid_generate_v4(),
  invoice_number  text not null unique,
  outlet_id       uuid not null references outlets(id),
  period_start    date not null,
  period_end      date not null,
  revenue_amount  integer not null,           -- LKR cents
  franchise_fee_pct numeric(5,2) default 12,
  franchise_fee   integer not null,           -- LKR cents
  total_due       integer not null,           -- LKR cents
  payment_account text,
  status          text default 'draft' check (status in ('draft','sent','paid','overdue')),
  notes           text,
  created_at      timestamptz default now(),
  paid_at         timestamptz
);

create table if not exists rent_schedules (
  id              uuid primary key default uuid_generate_v4(),
  outlet_id       uuid not null references outlets(id) unique,
  monthly_amount  integer not null,           -- LKR cents
  due_day         integer default 1,          -- day of month
  last_paid_at    date,
  next_due_at     date,
  status          text default 'current' check (status in ('current','due_soon','overdue'))
);

create table if not exists suppliers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  contact       text,
  email         text,
  notes         text,
  created_at    timestamptz default now()
);

create table if not exists supplier_payments (
  id            uuid primary key default uuid_generate_v4(),
  supplier_id   uuid not null references suppliers(id),
  amount        integer not null,             -- LKR cents
  description   text,
  due_date      date,
  paid_at       timestamptz,
  status        text default 'pending' check (status in ('pending','paid','overdue')),
  created_at    timestamptz default now()
);

-- ============================================================
-- 13. APP SETTINGS (CMS global config)
-- ============================================================
create table if not exists app_settings (
  key           text primary key,
  value         text not null,
  updated_at    timestamptz default now()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to relevant tables
do $$ 
declare t text;
begin
  foreach t in array array['menu_items','promo_slides','home_banner','coupons','orders','stock','stock_requests','machines','issues','invoices','app_settings']
  loop
    execute format('
      drop trigger if exists trg_%I_updated_at on %I;
      create trigger trg_%I_updated_at before update on %I
        for each row execute function update_updated_at();
    ', t, t, t, t);
  end loop;
end $$;

-- Auto-generate order number
create or replace function generate_order_number()
returns trigger as $$
declare
  next_num integer;
begin
  select coalesce(max(cast(substring(order_number from 5) as integer)), 4800) + 1
  into next_num
  from orders;
  new.order_number = 'ORD-' || next_num;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_number on orders;
create trigger trg_orders_number before insert on orders
  for each row when (new.order_number is null or new.order_number = '')
  execute function generate_order_number();

-- Auto-update daily_ops totals when order completed
create or replace function update_daily_ops()
returns trigger as $$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    insert into daily_ops (outlet_id, date, total_cups, total_revenue)
    values (
      new.outlet_id,
      current_date,
      (select sum(quantity) from order_items where order_id = new.id),
      new.total
    )
    on conflict (outlet_id, date) do update set
      total_cups    = daily_ops.total_cups + excluded.total_cups,
      total_revenue = daily_ops.total_revenue + excluded.total_revenue;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_daily_ops on orders;
create trigger trg_orders_daily_ops after update on orders
  for each row execute function update_daily_ops();

-- Auto-update coupon total_used
create or replace function update_coupon_usage()
returns trigger as $$
begin
  update coupons set total_used = total_used + 1 where id = new.coupon_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_coupon_redemptions on coupon_redemptions;
create trigger trg_coupon_redemptions after insert on coupon_redemptions
  for each row execute function update_coupon_usage();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
do $$ 
declare t text;
begin
  foreach t in array array[
    'outlets','profiles','menu_categories','menu_items',
    'promo_slides','home_banner','coupons','coupon_redemptions',
    'orders','order_items','daily_ops','stock','stock_requests',
    'machine_logs','machines','waste_logs','issues',
    'invoices','rent_schedules','suppliers','supplier_payments','app_settings'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ── HELPER: get current user role ──
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer;

-- ── HELPER: get current user outlet_id ──
create or replace function get_my_outlet()
returns uuid as $$
  select outlet_id from profiles where id = auth.uid();
$$ language sql security definer;

-- ── OUTLETS ──
create policy "outlets_public_read" on outlets for select using (true);
create policy "outlets_franchisor_all" on outlets for all using (get_my_role() = 'franchisor');

-- ── PROFILES ──
create policy "profiles_own_read" on profiles for select using (id = auth.uid());
create policy "profiles_franchisor_read" on profiles for select using (get_my_role() = 'franchisor');
create policy "profiles_own_update" on profiles for update using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());

-- ── MENU (public read, franchisor write) ──
create policy "menu_categories_public_read" on menu_categories for select using (true);
create policy "menu_categories_franchisor_write" on menu_categories for all using (get_my_role() = 'franchisor');
create policy "menu_items_public_read" on menu_items for select using (is_visible = true);
create policy "menu_items_franchisor_all" on menu_items for all using (get_my_role() = 'franchisor');

-- ── PROMO & CMS (public read, franchisor write) ──
create policy "promo_slides_public_read" on promo_slides for select using (is_visible = true);
create policy "promo_slides_franchisor_all" on promo_slides for all using (get_my_role() = 'franchisor');
create policy "home_banner_public_read" on home_banner for select using (is_active = true);
create policy "home_banner_franchisor_all" on home_banner for all using (get_my_role() = 'franchisor');

-- ── COUPONS (public read active, franchisor write) ──
create policy "coupons_public_read" on coupons for select using (is_active = true);
create policy "coupons_franchisor_all" on coupons for all using (get_my_role() = 'franchisor');

-- ── ORDERS ──
create policy "orders_customer_own" on orders for select using (customer_id = auth.uid());
create policy "orders_customer_insert" on orders for insert with check (true); -- anon customers can order
create policy "orders_franchisee_outlet" on orders for select using (outlet_id = get_my_outlet());
create policy "orders_franchisee_update" on orders for update using (outlet_id = get_my_outlet());
create policy "orders_franchisor_all" on orders for all using (get_my_role() = 'franchisor');

create policy "order_items_customer_own" on order_items for select 
  using (order_id in (select id from orders where customer_id = auth.uid()));
create policy "order_items_insert" on order_items for insert with check (true);
create policy "order_items_franchisee_read" on order_items for select 
  using (order_id in (select id from orders where outlet_id = get_my_outlet()));
create policy "order_items_franchisor_all" on order_items for all using (get_my_role() = 'franchisor');

-- ── DAILY OPS (franchisee own outlet, franchisor all) ──
create policy "daily_ops_franchisee_own" on daily_ops for all using (outlet_id = get_my_outlet());
create policy "daily_ops_franchisor_all" on daily_ops for all using (get_my_role() = 'franchisor');

-- ── STOCK ──
create policy "stock_franchisee_own" on stock for all using (outlet_id = get_my_outlet());
create policy "stock_franchisor_all" on stock for all using (get_my_role() = 'franchisor');
create policy "stock_requests_franchisee" on stock_requests for all using (outlet_id = get_my_outlet());
create policy "stock_requests_franchisor" on stock_requests for all using (get_my_role() = 'franchisor');

-- ── MACHINE LOGS ──
create policy "machine_logs_franchisee" on machine_logs for all using (outlet_id = get_my_outlet());
create policy "machine_logs_franchisor" on machine_logs for all using (get_my_role() = 'franchisor');
create policy "machines_franchisee" on machines for select using (outlet_id = get_my_outlet());
create policy "machines_franchisor" on machines for all using (get_my_role() = 'franchisor');

-- ── WASTE ──
create policy "waste_franchisee" on waste_logs for all using (outlet_id = get_my_outlet());
create policy "waste_franchisor" on waste_logs for all using (get_my_role() = 'franchisor');

-- ── ISSUES ──
create policy "issues_franchisee" on issues for all using (outlet_id = get_my_outlet());
create policy "issues_franchisor" on issues for all using (get_my_role() = 'franchisor');

-- ── FINANCE (franchisor only) ──
create policy "invoices_franchisee_read" on invoices for select using (outlet_id = get_my_outlet());
create policy "invoices_franchisor_all" on invoices for all using (get_my_role() = 'franchisor');
create policy "rent_franchisee_read" on rent_schedules for select using (outlet_id = get_my_outlet());
create policy "rent_franchisor_all" on rent_schedules for all using (get_my_role() = 'franchisor');
create policy "suppliers_franchisor" on suppliers for all using (get_my_role() = 'franchisor');
create policy "supplier_payments_franchisor" on supplier_payments for all using (get_my_role() = 'franchisor');

-- ── APP SETTINGS ──
create policy "app_settings_public_read" on app_settings for select using (true);
create policy "app_settings_franchisor_write" on app_settings for all using (get_my_role() = 'franchisor');

-- ── COUPON REDEMPTIONS ──
create policy "coupon_redemptions_insert" on coupon_redemptions for insert with check (true);
create policy "coupon_redemptions_franchisor" on coupon_redemptions for all using (get_my_role() = 'franchisor');

-- ============================================================
-- REALTIME (enable for live order sync across apps)
-- ============================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table daily_ops;
alter publication supabase_realtime add table stock;
alter publication supabase_realtime add table menu_items;
alter publication supabase_realtime add table promo_slides;
alter publication supabase_realtime add table coupons;
alter publication supabase_realtime add table machine_logs;
alter publication supabase_realtime add table issues;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Outlets
insert into outlets (id, name, location, address, lat, lng) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Colombo 01', 'Pettah', 'Main Street, Pettah, Colombo 01', 6.9352, 79.8479),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Colombo 03', 'Colpetty', 'Galle Road, Colpetty, Colombo 03', 6.8918, 79.8548),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'Kandy', 'City Centre', 'Dalada Veediya, Kandy', 7.2906, 80.6337),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'Galle', 'Fort', 'Church Street, Galle Fort', 6.0329, 80.2168),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'Negombo', 'Beach Road', 'Lewis Place, Negombo', 7.2008, 79.8358),
  ('a1b2c3d4-0006-0006-0006-000000000006', 'Nugegoda', 'High Street', 'High Level Road, Nugegoda', 6.8728, 79.8880)
on conflict (id) do nothing;

-- Menu Categories
insert into menu_categories (id, name, icon, sort_order) values
  ('c0000001-0000-0000-0000-000000000001', 'Today''s Specials', '🔥', 1),
  ('c0000001-0000-0000-0000-000000000002', 'New Arrivals', '🌿', 2),
  ('c0000001-0000-0000-0000-000000000003', 'Classic Coffee', '☕', 3),
  ('c0000001-0000-0000-0000-000000000004', 'Iced Beverages', '🧊', 4),
  ('c0000001-0000-0000-0000-000000000005', 'Tea & Others', '🫖', 5)
on conflict (id) do nothing;

-- Menu Items (prices in LKR cents)
insert into menu_items (id, category_id, name, description, emoji, base_price, original_price, badge_label, tags, is_featured) values
  ('m0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Flat White', 'Velvety microfoam poured over a double ristretto. Our most beloved drink.', '☕', 55000, 70000, 'Today Special', '{"Signature","Hot/Iced","Full Cream"}', true),
  ('m0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Cold Brew', '12-hour slow-steeped cold brew. Naturally sweet, smooth body, zero bitterness.', '🧋', 49000, 65000, 'Limited', '{"Cold","12h Brew","Bold"}', true),
  ('m0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Espresso', 'A single or double shot of Ceylon single-origin espresso. Bright acidity, chocolate finish.', '⚡', 35000, 45000, null, '{"Short","Intense","Classic"}', false),
  ('m0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 'Oat Milk Latte', 'Our classic latte made with locally sourced oat milk. Naturally sweet, silky smooth.', '🥛', 62000, null, 'New', '{"Plant-Based","Creamy","New"}', true),
  ('m0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000002', 'Spiced Ceylon Latte', 'Ceylon cinnamon and cardamom infused into a creamy latte.', '🫚', 58000, null, 'New', '{"Spiced","Warm","Seasonal"}', false),
  ('m0000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000003', 'Latte', 'Espresso with steamed milk and a light layer of foam. Perfectly balanced.', '🍵', 52000, null, null, '{"Smooth","Creamy","Hot/Iced"}', false),
  ('m0000001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000003', 'Cappuccino', 'Equal parts espresso, steamed milk and thick foam. A timeless Italian classic.', '🫧', 50000, null, null, '{"Frothy","Classic","Hot"}', false),
  ('m0000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000003', 'Long Black', 'Double espresso poured over hot water. Clean, strong, and complex.', '☕', 42000, null, null, '{"Bold","Black","Hot/Iced"}', false),
  ('m0000001-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000004', 'Iced Latte', 'Our classic latte chilled over ice. Perfect for a hot Sri Lankan afternoon.', '🥤', 56000, null, null, '{"Cold","Smooth","Refreshing"}', false),
  ('m0000001-0000-0000-0000-000000000010', 'c0000001-0000-0000-0000-000000000004', 'Iced Cold Brew', 'Our cold brew served over a generous pour of ice. Bold and refreshing.', '🧋', 52000, null, null, '{"Cold","12h Brew","Strong"}', false),
  ('m0000001-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000005', 'Ceylon Tea Latte', 'Sri Lanka''s finest black tea with steamed milk. A local favourite reimagined.', '🫖', 48000, null, null, '{"Tea","Creamy","Local"}', false),
  ('m0000001-0000-0000-0000-000000000012', 'c0000001-0000-0000-0000-000000000005', 'Mint Tea', 'Fresh mint steeped in hot water. Clean, bright, and calming.', '🌿', 35000, null, null, '{"Herbal","Refreshing","No Caffeine"}', false)
on conflict (id) do nothing;

-- Promo Slides
insert into promo_slides (id, headline, sub_text, emoji, label_badge, price_display, bg_gradient, sort_order) values
  ('ps000001-0000-0000-0000-000000000001', 'Craft Coffee, Island Soul.', 'Ceylon-grown single origin beans, roasted fresh every morning.', '🫖', '☕ New Season Special', 'LKR 350', 'linear-gradient(145deg,#1a0a2e,#2d1040)', 1),
  ('ps000001-0000-0000-0000-000000000002', 'Cold Brew Season is Here.', '12-hour slow-steeped cold brew. Smooth, bold, refreshing.', '🧋', '🌿 Limited Offer — Weekdays', 'LKR 490', 'linear-gradient(145deg,#0d2a0f,#1a4015)', 2),
  ('ps000001-0000-0000-0000-000000000003', 'Our Famous Flat White.', 'Velvety microfoam over a double ristretto. #1 in Sri Lanka.', '☕', '☕ Signature Blend', 'LKR 550', 'linear-gradient(145deg,#2a1a08,#40280d)', 3)
on conflict (id) do nothing;

-- Home Banner
insert into home_banner (id, headline, sub_text, price_display, bg_gradient) values
  ('hb000001-0000-0000-0000-000000000001', 'Weekday Special — Flat White & Cold Brew', 'Fresh roasted Ceylon single origin', 'LKR 350', 'linear-gradient(90deg,#0d2040,#1a3060)')
on conflict (id) do nothing;

-- Coupons
insert into coupons (id, code, discount_type, discount_value, max_uses, uses_per_customer, valid_from, valid_until, is_active) values
  ('cp000001-0000-0000-0000-000000000001', 'BREW20', 'percent', 20, null, 1, current_date, null, true),
  ('cp000001-0000-0000-0000-000000000002', 'FLAT15', 'fixed', 15000, 200, 1, current_date, '2024-06-30', true),
  ('cp000001-0000-0000-0000-000000000003', 'WELCOME', 'free', 0, null, 1, current_date, null, true),
  ('cp000001-0000-0000-0000-000000000004', 'HAPPY10', 'percent', 10, null, 1, current_date, null, true)
on conflict (id) do nothing;

-- App Settings
insert into app_settings (key, value) values
  ('app_name', 'Liétard Artisan Roast'),
  ('app_tagline', 'Artisan Roast Coffee'),
  ('brand_color', '#8B1A1A'),
  ('accent_color', '#C8922A'),
  ('welcome_message', 'Good coffee starts with good beans. Welcome to Liétard Artisan Roast — Sri Lanka''s finest specialty coffee.'),
  ('default_order_mode', 'pickup'),
  ('delivery_radius_km', '5'),
  ('payment_card', 'true'),
  ('payment_cash', 'true'),
  ('payment_qr', 'true'),
  ('payment_voucher', 'false'),
  ('notify_new_orders', 'true'),
  ('notify_cash_confirm', 'true'),
  ('notify_order_ready', 'true')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Machines
insert into machines (outlet_id, model, serial_number, last_service_at, next_service_due, status) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Jura X10', 'JX10-2301-0041', '2024-05-02', '2024-08-02', 'ok'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Jura X10', 'JX10-2302-0047', '2024-04-15', '2024-07-15', 'due_soon'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'Jura Z10', 'JZ10-2306-0023', '2024-02-12', '2024-05-25', 'overdue'),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'Jura X8',  'JX08-2309-0019', '2024-03-02', '2024-06-11', 'due_soon'),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'Jura X10', 'JX10-2311-0031', '2024-05-20', '2024-08-20', 'ok'),
  ('a1b2c3d4-0006-0006-0006-000000000006', 'Jura Z10', 'JZ10-2402-0058', '2024-04-28', '2024-07-28', 'ok')
on conflict (outlet_id) do nothing;

-- Rent Schedules
insert into rent_schedules (outlet_id, monthly_amount, due_day, last_paid_at, next_due_at, status) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 8500000, 15, '2024-05-15', '2024-06-15', 'due_soon'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 9200000, 28, '2024-05-28', '2024-06-28', 'current'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 6200000, 20, '2024-05-20', '2024-06-20', 'due_soon'),
  ('a1b2c3d4-0004-0004-0004-000000000004', 4800000, 30, '2024-05-30', '2024-06-30', 'current'),
  ('a1b2c3d4-0005-0005-0005-000000000005', 5500000, 5,  '2024-06-05', '2024-07-05', 'current'),
  ('a1b2c3d4-0006-0006-0006-000000000006', 7100000, 10, '2024-06-10', '2024-07-10', 'current')
on conflict (outlet_id) do nothing;

-- Suppliers
insert into suppliers (id, name, contact, email) values
  ('sp000001-0000-0000-0000-000000000001', 'Malwatta Coffee Beans', '+94 77 123 4567', 'orders@malwatta.lk'),
  ('sp000001-0000-0000-0000-000000000002', 'Keells Milk Supply', '+94 11 234 5678', 'supply@keells.lk'),
  ('sp000001-0000-0000-0000-000000000003', 'Packaging Co. (Cups)', '+94 11 345 6789', 'info@packagingco.lk')
on conflict (id) do nothing;

-- Stock (Colombo 03 - Colpetty as example)
insert into stock (outlet_id, item_name, unit, current_qty, max_qty, low_threshold) values
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Coffee Beans', 'g', 1200, 2000, 400),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Milk', 'L', 6.8, 10, 2),
  ('a1b2c3d4-0002-0002-0002-000000000002', '10oz Cups', 'units', 310, 500, 100),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Cup Lids', 'units', 190, 500, 100),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Cup Sleeves', 'units', 420, 500, 100),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Water', 'L', 14.2, 20, 4)
on conflict (outlet_id, item_name) do nothing;

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Live outlet health overview (used by franchisor dashboard)
create or replace view outlet_health as
select
  o.id,
  o.name,
  o.location,
  coalesce(d.total_cups, 0)    as cups_today,
  coalesce(d.total_revenue, 0) as revenue_today,
  coalesce(d.machine_cleans, 0) as cleans_today,
  coalesce(d.machine_flushes, 0) as flushes_today,
  m.status                     as machine_status,
  m.next_service_due,
  r.status                     as rent_status,
  r.next_due_at                as rent_due,
  r.monthly_amount,
  (
    select count(*) from orders ord
    where ord.outlet_id = o.id
    and ord.status not in ('completed','cancelled')
  )                            as live_orders
from outlets o
left join daily_ops d on d.outlet_id = o.id and d.date = current_date
left join machines m on m.outlet_id = o.id
left join rent_schedules r on r.outlet_id = o.id
where o.is_active = true;

-- Network revenue summary
create or replace view network_revenue as
select
  sum(total_revenue) as total_today,
  sum(total_cups)    as cups_today,
  count(distinct outlet_id) as active_outlets
from daily_ops
where date = current_date;

grant select on outlet_health to authenticated;
grant select on network_revenue to authenticated;

-- ============================================================
-- DONE
-- ============================================================
-- Run the JS setup files in each app using:
-- SUPABASE_URL = your project URL from Settings > API
-- SUPABASE_ANON_KEY = your anon key from Settings > API
-- ============================================================
