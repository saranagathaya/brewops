# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BrewOps is a multi-tenant coffee franchise management platform: three HTML
apps (no build tooling, no package.json, no bundler) backed by a shared
Supabase project (Postgres + Auth + Realtime + Storage). Sensitive/
transactional data (orders, invoices, stock, machines, financials) is
brand/outlet-isolated at the database layer via Postgres Row Level
Security, not app-code filtering. Read-only catalog/directory data (menu,
merch, promos, coupons, the outlet directory) is intentionally readable
across brands at the RLS layer — see "Known remaining gap" below and
`tools/rls-check` for specifics and how to verify this.

| File | Who uses it | What it does |
|---|---|---|
| `brewops-customer.html` | End customers | Browse menu/merch, order, track status, favourites, saved addresses. Brand-aware via `?brand=<slug>` URL param. |
| `brewops-franchisee-v2.html` | Outlet staff | Live order queue, stock levels + top-up requests, machine service log, issue reporting, daily finance. |
| `brewops-franchisor-v4.html` | Brand owners + platform admin | Full CMS (menu/merch/promos/coupons), live orders across outlets, stock/machines/rent/invoices/suppliers, analytics, invite codes, Brand Settings. Includes a separate Platform Admin view for creating brands and managing accounts. Its JS is split across 7 `franchisor-*.js` files (see below) rather than inlined — the other two apps are still single-file. |

## Running locally

No build step, no package manager, no test suite. Serve the HTML files with
any static server:

```
npx http-server -p 8000
```

Then open `http://localhost:8000/brewops-customer.html` (add `?brand=<slug>`
to test a specific brand), or the franchisee/franchisor apps directly. There
is no dev/prod split — editing the `.html` files and reloading the browser
is the entire iteration loop.

## Architecture of each HTML file

Each app is one HTML file: `<style>` block, then markup, then JS at the
bottom (inline for customer/franchisee, as `<script src>` files for
franchisor — see split below). There's no module system either way —
everything is global functions/state.

Markup elements present in the initial HTML are wired via
`addEventListener` in a per-app `*-wiring.js` file (`customer-wiring.js`,
`franchisee-wiring.js`, `franchisor-wiring.js`), loaded last. Elements
rendered dynamically at runtime — menu items, coupons, stock rows, and
every other template-literal-generated list — still use inline
`onclick="..."` and are NOT covered by the wiring files; converting those
would mean rewriting every render function to use event delegation, a
separate and much larger change. If you add a new **static** interactive
element, follow the existing pattern: give it an `id`, add
`document.getElementById('id').addEventListener('click', function(event){
... })` to that app's wiring file — a regular `function`, not an arrow
function, since inline-onclick-equivalent behavior depends on `this`
being bound to the element. If you add a new **dynamically-rendered**
element, inline `onclick="..."` in the template literal remains the
existing, consistent pattern for that case.

Files are internally organized into clearly delimited sections marked with
`══` banners (e.g. `// ══ MENU MANAGER — full CRUD wired to Supabase ══`).
Grep for `══` in a file first to get a table of contents before editing —
it's the fastest way to find the right section in a large file.

`brewops-franchisor-v4.html`'s JS (originally one ~3,555-line `<script>`
block) is split into 7 files, loaded via `<script src>` in this exact
order, immediately after `shared.js`:
`franchisor-init.js` (Supabase config, auth/login gate, dashboard data
load) → `franchisor-live-ops.js` (realtime order stream, CMS live-update
subscriptions, Orders page, Outlet Network, Invite Codes) →
`franchisor-platform-admin.js` → `franchisor-cms.js` (Brand Settings,
Menu Manager, Merch Manager, Coupon Campaigns) → `franchisor-ops-finance.js`
(Machines, Rent Tracker, Stock, Complaints, Suppliers, Invoices) →
`franchisor-analytics.js` (revenue/coupon/beverage analytics, Network
Insights, dashboard overview) → `franchisor-widgets.js` (emoji picker,
image upload helpers, boot sequence — must stay last, it calls
`initSupabase()` at the very end). The split is purely mechanical (cut at
existing `══` section boundaries, zero lines reordered or changed) so
load order doesn't matter for correctness beyond keeping
`franchisor-widgets.js` last — everything else is global function
declarations (hoisted) or event-handler registrations, never
immediately-executed code that reads something from a later file. If you
add a new top-level (non-function-body) statement to any of these files,
check it doesn't depend on something defined in a file loaded after it.
`brewops-customer.html` and `brewops-franchisee-v2.html` remain single
inline `<script>` files.

