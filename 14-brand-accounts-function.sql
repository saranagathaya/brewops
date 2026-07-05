-- ════════════════════════════════════════════════════════════════
-- Adds a SECURITY DEFINER function that lets the platform_admin
-- view account details (email, role, name, outlet) for every user
-- belonging to a specific brand -- without exposing auth.users
-- directly to the client, which Supabase's anon key cannot access.
--
-- This solves the real operational problem of losing track of which
-- email address belongs to which brand's franchisor/franchisee
-- accounts, surfaced when the brand owner couldn't remember their
-- TestBrand franchisor login.
-- ════════════════════════════════════════════════════════════════

drop function if exists get_brand_accounts(uuid);

create or replace function get_brand_accounts(p_brand_id uuid)
returns table (
  user_id uuid,
  role text,
  full_name text,
  email text,
  outlet_name text
)
language sql
security definer
as $$
  select
    p.id as user_id,
    p.role,
    p.full_name,
    u.email,
    o.name as outlet_name
  from profiles p
  join auth.users u on u.id = p.id
  left join outlets o on o.id = p.outlet_id
  where p.brand_id = p_brand_id
  order by p.role, p.full_name;
$$;

-- Verify it works -- should return the accounts for your existing brands.
-- Replace with your actual brand id if needed, or use the slug lookup:
select * from get_brand_accounts(
  (select id from brands where slug = 'lietard')
);
