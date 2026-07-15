// ══ RLS cross-brand isolation regression check ══
//
// Verifies that BrewOps's Postgres RLS policies actually enforce the
// brand isolation the README claims ("full multi-brand data isolation
// enforced at the database (RLS) layer"), rather than relying on manual
// testing against the two permanent test tenants (lietard,
// testbrand-coffee-co) as the only line of defense.
//
// How it works: for every table with a `brand_id` column, it impersonates
// a real franchisor/franchisee from each test brand — by switching the
// Postgres session to the `authenticated` role and setting the same
// `request.jwt.claims` GUC that PostgREST sets from a real JWT — and
// checks whether that user can see rows belonging to the OTHER brand.
// This exercises the actual RLS policy logic (not a mock), but skips the
// HTTP/GoTrue layer, so no test-user passwords are needed — it only
// requires the DB credentials already used for schema work.
//
// Entirely read-only: every check runs inside a transaction that gets
// rolled back, never committed.
//
// Usage:
//   cd tools/rls-check && npm install
//   PGHOST=... PGPORT=... PGUSER=... PGPASSWORD=... PGDATABASE=... node check.js
// (Use the Supabase "Session pooler" connection details — the direct
// db.<ref>.supabase.co host is IPv6-only and won't resolve on many
// networks. Never commit these credentials to the repo.)
//
// Exit code 0 = no unreviewed leaks found. Exit code 1 = at least one
// table leaked cross-brand rows outside the KNOWN_PUBLIC_CATALOG_TABLES
// allowlist below.

const { Client } = require('pg');

const TEST_BRAND_SLUGS = ['lietard', 'testbrand-coffee-co'];
const ROLES_TO_TEST = ['franchisor', 'franchisee'];

// Tables manually reviewed and confirmed to intentionally expose
// cross-brand rows to any anon/authenticated caller — read-only catalog
// or settings data (menu/merch listings, promos, coupons, outlet
// directory, invite-code lookup), not PII or financial data. The app
// layer applies its own brand filter for these; RLS here only gates
// visibility flags (is_visible/is_active), not brand.
//
// This is a hand-reviewed list, not a regex guess against policy text —
// a heuristic like that previously misclassified a genuine PII leak on
// `orders` as "fine" because its policy text happened to not match a
// brand-scoping pattern, same as real catalog tables. Do not replace
// this with pattern-matching; add to it only after actually reading the
// table's policies and confirming the exposed columns are non-sensitive.
const KNOWN_PUBLIC_CATALOG_TABLES = new Set([
  'menu_items', 'merch_items', 'menu_categories', 'merch_categories',
  'promo_slides', 'home_banner', 'coupons', 'outlets', 'invite_codes',
  'app_settings',
]);

