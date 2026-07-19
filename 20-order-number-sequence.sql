-- ════════════════════════════════════════════════════════════════
-- 20 — Fix a real order-number race condition (silent order loss)
--
-- generate_order_number() computed the next order number as
-- `max(existing numeric suffix) + 1`, read and written in two separate
-- steps with no locking. Two checkouts landing close enough together
-- (concurrent customers, or even just a quick double-submit) can both
-- read the same max and compute the same "next" number; only one
-- INSERT can win against the orders_order_number_key unique
-- constraint, and the other fails outright. The customer app has no
-- retry for this — it's caught as a generic error and shown as "Order
-- placed (offline mode)", so the customer believes they ordered
-- (possibly after paying) while nothing was saved at all.
--
-- Found 2026-07-17 verifying the PayHere sandbox flow: a real signup
-- attempt hit exactly this, and it reproduced immediately on a second,
-- independent attempt minutes later -- not a one-off fluke.
--
-- Fix: a Postgres SEQUENCE. nextval() is atomic under concurrency by
-- design (that's the entire reason sequences exist) -- no read-then-
-- write window for two callers to collide in. Seeded to continue from
-- today's actual max, so existing order numbers are never reused.
-- ════════════════════════════════════════════════════════════════

do $$
declare
  cur_max integer;
begin
  select coalesce(max(cast(substring(order_number from 5) as integer)), 4800)
  into cur_max
  from orders;
  execute format('create sequence if not exists orders_order_number_seq start with %s', cur_max + 1);
end $$;

create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $function$
begin
  new.order_number := 'ORD-' || nextval('orders_order_number_seq');
  return new;
end;
$function$;
