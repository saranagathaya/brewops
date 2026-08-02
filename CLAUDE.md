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

## Production hosting

The repo is served directly by GitHub Pages (no build step needed — it's
already just static files) at the custom domain `qbrew.app`, configured via
the root `CNAME` file and DNS records at the registrar (Namecheap). `qbrew`
is the platform/company-facing name (what franchisor/franchisee users see);
it is deliberately distinct from each Outlet Brand's own customer-facing
name (Liétard Artisan Roast, TestBrand Coffee Co., etc.), which
`brewops-customer.html` still themes per `?brand=<slug>` exactly as before.

**Per-brand URLs**: every brand gets a clean URL of the form
`qbrew.app/<brand-slug>/brewops-customer.html` (also works as bare
`/<brand-slug>` or `/<brand-slug>/`) — e.g. `qbrew.app/lietard/...` and
`qbrew.app/testbrand-coffee-co/...`. Since GitHub Pages is fully static
with no server-side routing, and brands are created purely via a database
insert from the Platform Admin UI (zero repo/deploy interaction), a literal
folder per brand isn't viable. Instead, `404.html` (repo root) doubles as a
router: GitHub Pages serves it for any URL with no matching real file, so
it reads the first path segment as a brand slug and redirects to
`brewops-customer.html?brand=<slug>` — giving every brand, including ones
created after this was written, a clean URL for free with no new files or
deploys needed. It does zero validation of its own; `resolveBrand()` in
`brewops-customer.html` already rejects an unknown/inactive slug safely
(its own "we couldn't find that café" page, never falling through to
unfiltered data), so the router doesn't need to check anything. One
caveat: GitHub Pages serves `404.html` with an actual HTTP 404 status
under the hood — harmless for the client-side redirect real visitors
experience, but worth knowing if anything ever checks status codes or
crawls the site.

`index.html` at the repo root is `qbrew.app`'s own landing page — a
company/platform page whose layout, palette and motion are ported from the
user's own Lovable project `coffee-scroll` ("Ember & Oak", live at
`https://coffee-scroll.lovable.app`; source readable via that project's
Lovable MCP). The structure is faithful to it — intro word-loader, parallax
photo hero with a masked wordmark reveal, manifesto, three sticky-image
feature blocks, three centred quote sections, a scroll-driven word stack,
marquee — but the copy is original, describing what qbrew actually is
rather than that reference's single-roastery story (sourcing, roasting and
subscription boxes don't apply here and would be false on a real page).
The reference's oklch design tokens were converted to hex so the palette is
identical while still rendering on older mobile browsers, and its four
photos live in `assets/landing/` (the root `.gitignore` blanket-ignores
`*.jpg`, so there is a deliberate `!assets/landing/*.jpg` exception — drop
it and these silently vanish from the build). Two deliberate departures
from the reference, both to avoid shipping something untrue: its email
capture form is gone (it had no backend — it just set local state, so on a
real site it would collect addresses that go nowhere), and its
"LEARN MORE →" links are gone (there is nowhere for them to go). Scroll
reveals are progressive-enhancement: content is visible by default and only
hidden once JS confirms `IntersectionObserver` exists, with a 4s safety
timer that reveals everything if the observer never fires — otherwise a
backgrounded tab or an old browser would render a blank page. Hero
entrance animations are pure CSS for the same reason (`requestAnimationFrame`
does not fire in a hidden tab, which would strand the wordmark translated
out of view). It has
no links out to any brand's ordering app; reaching a specific brand's app
happens only via that brand's own separately-shared `/<slug>/` link (QR
code, social, etc.), never from `qbrew.app` itself. It still preserves one
narrow backward-compat path: if `?brand=<slug>` is explicitly present in
the query string (an old-style link already shared somewhere, from before
per-brand paths existed), it forwards straight to
`brewops-customer.html?brand=<slug>` exactly like before, instead of
showing the landing page — so nothing already distributed breaks.

`policies/` holds the Return, Privacy, and Terms pages required by the
PayHere merchant activation review. They carry real legal/compliance
weight (bank-reviewed, and binding on real customers once live) — treat
edits to their content more like a legal document than app copy.

