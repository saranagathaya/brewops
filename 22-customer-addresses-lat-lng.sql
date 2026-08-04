-- ════════════════════════════════════════════════════════════════
-- 22 — lat/lng for customer addresses, and a delivery-time snapshot
--      of them on the order itself
--
-- customer_addresses had no coordinates at all -- just free-text
-- label/address_line/city/notes, unlike outlets (which have had lat/lng
-- since the base schema). This brings customer addresses up to the same
-- standard: the customer app now runs Places Autocomplete on the address
-- field the same way the franchisor app already does for outlets.
--
-- orders.delivery_lat/delivery_lng are a snapshot taken at checkout time,
-- for the same reason delivery_address_text already is one: so a
-- franchisee looking at an order later isn't affected if the customer
-- has since edited or deleted that saved address.
-- ════════════════════════════════════════════════════════════════

alter table "customer_addresses"
  add column if not exists "lat" numeric(10,7),
  add column if not exists "lng" numeric(10,7);

alter table "orders"
  add column if not exists "delivery_lat" numeric(10,7),
  add column if not exists "delivery_lng" numeric(10,7);
