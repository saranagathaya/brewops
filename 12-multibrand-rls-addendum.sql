-- ════════════════════════════════════════════════════════════════
-- STEP 4 ADDENDUM -- fixes found during the exhaustive post-launch
-- recheck, after testing the full flow against a real second brand
-- (TestBrand Coffee Co.). None of these are multi-brand-specific --
-- they're gaps that existed before today but had never actually been
-- exercised by a real write attempt until this walkthrough forced one.
-- ════════════════════════════════════════════════════════════════

-- 1. profiles_role_check never included 'platform_admin' -- the role
--    didn't even exist as a permitted value until this fix.
--    (Already applied earlier today -- included here for a complete
--    single record of every fix from this session.)
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
  add constraint profiles_role_check
  check (role = ANY (ARRAY['franchisor'::text, 'franchisee'::text, 'customer'::text, 'platform_admin'::text]));

-- 2. invite_codes had no policy letting platform_admin insert/manage
--    codes at all -- only regular franchisors could.
--    (Already applied earlier today.)
drop policy if exists "invite_codes_platform_admin_all" on invite_codes;
create policy "invite_codes_platform_admin_all"
  on invite_codes for all
  using (get_my_role() = 'platform_admin');

-- 3. brands had no UPDATE policy for a regular franchisor to edit
--    their own brand's name/logo/colors -- only platform_admin could
--    write to this table at all, despite the Brand Settings page
--    being built specifically for franchisors to use.
--    (Already applied earlier today.)
drop policy if exists "brands_franchisor_own_update" on brands;
create policy "brands_franchisor_own_update"
  on brands for update
  using (get_my_role() = 'franchisor' and id = get_my_brand_id());

-- 4. NEW FIX (found during this exhaustive constraint sweep):
--    stock_requests_status_check never permitted 'fulfilled', despite
--    both the franchisor app's fulfillStockRequest() and the
--    franchisee app's Cycle Summary code consistently writing/reading
--    that exact value. This predates today's multi-brand work --
--    it's a pre-existing schema/app mismatch that simply never
--    actually executed until a real stock request was fulfilled.
alter table stock_requests drop constraint if exists stock_requests_status_check;
alter table stock_requests
  add constraint stock_requests_status_check
  check (status = ANY (ARRAY['pending'::text, 'approved'::text, 'dispatched'::text, 'delivered'::text, 'fulfilled'::text]));

-- Verification: confirm all four fixes are in place.
select 'profiles_role_check' as check_name, pg_get_constraintdef(oid) as definition
from pg_constraint where conname = 'profiles_role_check'
union all
select 'stock_requests_status_check', pg_get_constraintdef(oid)
from pg_constraint where conname = 'stock_requests_status_check';

select policyname, cmd from pg_policies where tablename = 'invite_codes' and policyname like '%platform_admin%';
select policyname, cmd from pg_policies where tablename = 'brands' and policyname like '%franchisor%';