## Native apps (`apps/`)

Two Capacitor wrappers, each packaging a live page from `qbrew.app` as an
installable app — WebView (Android) / WKWebView (iOS) shells, not separate
codebases. Both share the same core pattern: `capacitor.config.json`'s
`server.url` points at the real production page, so the app always shows
whatever is currently live — there is no bundled/offline copy of the web
app, and no separate build step keeps it in sync; editing the HTML file and
pushing to `main` is the entire update path for both the website and every
app wrapping it.

- **`apps/lietard/`** — the Liétard-branded **customer** app
  (`brewops-customer.html`). `server.url` is
  `https://qbrew.app/lietard/brewops-customer.html` (the clean per-brand
  URL, see "Production hosting" above — resolved via the `404.html` router
  to the real `brewops-customer.html?brand=lietard` at runtime). Originally
  built (as `android/lietard/`, Android-only) to replace a Lovable-hosted
  design mockup (`https://lietard-coffee-app.lovable.app`) that the Liétard
  dark-theme re-skin (see "Per-brand theming" below) was visually based on;
  later renamed to `apps/lietard/` and given an iOS platform once both
  became sibling native folders under one shared config, matching Capacitor's
  normal project layout. **Single-brand by design**: `appId`
  (`com.lietard.coffee.app`), the launcher icon/splash, and the hardcoded
  `/lietard/` URL are all Liétard-specific — see "Adding a new brand's
  customer app" below for what a second brand's app actually involves.
- **`apps/staff/`** — a **universal** app for franchisee/franchisor staff
  (`brewops-franchisee-v2.html`), `appId` `com.qbrew.staff`. Unlike the
  customer app, this is **not** per-brand: `server.url` points straight at
  `https://qbrew.app/brewops-franchisee-v2.html` with no brand slug at all,
  because staff brand-scoping already happens post-login via the
  authenticated profile's `brand_id`/`outlet_id` (see "Auth differs per
  app" above) rather than a URL parameter — any outlet's staff install the
  same app and only ever see their own brand's data. Its icon/splash are a
  **placeholder** built from qbrew's own landing-page palette (a plain
  amber "Q" on near-black, `apps/staff/resources/`) since no dedicated
  qbrew icon-shaped mark exists yet — swap the source images and regenerate
  (see below) once a real one does.

### Building

Source assets for icon/splash live in `apps/<name>/resources/` (`icon.png`,
`icon-foreground.png`, `icon-background.png`, `splash.png`). Regenerate the
actual per-platform resources from them after changing any source image:
```
cd apps/<name>
npx @capacitor/assets generate --android
npx @capacitor/assets generate --ios
```
This only writes/updates files it generates — it does **not** delete stale
ones, so check `git status` for leftover files from a previous format that
should be removed (this bit us once on the Android side: Capacitor's
default project shipped `ic_launcher*.webp` placeholders, `@capacitor/assets`
added `ic_launcher*.png` for the real logo but left the old `.webp` files in
place, and having both resolve to the same `@mipmap/ic_launcher` resource
name fails the Gradle build with a duplicate-resource error).

**Android**: `cd apps/<name>/android && ./gradlew assembleDebug`, needs a
JDK new enough for `capacitor-android`'s `compileOptions` (currently
Java 21) — if `JAVA_HOME` points at an older JDK, override it for just the
build command rather than changing the system default. Output lands at
`apps/<name>/android/app/build/outputs/apk/debug/app-debug.apk`. No release
keystore/signing is set up yet — debug-only for now, sideload to test.
Local Android/Gradle build artifacts (`local.properties`, `.gradle/`,
`build/`, `.idea/`, the `app/release/` baseline-profile output) and iOS's
`Pods/`/`xcuserdata/`/`DerivedData/` are git-ignored via a generic `apps/*/`
wildcard pattern in the root `.gitignore`, so a new app under `apps/`
inherits this automatically — only source files are tracked.

