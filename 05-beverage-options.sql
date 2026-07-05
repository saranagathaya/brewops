-- ════════════════════════════════════════════════════════════
-- Upgrades menu_items' four option columns (size/temp/sweetness/milk)
-- from plain string arrays — e.g. ["Regular","Large"] with one shared
-- upcharge column — to structured arrays of {label, upcharge} objects,
-- so the franchisor can give each individual option its own custom
-- label AND price delta per beverage, not just a fixed default set
-- sharing one upcharge number.
--
-- Confirmed via live data check: every existing row is currently the
-- old plain-string shape, so this is a straightforward unconditional
-- rewrite — no shape-detection branching needed.
--
-- Old shape:  size_options = ["Regular", "Large"]
--             large_upcharge = 8000   (one shared number, size-only)
-- New shape:  size_options = [{"label":"Regular","upcharge":0},
--                              {"label":"Large","upcharge":8000}]
-- ════════════════════════════════════════════════════════════

update menu_items
set size_options = (
  select jsonb_agg(
    jsonb_build_object('label', opt, 'upcharge', case when opt = 'Large' then coalesce(large_upcharge,0) else 0 end)
  )
  from jsonb_array_elements_text(coalesce(size_options, '["Regular","Large"]'::jsonb)) as opt
);

update menu_items
set temp_options = (
  select jsonb_agg(jsonb_build_object('label', opt, 'upcharge', 0))
  from jsonb_array_elements_text(coalesce(temp_options, '["Hot","Iced"]'::jsonb)) as opt
);

update menu_items
set sugar_options = (
  select jsonb_agg(jsonb_build_object('label', opt, 'upcharge', 0))
  from jsonb_array_elements_text(coalesce(sugar_options, '["No Sugar","Standard","Extra Sweet"]'::jsonb)) as opt
);

update menu_items
set milk_options = (
  select jsonb_agg(
    jsonb_build_object('label', opt, 'upcharge', case when opt in ('Oat Milk','Soy Milk') then coalesce(oat_upcharge,0) else 0 end)
  )
  from jsonb_array_elements_text(coalesce(milk_options, '["Full Cream","Oat Milk","Soy Milk"]'::jsonb)) as opt
);

-- large_upcharge / oat_upcharge are now superseded by per-option upcharges
-- above. Not dropped yet -- kept harmlessly in place in case anything
-- still references them during rollout; safe to drop later once confirmed
-- nothing reads them anymore.

-- New: rich detail content blocks for the scrollable "more info" section
-- on the item detail modal -- simple ordered list of {type, content} blocks,
-- type is 'text' or 'image'. Franchisor adds/reorders these freely.
alter table menu_items
  add column if not exists detail_blocks jsonb default '[]'::jsonb;
