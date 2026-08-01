-- ════════════════════════════════════════════════════════════════
-- 21 — Per-brand dark theme flag + Liétard's new olive-green identity
--
-- Adds `dark_theme` so a brand can opt into the customer app's dark
-- color scheme (near-black surfaces, olive-green accent) instead of
-- the default light cream/burgundy look. Additive and per-brand: every
-- other brand keeps `dark_theme = false` and is visually unaffected —
-- see brewops-customer.html's `:root[data-theme="dark"]` CSS block and
-- applyBrandTheme()/resolveBrand().
--
-- Liétard's actual stored colors are updated here too, at the user's
-- request, to match a Lovable-built reference design's real olive-
-- green brand identity (not just a dark-mode recolor of the existing
-- burgundy/gold) — see CLAUDE.md "Per-brand theming" for the source
-- values this was derived from (hsl(88 28% 35%) / hsl(88 28% 45%),
-- measured directly from the reference design's computed styles).
-- ════════════════════════════════════════════════════════════════

alter table "brands" add column if not exists "dark_theme" boolean not null default false;

update "brands" set
  dark_theme = true,
  primary_color = '#5B7240',
  secondary_color = '#6B8449',
  accent_color = '#759353'
where slug = 'lietard';
