-- ════════════════════════════════════════════════════════════════
-- 19 — Drop the three notification webhook triggers (legacy key
-- retirement, part 2 of 2).
--
-- Why: the apps moved off the legacy JWT anon key onto the new
-- sb_publishable_* key, and the legacy key family (anon +
-- service_role) is being disabled in the dashboard — that disablement
-- is what finally, fully invalidates the service_role key string that
-- was exposed in trigger DDL before migration 16. But these three
-- triggers still carry the legacy anon key as their Authorization
-- bearer (migration 16 put it there), and the send-notification edge
-- function's "verify JWT with legacy secret" check stops accepting it
-- the moment legacy keys are disabled.
--
-- Rather than re-point dead plumbing (the notification system is
-- non-functional anyway — no Telegram bot exists, see CLAUDE.md known
-- gaps), drop the triggers entirely. The dormant send-notification
-- edge function can stay deployed; nothing calls it anymore. When the
-- Telegram bot actually gets built, recreate the triggers against
-- that day's key scheme — and put the token in something better than
-- literal trigger DDL if Supabase allows it by then.
--
-- This also supersedes tools/staging/staging-only-drop-notification-
-- triggers.sql (deleted alongside this migration): with the triggers
-- gone from production too, staging no longer needs a special step.
-- ════════════════════════════════════════════════════════════════

drop trigger if exists "invoice-sent-alert" on public.invoices;
drop trigger if exists "machine-status-alert" on public.machines;
drop trigger if exists "rent-overdue-alert" on public.rent_schedules;
