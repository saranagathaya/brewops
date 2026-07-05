-- ════════════════════════════════════════════════════════════════
-- MULTI-BRAND MIGRATION -- STEP 3 (small addition): brand tagline
--
-- The Brand Settings page (franchisor app) includes an optional
-- tagline field that wasn't in the original brands table from step 1.
-- ════════════════════════════════════════════════════════════════

alter table brands add column if not exists tagline text;
