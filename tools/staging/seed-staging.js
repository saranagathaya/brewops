// ══ Staging seed data ══
//
// Seeds the LOCAL staging stack (after run-migrations.js) with the two
// permanent test brands' minimum viable data: the testbrand-coffee-co
// brand row (00-base-schema seeds lietard; migration 08 seeds nothing),
// one outlet per brand, and one franchisor + one franchisee login per
// brand. Idempotence: not guarded — run it once against a fresh stack;
// re-running duplicates outlets and fails on the unique user emails.
//
// Logins it creates (password for all four: "staging-password"):
//   staging-franchisor-lietard@example.com
//   staging-franchisee-lietard@example.com
//   staging-franchisor-testbrand-coffee-co@example.com
//   staging-franchisee-testbrand-coffee-co@example.com
//
// CAUTION — auth.users direct insert: this writes straight into GoTrue's
// internal table (with crypt()/gen_salt('bf') for the password), which
// Supabase does not guarantee schema-stable across versions. It works on
// the CLI stack this was built against (Postgres 17.6 / CLI mid-2026);
// if a future CLI version rejects the insert, switch to signing up via
// the local Auth API (http://127.0.0.1:54321/auth/v1/signup with the
// local anon key) instead of chasing new internal columns.
//
// Usage:  cd tools/staging && npm install && node seed-staging.js

const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: '127.0.0.1', port: 54322,
    user: 'postgres', password: 'postgres', database: 'postgres',
  });
  await c.connect();

  // lietard exists from 00-base-schema; testbrand-coffee-co has to be created.
  await c.query(`
    insert into brands (name, slug, is_active)
    select 'TestBrand Coffee Co.', 'testbrand-coffee-co', true
    where not exists (select 1 from brands where slug = 'testbrand-coffee-co')`);

  const brands = (await c.query(
    `select id, slug from brands where slug in ('lietard','testbrand-coffee-co')`
  )).rows;

  for (const brand of brands) {
    const outletRes = await c.query(
      `insert into outlets (name, location, brand_id, is_active) values ($1, 'Test Location', $2, true) returning id`,
      [brand.slug === 'lietard' ? 'Colombo Test Outlet' : 'TestBrand Test Outlet', brand.id]
    );
    const outletId = outletRes.rows[0].id;

    for (const role of ['franchisor', 'franchisee']) {
      const email = `staging-${role}-${brand.slug}@example.com`;
      const userRes = await c.query(
        `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
         values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, crypt('staging-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}')
         returning id`,
        [email]
      );
      const userId = userRes.rows[0].id;
      // Franchisees are outlet-scoped; leaving outlet_id null makes every
      // outlet-scoped RLS check a meaningless zero (see tools/rls-check).
      await c.query(
        `insert into profiles (id, role, full_name, brand_id, outlet_id) values ($1, $2, $3, $4, $5)`,
        [userId, role, `Staging ${role} (${brand.slug})`, brand.id, role === 'franchisee' ? outletId : null]
      );
      console.log(`${brand.slug} / ${role}: user ${userId}, email ${email}`);
    }
  }

  await c.end();
  console.log('\nSeed complete.');
}
main().catch(e => { console.error(e.message); process.exit(1); });
