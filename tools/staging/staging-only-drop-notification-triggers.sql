-- ════════════════════════════════════════════════════════════════
-- STAGING-ONLY — do not run this against production.
--
-- 00-base-schema.sql and 16-notification-triggers-drop-service-role.sql
-- hardcode the PRODUCTION project's URL
-- (fjmzsxslnzrtgcilttly.supabase.co) into these 3 triggers' webhook
-- calls. Run unmodified on a staging project, any invoice/machine/rent
-- update there would silently POST to production's edge function.
--
-- The notification system isn't functional yet anyway (no Telegram bot
-- built — see CLAUDE.md's known gaps), so the simplest safe fix for
-- staging is just dropping these 3 triggers after running 00-18. Nothing
-- is lost: they don't do anything a staging environment needs today.
-- ════════════════════════════════════════════════════════════════

drop trigger if exists "invoice-sent-alert" on public.invoices;
drop trigger if exists "machine-status-alert" on public.machines;
drop trigger if exists "rent-overdue-alert" on public.rent_schedules;