If a from-scratch Gradle build fails resolving a dependency with a
certificate/PKIX error, check whether local antivirus "HTTPS scanning"
(Norton and similar tools do this) is intercepting the connection and
serving its own re-signed certificate — `openssl s_client -connect
repo.maven.apache.org:443 -showcerts` will show the actual issuer if so.
The fix is importing that AV's root CA into the JDK's own truststore (a
browser trusting it doesn't make the JVM trust it too, since Java ships
its own separate `cacerts` store) — do this on a writable copy of
`cacerts` and point Gradle at it via `-Djavax.net.ssl.trustStore=`, or
properly into the real JDK install if you have admin rights, rather than
disabling AV scanning or the certificate check.

Both apps also ship an Android `network_security_config.xml` bundling
Let's Encrypt's root (ISRG Root X1) as an explicit trust anchor
(`android/app/src/main/res/xml/`, wired via
`android:networkSecurityConfig` in `AndroidManifest.xml`). Android didn't
add that root to its own trust store until 7.1.1, and the old fallback
that covered older devices expired in 2021 — since GitHub Pages issues
`qbrew.app`'s certificate exclusively via Let's Encrypt, any device below
7.1.1 can't validate it at all, and the WebView fails the load silently
(blank screen, no error). Confirmed live on an Android 7.0 device: the
same URL worked fine in that phone's regular browser (which maintains its
own separately-updated certificate list) while the wrapped app stayed
blank, until this fix. iOS doesn't need the equivalent — Apple's trust
store has included ISRG Root X1 since iOS 10 (2016), long before this
matters for any realistically-supported device.