**Responsive layout**: only `brewops-franchisee-v2.html` is responsive, on
purpose — it's the tablet counter device with a phone as emergency fallback,
so it needs the same UI at two sizes. It uses one `--app-width` CSS variable
(480px phone default; 720px at a `min-width:768px` breakpoint) for every
width cap, plus that breakpoint switching its two horizontal-scroll chip
rows to wrap. It's the same single-column layout at both sizes, just
widened — not a per-device redesign. The customer app is deliberately
phone-only (customers order on phones) and the franchisor app deliberately
a desktop console, so neither has this; don't add it without a real
cross-device need.

**Supabase connection**: URL + publishable key (`sb_publishable_...` —
public by design, safe in git) are hardcoded near the top of each app's JS
(search `SUPABASE_URL`) — inline in the customer/franchisee files, in
`franchisor-init.js` for the franchisor app. All three point at the same
project. The client is lazy-loaded from the `@supabase/supabase-js` ESM
CDN inside `initSupabase()`, not bundled. The legacy JWT-format API keys
(anon + service_role) were disabled in the dashboard on 2026-07-15 —
production rejects them with 401 "Legacy API keys are disabled", so any
old copy of them (including the once-exposed service_role string) is dead.
Don't re-enable them.

**Auth differs per app**:
- `brewops-customer.html` — browsing is anonymous; login/signup only appears
  at checkout (`doCheckoutSignup()` / checkout auth modal), and brand
  resolution (`resolveBrand()`) must complete before any other query runs
  since every query filters on `window.BRAND_ID`.
- `brewops-franchisee-v2.html` / `brewops-franchisor-v4.html` — a login gate
  (`#auth-gate`) blocks all content until `sb.auth.getSession()` resolves and
  the user's `profiles.role` is checked client-side (`loadProfileAndEnterApp()`).
  Signup requires a valid, unused, unexpired row in `invite_codes` scoped to
  the target role. The profiles row is created by the `on_auth_user_created`
  trigger on `auth.users` (runs `handle_new_user()`, which reads the
  role/full_name/outlet_id the apps pass as `auth.signUp()` metadata and
  marks the invite code used) — Supabase does allow user-defined triggers
  on `auth.users`; an older version of this doc claimed otherwise. The
  client-side upsert after signup supplements the trigger (e.g. `brand_id`,
  which the trigger predates), it doesn't replace it.
- Franchisor has a third role, `platform_admin`, which never sees the normal
  franchisor dashboard — it's routed to a separate, much simpler
  `#platform-admin-app` view for creating/managing brands.

**Multi-brand pattern (customer app)**: brand is resolved once from
`?brand=<slug>` (default `lietard`) via `resolveBrand()`, which sets
`window.BRAND` / `window.BRAND_ID` and applies the brand's colors as CSS
custom properties (`applyBrandTheme()`). Every subsequent Supabase query
filters `.eq('brand_id', window.BRAND_ID)`. An unknown/inactive slug replaces
the whole page with an error rather than falling through to unfiltered data.

## Database / migrations

Numbered `NN-description.sql` files in the repo root (there is no
`migrations/` subfolder despite what older docs may say — they live at the
top level). Run them **in numeric order** against the Supabase SQL editor;
they are not independent, especially 08 through 13 (the multi-brand steps),
which must run in that exact sequence. Each is idempotent where practical
(`if not exists` / `drop ... if exists` before `create`).

`app_settings` is keyed by `PRIMARY KEY (brand_id, key)` as of
`18-app-settings-composite-key.sql` — it was originally `PRIMARY KEY (key)`
alone despite being a brand-owned table, a real bug (two brands could never
both have a row for the same setting name) caught when `saveAppSettingDB()`
(`franchisor-live-ops.js`) was first actually exercised end-to-end wiring
the Payment Settings card. Always upsert against `onConflict: 'brand_id,key'`,
never `'key'` alone.

