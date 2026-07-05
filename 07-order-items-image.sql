-- ════════════════════════════════════════════════════════════════
-- Adds image_url to order_items, since the My Orders page tries to
-- show the real product photo per line item but order_items never
-- had anywhere to store it -- it silently fell back to the emoji
-- icon every time, which is why past orders showed an icon instead
-- of the actual coffee/product photo.
-- ════════════════════════════════════════════════════════════════

alter table order_items add column if not exists image_url text;