async function main() {
  // Cloud Supabase (session pooler) requires SSL; a local Supabase CLI
  // stack (127.0.0.1) doesn't speak SSL at all. Set PGSSL=false when
  // pointing this at a local `supabase start` instance for staging.
  const useSsl = process.env.PGSSL !== 'false';
  const client = new Client({
    host: process.env.PGHOST,
    port: +(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'postgres',
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  const brands = (await client.query(
    `select id, slug from brands where slug = any($1)`,
    [TEST_BRAND_SLUGS]
  )).rows;
  if (brands.length < 2) {
    console.error(`Expected both test brands to exist, found: ${brands.map(b => b.slug).join(', ') || '(none)'}`);
    process.exit(1);
  }

  // One representative real profile per (brand, role) — reused as the
  // impersonated identity for that combination. For franchisees, prefer
  // one that actually has an outlet_id assigned: an unordered `limit 1`
  // previously picked a real franchisee account with no outlet, which
  // made every outlet-scoped policy correctly show zero rows and looked
  // like a leak-free-but-suspiciously-empty result — not an RLS bug, just
  // a meaningless test subject for that role.
  const actors = [];
  for (const brand of brands) {
    for (const role of ROLES_TO_TEST) {
      const orderBy = role === 'franchisee' ? 'order by outlet_id nulls last' : '';
      const { rows } = await client.query(
        `select id, outlet_id from profiles where brand_id = $1 and role = $2 ${orderBy} limit 1`,
        [brand.id, role]
      );
      if (rows.length) {
        if (role === 'franchisee' && !rows[0].outlet_id) {
          console.warn(`note: only franchisee profile found for brand "${brand.slug}" has no outlet_id — outlet-scoped checks for this actor will be meaningless zeros, not evidence of isolation`);
        }
        actors.push({ brand, role, profileId: rows[0].id });
      } else {
        console.warn(`skip: no ${role} profile found for brand "${brand.slug}" — nothing to test this combination with`);
      }
    }
  }

  const brandTables = (await client.query(`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'brand_id'
    order by table_name`)).rows.map(r => r.table_name);

  const results = [];

  for (const actor of actors) {
    const otherBrandIds = brands.filter(b => b.id !== actor.brand.id).map(b => b.id);

    for (const table of brandTables) {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(
          `select set_config('request.jwt.claims', $1, true)`,
          [JSON.stringify({ sub: actor.profileId, role: 'authenticated' })]
        );

        const { rows } = await client.query(
          `select brand_id, count(*)::int as n from "${table}" group by brand_id`
        );

        const ownCount = rows.filter(r => r.brand_id === actor.brand.id).reduce((s, r) => s + r.n, 0);
        const foreignRows = rows.filter(r => otherBrandIds.includes(r.brand_id));
        const foreignCount = foreignRows.reduce((s, r) => s + r.n, 0);

        results.push({
          table,
          brand: actor.brand.slug,
          role: actor.role,
          ownVisible: ownCount,
          foreignVisible: foreignCount,
          knownPublic: KNOWN_PUBLIC_CATALOG_TABLES.has(table),
        });
      } catch (e) {
        results.push({ table, brand: actor.brand.slug, role: actor.role, error: e.message });
      } finally {
        await client.query('ROLLBACK');
      }
    }
  }

  await client.end();
  report(results);
}

function report(results) {
  const errors = results.filter(r => r.error);
  const leaks = results.filter(r => r.foreignVisible > 0 && !r.knownPublic);
  const acknowledged = results.filter(r => r.foreignVisible > 0 && r.knownPublic);
  const clean = results.filter(r => !r.error && r.foreignVisible === 0);
  // Positive check: a policy that's accidentally too strict would pass
  // every leak check above while silently breaking the app for real
  // users — a leak-only report can't tell "isolated" apart from "nobody
  // can see anything, including their own brand." This is a soft signal,
  // not a hard failure: zero rows can legitimately mean the test brand
  // just has no data yet in that table (e.g. a fresh brand with no
  // waste_logs recorded), so it's worth a human glance, not a CI gate.
  const zeroOwnVisibility = results.filter(r => !r.error && r.ownVisible === 0);

  console.log(`\n${clean.length} check(s) isolated correctly.`);

  if (acknowledged.length) {
    const tables = [...new Set(acknowledged.map(r => r.table))];
    console.log(`\n${acknowledged.length} check(s) saw cross-brand rows on tables in the reviewed KNOWN_PUBLIC_CATALOG_TABLES allowlist: ${tables.join(', ')}`);
  }

  if (zeroOwnVisibility.length) {
    console.log(`\n${zeroOwnVisibility.length} check(s) saw ZERO own-brand rows — could just mean no data exists yet, but worth a glance in case a policy is over-restrictive:`);
    for (const z of zeroOwnVisibility) console.log(`  "${z.table}" — ${z.brand}/${z.role} sees none of their own brand's rows`);
  }

  if (errors.length) {
    console.log(`\n${errors.length} check(s) errored:`);
    for (const e of errors) console.log(`  ${e.table} (${e.brand}/${e.role}): ${e.error}`);
  }

  if (leaks.length) {
    console.log(`\nLEAKS — cross-brand rows visible on a table NOT in the reviewed allowlist. Investigate before dismissing:`);
    for (const l of leaks) {
      console.log(`  "${l.table}" — ${l.brand}/${l.role} saw ${l.foreignVisible} row(s) belonging to another brand`);
    }
    process.exitCode = 1;
  } else {
    console.log(`\nNo leaks outside the reviewed allowlist.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