`00-base-schema.sql` covers the original base schema (`profiles`, `outlets`,
`orders`, `menu_items`, etc.) that predates this repo's numbered migration
history. It was reconstructed from the live project via `pg_catalog`
introspection (not `pg_dump`), originally validated only by parsing it
with Postgres's own SQL parser — but as of 2026-07-15 the full 00→18
sequence is also execution-validated against a from-scratch local staging
database (see "Local staging environment" below). That first real
execution caught two bugs parser-validation couldn't: FK constraints
ordered before the PK/UNIQUE constraints they referenced, and missing
`SELECT/INSERT/UPDATE/DELETE` default grants for
`anon`/`authenticated`/`service_role` (hosted Supabase creates those as
invisible platform bootstrapping via `supabase_admin`'s default
privileges, so they never appear in any migration — until you rebuild by
connecting directly as `postgres`, whose default ACLs don't include them,
and every query fails "permission denied" regardless of RLS). Both are
fixed in the file. Still treat it as a point-in-time snapshot rather than
a hand-maintained migration — add new base-level tables/functions/policies
as a new numbered file, not by editing this one; edit it only to fix
snapshot errors, and re-verify such edits with a from-scratch staging
rebuild.
Its header flags (and `16-notification-triggers-drop-service-role.sql`
fixes) a security issue: three `*-alert` triggers called an edge function
with a `service_role` key hardcoded in the trigger DDL (readable by anyone
with DB access via `pg_catalog`). The `send-notification` function's
"Verify JWT with legacy secret" only needs *any* legacy JWT — the anon key
satisfies it — so migration 16 swapped all three triggers to the public
anon key, removing the RLS-bypassing key from the database. (Vault isn't an
option here: a trigger's `EXECUTE FUNCTION` args must be literal constants,
so the token can't be a dynamic Vault lookup; the anon key is public by
design, so hardcoding it is fine.) That was only the in-database half; the
retirement completed 2026-07-15: the apps moved onto the new
`sb_publishable_` key, migration 19 dropped the three triggers outright
(the notification system is non-functional anyway — no Telegram bot — so
nothing was re-pointed at dead plumbing; the dormant `send-notification`
edge function stays deployed but uncalled), and the legacy keys were
disabled in the dashboard, which finally invalidated the once-exposed
`service_role` string. If/when the Telegram bot gets built, recreate the
triggers against that day's key scheme.

Three role-aware Postgres helper functions power essentially every RLS
policy: `get_my_role()`, `get_my_brand_id()`, `get_my_outlet()`. `brand_id`
exists on ~25 tables; any new brand-owned table needs both the column and a
policy following the `get_my_role() = '...' and brand_id = get_my_brand_id()`
pattern used throughout `11-multibrand-rls-retrofit.sql` and
`12-multibrand-rls-addendum.sql`.

Two live brands exist for testing: **Liétard Artisan Roast** (`lietard`) and
**TestBrand Coffee Co.** (`testbrand-coffee-co`) — treat both as permanent
regression-test tenants. Verify any brand-related change against both, since
an old brand's already-correct data can mask isolation gaps that only show
up on a genuinely fresh brand.

`tools/rls-check` is a scripted cross-brand isolation regression check —
it impersonates real franchisor/franchisee accounts from both test brands
(by setting the same `request.jwt.claims` GUC PostgREST sets from a JWT,
no test passwords needed) and checks for cross-brand row visibility on
every `brand_id`-bearing table/view. Entirely read-only. Run it after any
RLS change: `cd tools/rls-check && npm install && PGHOST=... PGPORT=...
PGUSER=... PGPASSWORD=... PGDATABASE=... node check.js` (use the Supabase
session-pooler connection details — the direct `db.<ref>.supabase.co`
host is IPv6-only). Add `PGSSL=false` when pointing it at the local
staging stack, which doesn't speak SSL (the cloud pooler requires it, so
SSL stays the default). It also runs automatically in CI
(`.github/workflows/rls-check.yml`): a hermetic job builds the whole
database from the migration files inside the GitHub runner (via
`supabase start` + `tools/staging/`) and checks it on every SQL-touching
push/PR, and a nightly job runs the same check read-only against
production to catch dashboard-made policy drift (needs the four
`PROD_PG*` repo secrets described in the workflow header). The
`outlet_health` name-only residual is encoded as
`KNOWN_ACCEPTED_VIEW_GAPS` in `check.js` — reported on every run but not
a failure, so CI is green unless something new leaks; if that view ever
exposes more than outlet names/locations again, remove it from that set.
The staging seed plants one "probe row" per brand in the sensitive
tables (orders, invoices, machines, stock_requests, daily_ops)
specifically so the hermetic CI check has data that COULD leak — without
them a fresh database passes vacuously. It found and `15-rls-orders-and-view-security-fixes.sql`
fixed two real bugs: `orders` had two policies that granted ANY
franchisor/franchisee account (any brand) full read/insert access with no
brand or outlet check, defeating the correctly-scoped policies that
already existed; and `outlet_health`/`network_revenue` (views owned by
`postgres`) bypassed RLS entirely since views run with their owner's
(RLS-bypassing) privileges by default. The `KNOWN_PUBLIC_CATALOG_TABLES`
allowlist in `check.js` is a hand-reviewed list, not a heuristic — a
regex-based "is this table's policy scoped" guess is what let the
`orders` leak slip through as "explained" the first time this was built;
don't reintroduce pattern-matching there. It also checks the positive
case (does the impersonated user still see their OWN brand's rows, not
just zero foreign rows) — a policy that's accidentally too strict would
otherwise pass silently. When picking a representative franchisee to
impersonate, the query specifically prefers one with a non-null
`outlet_id`: an earlier version picked one arbitrarily and happened to
grab a real Lietard franchisee account with no outlet assigned, which
made every outlet-scoped table look suspiciously all-zero — a test data
artifact, not a policy bug, but worth remembering if this script's
"zero own-brand visibility" warnings ever look surprising again.

