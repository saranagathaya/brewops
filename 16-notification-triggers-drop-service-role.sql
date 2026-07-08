-- ════════════════════════════════════════════════════════════════
-- Remove the privileged service_role key from the 3 notification
-- triggers (invoice-sent-alert, machine-status-alert, rent-overdue-alert).
--
-- The send-notification edge function has "Verify JWT with legacy secret"
-- turned ON, which the ANON key satisfies (confirmed in the function's
-- Settings). The service_role key was never required — it just needs any
-- valid legacy JWT. Swapping to the anon JWT takes the RLS-bypassing
-- service_role key out of the database entirely.
--
-- The anon key below is public by design (it already ships in all three
-- client apps and this repo), so it being in the trigger DDL is not an
-- exposure. If rebuilding on a different Supabase project, replace it with
-- that project's own anon/publishable key.
--
-- Why hardcoded and not read from Vault: a trigger's EXECUTE FUNCTION
-- arguments must be literal constants, so a vault.decrypted_secrets lookup
-- is not possible here. supabase_functions.http_request is async (pg_net),
-- so this never blocks the triggering insert/update.
--
-- After this runs, nothing in the database references the legacy
-- service_role key. Fully invalidating the previously-exposed key string
-- still requires migrating off the legacy keys and disabling them in the
-- dashboard (a separate follow-up) — this migration is the in-database half.
-- ════════════════════════════════════════════════════════════════

drop trigger if exists "invoice-sent-alert" on public.invoices;
create trigger "invoice-sent-alert" after insert or update on public.invoices
  for each row execute function supabase_functions.http_request(
    'https://fjmzsxslnzrtgcilttly.supabase.co/functions/v1/send-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbXpzeHNsbnpydGdjaWx0dGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMjU4OTksImV4cCI6MjA5NjkwMTg5OX0.F56god4wqLUCgP1lCVTLZCK9aII4Vo_4g4fJcPAFfFc"}', '{}', '5000');

drop trigger if exists "machine-status-alert" on public.machines;
create trigger "machine-status-alert" after update on public.machines
  for each row execute function supabase_functions.http_request(
    'https://fjmzsxslnzrtgcilttly.supabase.co/functions/v1/send-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbXpzeHNsbnpydGdjaWx0dGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMjU4OTksImV4cCI6MjA5NjkwMTg5OX0.F56god4wqLUCgP1lCVTLZCK9aII4Vo_4g4fJcPAFfFc"}', '{}', '5000');

drop trigger if exists "rent-overdue-alert" on public.rent_schedules;
create trigger "rent-overdue-alert" after update on public.rent_schedules
  for each row execute function supabase_functions.http_request(
    'https://fjmzsxslnzrtgcilttly.supabase.co/functions/v1/send-notification', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbXpzeHNsbnpydGdjaWx0dGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMjU4OTksImV4cCI6MjA5NjkwMTg5OX0.F56god4wqLUCgP1lCVTLZCK9aII4Vo_4g4fJcPAFfFc"}', '{}', '5000');