**iOS**: `npx cap add ios` (from `apps/<name>/`) generates
`apps/<name>/ios/App/`, an Xcode project + workspace — pure Capacitor CLI,
no Mac needed to generate it. Actually compiling, signing, and producing an
installable `.ipa` does need a Mac, which this project doesn't have locally
— see `codemagic.yaml` at the repo root for cloud-Mac CI builds via
[Codemagic](https://codemagic.io), one workflow per app. Both need, once
set up: an Apple Developer Program enrollment ($99/year, required for any
real device install, ad hoc or App Store) and a Codemagic account connected
to this repo, with an App Store Connect API key configured as its
`app_store_connect` integration for code signing (no manually managed
`.p12`/provisioning profile). **That YAML has never actually run** — it's
written against Codemagic's documented conventions but unverified against
a real build; treat the first real run as part of finishing this setup,
not as a guaranteed-working config.

### Adding a new brand's customer app

The customer app is deliberately single-brand-per-install (see
`apps/lietard/` above), so a second brand wanting one means copying the
folder rather than parameterizing it:
1. Copy `apps/lietard/` to `apps/<new-slug>/`.
2. In `capacitor.config.json`: change `appId` (reverse-DNS, e.g.
   `com.<brand>.app`), `appName`, and `server.url` to
   `https://qbrew.app/<new-slug>/brewops-customer.html`.
3. Replace the brand's logo source file and regenerate
   `apps/<new-slug>/resources/*` from it the same way the Liétard ones were
   built (crop a bean/mark-only version for the launcher icon — a full
   text-heavy lockup is illegible at launcher size — and a fuller lockup
   for the splash, matching that brand's own web app splash screen).
4. Run `npx @capacitor/assets generate --android` and `--ios`, then rebuild
   both platforms per "Building" above.
5. Update the Android package name in `MainActivity.java`'s `package`
   declaration and the directory it lives in to match the new `appId`.
6. Add a `<new-slug>-ios` workflow to `codemagic.yaml`, copying the pattern
   from `lietard-ios`.

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

**Google Maps connection**: `GOOGLE_MAPS_API_KEY` is hardcoded in
`franchisor-init.js`, public by design like the Supabase key above — Maps
JS keys are meant to be client-visible and are secured via HTTP referrer
restriction in Google Cloud Console, not by hiding the key. That
restriction (scoped to `qbrew.app/*` + `localhost` for local dev) is set.
It's used for exactly one thing: Places Autocomplete on the franchisor's
Add/Edit Outlet form (`franchisor-cms.js`), so franchisors can search a
real address instead of typing raw coordinates — picking a suggestion
fills `outlets.lat`/`lng` (columns that existed in the schema from day one
but were unused until this) alongside the address. Lazy-loaded via
`ensureGoogleMapsLoaded()` the same way Supabase is lazy-loaded, and only
ever loaded by the franchisor app — the customer app has no Google Maps
dependency at all; it computes outlet distance client-side with a plain
Haversine formula against the device's own geolocation
(`applyStoreDistancesIfKnown()` in `brewops-customer.html`) and links out
to `google.com/maps/search` for directions, neither of which needs an API
key or network call.

Google returns an Open Location Code ("plus code", e.g. `WXC2+2WF`) as a
place's `formatted_address` whenever the exact point picked has no street
address on file — common in Sri Lanka. Precise, but meaningless to a
customer trying to find the café, so `PLUS_CODE_RE` (`shared.js`, loaded by
both apps) strips it: `franchisor-cms.js` prefers the place's own `name`
and strips a leading plus code before filling the Address field, and
`displayOutletAddress()` (`brewops-customer.html`) strips the same pattern
at display time so outlets saved before this existed still read sensibly
without anyone re-picking their address.

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

`orders.order_number` is generated by a Postgres SEQUENCE
(`orders_order_number_seq`) as of `20-order-number-sequence.sql` — it was
originally `max(existing numeric suffix) + 1`, computed and written as two
separate steps with no locking, so two checkouts landing close enough
together could read the same max and both attempt the same next number;
only one insert wins the unique constraint and the other fails outright.
Found 2026-07-17 verifying the PayHere sandbox flow: a real signup+checkout
attempt hit exactly this, and it reproduced immediately on a second,
independent attempt — not a one-off. Because the customer app's
`submitOrderToSupabase()` catches any insert error generically, the
failure surfaced only as a misleading "Order placed (offline mode)"
toast with nothing actually saved — a customer could lose an order (or a
payment) with no record anywhere. `nextval()` on a sequence is atomic by
construction, so this class of collision can't happen anymore; proved
with 20 genuinely concurrent inserts against local staging (0 failures,
all unique) both before and after the fix (the old function does fail
under that load, though staging's synthetic non-`ORD-`-prefixed probe
rows make that specific repro noisy — the atomicity guarantee itself
doesn't depend on that finding).

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
`run-migrations.js` applies 00→21 in order and `seed-staging.js` creates
both test brands with an outlet and franchisor/franchisee logins each.
Use it to trial schema/RLS changes before running them on production —
it's the only place the full migration sequence actually executes end to
end (production's schema was built incrementally, so it never re-runs
these files). One staging-specific fact to not trip over:

- To point one of the HTML apps at staging, make a scratch copy with
  `SUPABASE_URL`/`SUPABASE_KEY` swapped to the local values and never
  commit it — the production values hardcoded in the real files are the
  deployed configuration.

## Payments (PayHere)

Card payments go through PayHere (Sri Lankan gateway) via two edge
functions in `supabase/functions/`:

- `payhere-checkout` — the customer app invokes this to get the signed
  payment object for `payhere.startPayment()` (popup flow). It
  authenticates the caller itself (gateway `verify_jwt` is off — see
  `supabase/config.toml`), checks the order belongs to them / is a card
  order / is unpaid, and signs with the merchant secret, which never
  reaches the browser. `return_url`/`cancel_url` must be real URLs, not
  `undefined` — the popup flow doesn't navigate to them (onCompleted/
  onDismissed callbacks drive the UI instead), but PayHere's own
  `checkoutJ` endpoint 500s if the keys are missing entirely (an
  `undefined` value vanishes on JSON serialization). Found live in
  sandbox: the browser reported it as a CORS failure (no
  Access-Control-Allow-Origin header on PayHere's error response),
  which masked the real 500 until the raw Network tab was checked.
- `payhere-notify` — PayHere's server-to-server webhook, and the ONLY
  writer of a card order's payment outcome. Auth is the `md5sig`
  signature check (requires the merchant secret to forge); it also
  rejects amounts that don't match the order total. Maps status 2→paid,
  -2→failed, -3→refunded; pending/canceled attempts leave the order
  `pending`. The paid/failed/refunded transitions are guarded against
  regressing an already-resolved order (a stale signed webhook can't
  flip a paid order back to failed) — but `paid` must be reachable from
  *either* `pending` or `failed`, not just `pending`: PayHere sends one
  notify call per attempt, so a declined card followed by a same-order
  retry that succeeds sends decline-then-approve, and the guard
  originally only accepted the approve from `pending`, silently
  dropping a genuine success. Found live in sandbox: a real
  decline-then-retry-then-approve run left the order stuck on `failed`
  despite PayHere showing "Payment Approved" with a real payment ID.

The customer app inserts card orders as `payment_status='pending'` and
never marks them paid itself. The franchisee app shows card+pending
orders as "💳 Awaiting payment" (no action button) until the webhook
flips them — the realtime UPDATE handler picks that up automatically.

Both functions need these secrets set in the dashboard (Edge Functions →
Secrets): `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`,
`PAYHERE_SANDBOX` ("true" until the live merchant account is approved),
and `SB_SECRET_KEY` (a new-format `sb_secret_*` API key — the
platform-injected `SUPABASE_SERVICE_ROLE_KEY` is a disabled legacy key
here, see the key-retirement notes above). Deploy with "Enforce JWT
verification" OFF for both (mirrors `supabase/config.toml`).

Verified by running the actual function code against the local staging
stack with dummy merchant credentials (which lets tests forge valid
md5sigs): hash formula, ownership/authz rejections, paid/failed/refunded
mapping, forged-signature and amount-tampering rejection. Note for local
work: the edge-runtime container may fail to boot on TLS-intercepting
networks ("invalid peer certificate") — run the function files directly
under host Deno instead, as that test did.

Both bugs above were caught by an actual PayHere sandbox popup +
decline/retry/approve round-trip on 2026-07-19 (the local staging tests
predate them and use forged signatures, which can't reproduce a bug in
what URLs get sent to PayHere's own servers or in a real multi-attempt
sequence). Re-verified directly against the deployed production
functions afterward with disposable test orders and real forged
signatures — 10/10 checks, including both the decline-then-retry-then-
approve fix and that the original stale-webhook regression guard still
holds.

## Known gaps / open items

- Card payments are integrated with PayHere (see "Payments" above) but
  not yet live: the live merchant activation form was fully submitted
  2026-08-01 and is now in the bank's review queue (form data → bank
  account → CRIB → Risk; PayHere quotes 5-10 business days), so
  production runs in sandbox mode until that's approved. The sandbox
  integration itself is fully verified end-to-end (see "Payments"
  above) — nothing about going live is blocked on code, only on the
  bank review.
  All four payment methods (card/cash/QR/voucher) now insert as
  `payment_status='pending'` and require an actual confirmation event
  before being treated as paid — card via `payhere-notify`, the other
  three via the franchisee tapping "Confirm Payment" (cash lands as
  `cash_confirmed`, QR/voucher as `paid`). A failed card payment can be
  retried: `payhere-checkout` accepts a `failed` order and re-arms it to
  `pending` for a new attempt; the customer app shows a "Retry Payment"
  button on failed card orders.
- Email confirmation on signup was enabled 2026-08-01 (Supabase →
  Authentication → Sign In / Providers → "Confirm email") to stop the
  throwaway-fake-account problem test signups kept creating. It's
  currently running on Supabase's default built-in mailer, which is
  explicitly a testing-only facility with a very low send-rate ceiling —
  confirmed live: a second signup attempt shortly after a first hit
  "email rate limit exceeded", and the first attempt's email eventually
  arrived minutes late rather than instantly. Fine for occasional manual
  testing, but not something real customer signups can rely on — a real
  SMTP provider (Resend was the pick, since it pairs commonly with
  Supabase and has a workable free tier) needs to be wired in via
  Authentication → Emails → SMTP Settings before real customer traffic
  arrives. Domain verification for this was started against `qbrew.app`
  in Resend but paused: Resend's setup wants an MX record on the `send`
  subdomain, which requires switching Namecheap's Mail Settings from
  "Email Forwarding" to "Custom MX" — a change that could affect
  existing `qbrew.app` email forwarding, so it deserves its own careful
  pass rather than being rushed in alongside a testing annoyance. Do
  this properly right before real launch, not before.
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
  brand resolution completes, so there's nothing to theme it with yet
  (it's Liétard's dark theme + real logo specifically, same reasoning
  as below — there's nothing generic to fall back to before brand data
  arrives, and the splash was already hardcoded to Liétard before this).
- Dark theme (opt-in per brand, `brands.dark_theme`, `21-brand-dark-theme.sql`):
  `applyBrandTheme()` sets `document.documentElement.dataset.theme` to
  `'dark'`/`'light'` from the flag, which engages a `:root[data-theme="dark"]`
  CSS override block (near-black surfaces, light text, sans-serif
  `--font-display` in place of the serif). Additive — brands without the
  flag are pixel-identical to before. Liétard is the only brand using it
  today, with its stored colors changed to a real olive-green identity
  (not just a dark-mode recolor of the old burgundy/gold) at the user's
  request, taken from a Lovable-built reference design. `--font-display`'s
  paired `font-style:italic` (used everywhere it appears, for the serif's
  elegant feel) is now `var(--font-display-style)` instead of hardcoded,
  so the dark theme can set it to `normal` for its plain sans-serif look
  without an italic sans-serif ever rendering.
  Building this surfaced two real, previously-undocumented bugs, both
  the same root cause (a hardcoded color bypassing a variable that
  already existed for exactly this purpose) in different places:
  - Many box-shadow colors across buttons/badges/scrims were hardcoded
    to Liétard's *original* burgundy (`rgba(139,26,26,...)`) instead of
    the already-existing `--brand-shadow` variable — every brand's
    shadows had always been burgundy-tinted regardless of their own
    color. Fixed by replacing them with
    `color-mix(in srgb, var(--brand) N%, transparent)` (preserves each
    spot's original alpha exactly, unlike collapsing them all to
    `--brand-shadow`'s fixed 0.3).
  - `.bottom-nav` and `.cart-bar` (the app's persistent bottom
    navigation and the sticky cart summary bar) had their translucent
    background hardcoded to `rgba(255,255,255,X)` — under the dark
    theme this rendered as a stark white bar with no relationship to
    the page around it, which first looked like a layout/alignment bug
    (verified it wasn't: the nav's `getBoundingClientRect()` sits flush
    against `window.innerHeight` with zero gap — `--inset-b` is always
    `0px` in this app, nothing dynamic sets it). It was purely a color
    bug. Fixed the same way, with `color-mix(in srgb, var(--white) N%,
    transparent)` so the translucency effect still works against
    either theme's actual surface color. `.co-bottom`'s matching
    hardcoded shadow (`rgba(26,18,8,...)`, a warm tone tuned for the
    light theme specifically) was replaced with a neutral
    `rgba(0,0,0,0.12)` for the same reason -- these three are the only
    spots on the plain app-shell surface (as opposed to a photo/
    gradient hero background, where white-on-dark is intentional and
    correct regardless of theme) using this pattern.
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
- Native apps (see "Native apps" above): both `apps/lietard/` and
  `apps/staff/` have working Android debug builds, verified against real
  data (Liétard on a real device; Staff against a real seeded franchisee
  login on local staging). Both also have generated iOS projects, but
  **no iOS build has actually been compiled** — that needs a Mac, which
  this project doesn't have access to yet. `codemagic.yaml` is written and
  ready, but needs an Apple Developer Program enrollment and a Codemagic
  account connected before it can run for the first time. `apps/staff/`'s
  icon/splash are an explicit placeholder (a plain "Q" mark built from
  qbrew's own palette, not a real logo) pending an actual qbrew icon-shaped
  mark. No release/App Store signing is set up for either app — sideload
  debug builds only for now.