`daily_ops` was tightened in `17-daily-ops-rls-tighten.sql` — its
`using (true)` open-read policy (which exposed exact per-outlet revenue and
machine-cleaning counts across all brands) was dropped, leaving only the
outlet-scoped franchisee and brand-scoped franchisor policies. `outlets`
intentionally keeps its public read policy: the anonymous customer app
needs it to list a brand's stores, and outlet name/location is public
information — so `outlet_health`/`network_revenue` can still surface other
brands' outlet *names* to a franchisor who queries the view without a
brand filter, but no longer their revenue (that came from `daily_ops`).
That residual name/location visibility is the accepted public-catalog
tradeoff, not an open bug.

## Local staging environment

`tools/staging/` (see its README for the full walkthrough) builds a
complete local Supabase stack in Docker — Postgres + Auth + Storage +
Realtime + Studio via `npx supabase start` (config in `supabase/`), then
`run-migrations.js` applies 00→18 in order and `seed-staging.js` creates
both test brands with an outlet and franchisor/franchisee logins each.
Use it to trial schema/RLS changes before running them on production —
it's the only place the full migration sequence actually executes end to
end (production's schema was built incrementally, so it never re-runs
these files). One staging-specific fact to not trip over:

- To point one of the HTML apps at staging, make a scratch copy with
  `SUPABASE_URL`/`SUPABASE_KEY` swapped to the local values and never
  commit it — the production values hardcoded in the real files are the
  deployed configuration.

## Known gaps / open items

- No real payment gateway integration — "card" payments are recorded but not
  actually processed by any payment processor yet.
- Delivery service is scaffolded (order_type, address picker) but disabled
  in the customer app pending real courier integration.
- Telegram Bot notifications (replacing an earlier WhatsApp plan) are
  planned but not yet built — franchisor/franchisee-facing ops alerts only,
  customer-facing channel undecided.
- Per-brand theming: the franchisor still only picks 3 colors
  (primary/secondary/accent), but `applyBrandTheme()` (`brewops-customer.html`)
  now derives the other 6 root CSS vars (`--brand3`, `--brand-light`,
  `--brand-dim`, `--brand-dark`, `--brand-shadow`, `--gold2`, `--gold-dim`)
  from those 3 via `lightenHex`/`darkenHex`/`hexToRgbaStr`, instead of
  those shades being Lietard's specific hardcoded values regardless of
  brand. Also fixed a few elements that bypassed CSS vars entirely with
  literal hex (`.profile-hero`, the two store-chip location-pin SVGs) —
  those never responded to *any* brand color, not just the derived ones.
  `#splash`'s gradient is deliberately left hardcoded: it renders before
  brand resolution completes, so there's nothing to theme it with yet.
- App Settings: Payment Settings (which checkout methods the customer app
  offers) and 2 of 4 Notifications toggles (new-order alert, cash-confirm
  popup — both gate real franchisee-app behavior) are wired to
  `app_settings` and take effect immediately, as the page banner claims.
  "Order ready notification to customer" and "Weekly summary to franchisor"
  are intentionally left disabled with a "(coming soon)" label — no
  delivery mechanism (push/Telegram/email) exists yet for either, so
  making them look interactive without one would just move the same
  deception the original UI-only cards had. Outlet Configuration (default
  order mode, location detection, delivery radius) is entirely disabled
  with the same "(coming soon)" treatment, for the same reason — all three
  settings would control delivery-mode/geolocation features that don't
  exist yet either (see the delivery-service gap above).
- Franchisee Finance/Stats gained the franchisor app's `.mini-bar`/
  `.mini-bar-fill` and two-segment `.mini-bar-split` visual pattern
  (`brewops-franchisee-v2.html`) — payment-method proportions, revenue
  composition (app vs walk-in, fee vs net), and network-ranking position
  are now bars, not just numbers. A month-over-month trend section
  compares **daily averages**, not raw totals (comparing a partial current
  month against a full prior month would always look like a decline early
  in the month) — falls back to an honest "not enough history" message
  when there's no prior month of `daily_ops` data, rather than fabricating
  a trend from a month that never happened.
