# BrewOps

Multi-tenant coffee franchise management platform. Three HTML apps (no
build tooling, no bundler) backed by a shared Supabase project (Postgres +
Auth + Realtime + Storage). Sensitive/transactional data (orders, invoices,
stock, machines, financials) is brand/outlet-isolated at the database (RLS)
layer. Read-only catalog and directory data (menu/merch listings, promos,
coupons, the outlet directory) is intentionally readable across brands at
the RLS layer — the apps apply their own brand filter for that — so "full
isolation" only applies to the former, not the latter. See
`tools/rls-check` for the regression check that verifies this.

## Apps

| File | Who uses it | What it does |
|---|---|---|
| `brewops-customer.html` | End customers | Browse menu/merch, order, track status, favourites, saved addresses. Brand-aware via `?brand=<slug>` URL param. |
| `brewops-franchisee-v2.html` | Outlet staff | Live order queue, stock levels + top-up requests, machine service log, issue reporting, daily finance. |
| `brewops-franchisor-v4.html` | Brand owners + platform admin | Full CMS (menu/merch/promos/coupons), live orders across outlets, stock/machines/rent/invoices/suppliers, analytics, invite codes, Brand Settings. Includes a separate Platform Admin view for creating brands and managing accounts. |

## Multi-tenancy model

One shared schema. `brand_id` on ~25 tables. Isolation enforced by Postgres
Row Level Security, not just app-code filtering. Three roles-aware helper
functions power the policies: `get_my_role()`, `get_my_brand_id()`,
`get_my_outlet()`.

Two live brands exist for testing: **Liétard Artisan Roast** (`lietard`) and
**TestBrand Coffee Co.** (`testbrand-coffee-co`) — treat both as permanent
regression-test tenants. Any brand-related change should be verified against
both, since an old brand's already-correct data can mask isolation gaps that
only show up on a genuinely fresh brand.

## Database setup

Run every numbered `NN-*.sql` file in the repo root **in numeric order**
against your Supabase project's SQL editor — they live at the top level,
not in a `migrations/` subfolder. Each file is idempotent where practical
(`if not exists` / `drop ... if exists` before `create`), but they are NOT
independent — later files assume earlier ones already ran, especially the
multi-brand steps (08 through 13), which must run in that exact sequence.

`00-base-schema.sql` covers the original schema (profiles, outlets,
orders, menu_items, etc.) that predates this repo's numbered migration
history — reconstructed from the live project via `pg_catalog`
introspection, not a hand-written migration, so treat it as a
point-in-time snapshot. Run it first on a fresh Supabase project, before
`01-*` through `15-*`.

## Local development

No build step. Serve the three HTML files with any static server, e.g.:

```
npx http-server -p 8000
```

Then open `http://localhost:8000/brewops-customer.html` (add `?brand=<slug>`
to test a specific brand), or the franchisee/franchisor apps directly.

Each app has its Supabase URL and anon key hardcoded near the top of its
JS (search for `SUPABASE_URL`) — update these if pointing at a different
Supabase project. For `brewops-customer.html` and `brewops-franchisee-v2.html`
that's inline in the file's own `<script>` tag; for
`brewops-franchisor-v4.html` it's in `franchisor-init.js`, one of the 7
`franchisor-*.js` files that app's script is split across (loaded via
`<script src>` in a specific order — see CLAUDE.md before reordering them).

## Known gaps / open items

- No real payment gateway integration — "card" payments are recorded but not
  actually processed by any payment processor yet.
- Delivery service is scaffolded (order_type, address picker) but disabled
  in the customer app pending real courier integration.
- Telegram Bot notifications (replacing an earlier WhatsApp plan) are
  planned but not yet built — franchisor/franchisee-facing ops alerts only,
  customer-facing channel undecided.
- Per-brand theming currently applies only 3 base colors; derived shades
  are fixed across all brands.
- Three App Settings cards (Outlet Config, Payment Settings, Notifications)
  in the franchisor app are UI-only, not wired to any backend.
- `outlets` and `daily_ops` have RLS read policies open to any
  anon/authenticated caller with no brand filter — `outlets` exposes
  name/location (low sensitivity, arguably fine), `daily_ops` exposes
  exact per-outlet daily revenue and machine-cleaning counts across every
  brand (higher sensitivity, worth reconsidering). Run `tools/rls-check`
  to see current exposure.
