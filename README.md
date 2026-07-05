# BrewOps

Multi-tenant coffee franchise management platform. Three self-contained
HTML apps (no build tooling) backed by a shared Supabase project (Postgres +
Auth + Realtime + Storage), with full multi-brand data isolation enforced at
the database (RLS) layer.

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

Run every file in `migrations/` **in numeric order** against your Supabase
project's SQL editor. Each file is idempotent where practical (`if not
exists` / `drop ... if exists` before `create`), but they are NOT
independent — later files assume earlier ones already ran, especially the
multi-brand steps (08 through 13), which must run in that exact sequence.

There is no `migrations/00-*` file for the very original schema (profiles,
outlets, orders, menu_items, etc.) — that foundational schema predates this
repo's migration history and isn't captured here yet. If setting this up
from a completely empty Supabase project, you'll need that base schema
first; check the project's Supabase dashboard directly or ask for it to be
reconstructed.

## Local development

No build step. Serve the three HTML files with any static server, e.g.:

```
npx http-server -p 8000
```

Then open `http://localhost:8000/brewops-customer.html` (add `?brand=<slug>`
to test a specific brand), or the franchisee/franchisor apps directly.

Each HTML file has its Supabase URL and anon key hardcoded near the top of
its `<script>` tag (search for `SUPABASE_URL`) — update these if pointing at
a different Supabase project.

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
