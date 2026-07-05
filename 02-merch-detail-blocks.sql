-- ════════════════════════════════════════════════════════════
-- Adds the same "More Info Section" capability to merch items
-- (coffee beans, souvenirs) that beverages already have on the
-- Menu Manager side — an ordered list of {type, content} blocks
-- (text paragraphs / photos) shown when a customer taps a product
-- on the Order tab and scrolls down. Mirrors menu_items.detail_blocks
-- exactly, so both product types use the same rendering logic.
-- ════════════════════════════════════════════════════════════

alter table merch_items
  add column if not exists detail_blocks jsonb default '[]'::jsonb;
