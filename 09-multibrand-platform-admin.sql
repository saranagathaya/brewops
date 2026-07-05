-- ════════════════════════════════════════════════════════════════
-- MULTI-BRAND MIGRATION -- STEP 2: Platform Admin bootstrap
--
-- Creates the one-time setup needed for the new Platform Admin role.
-- Unlike franchisor/franchisee, there is deliberately NO signup form
-- for this role anywhere in the app -- it's rare, powerful, and meant
-- to be created directly by you via SQL, once, the first time.
--
-- HOW TO USE THIS FILE:
-- 1. First, sign up as a completely normal FRANCHISOR through the
--    franchisor app's existing signup form (you'll need any valid
--    franchisor invite code -- generate one from the Outlet Network
--    page if you don't have one handy, or use an existing unused one).
-- 2. Note the email you used to sign up.
-- 3. Run the UPDATE statement below, replacing the email with yours.
--    This promotes that one account from franchisor to platform_admin.
-- 4. Log out and back in -- you'll now see the Platform Admin view
--    instead of the regular franchisor dashboard.
-- ════════════════════════════════════════════════════════════════

-- Promote an existing account to platform_admin. Replace the email
-- below with whichever account you want to use as the platform admin.
-- A platform admin has no single brand_id (they oversee all brands),
-- so this also clears brand_id to null for that account.
update profiles
set role = 'platform_admin', brand_id = null
where id = (select id from auth.users where email = 'REPLACE_WITH_YOUR_EMAIL@example.com');

-- Verify the promotion worked -- should show exactly one row with
-- role = 'platform_admin'.
select p.id, p.role, p.full_name, u.email
from profiles p
join auth.users u on u.id = p.id
where p.role = 'platform_admin';
