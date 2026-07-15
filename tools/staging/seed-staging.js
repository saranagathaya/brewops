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
      // The empty-string token columns are load-bearing: GoTrue scans them
      // as Go strings, and NULLs make every login for the user fail with
      // 500 "Database error querying schema" (found the hard way against
      // production). Same for the auth.identities row below — real signups
      // create one, and logins without it break.
      // raw_user_meta_data drives the on_auth_user_created trigger
      // (00-base-schema), which creates the profiles row from it — same
      // path a real signup takes. Franchisees get an outlet_id there;
      // leaving it null makes every outlet-scoped RLS check a meaningless
      // zero (see tools/rls-check).
      const meta = {
        role,
        full_name: `Staging ${role} (${brand.slug})`,
        ...(role === 'franchisee' ? { outlet_id: outletId } : {}),
      };
      const userRes = await c.query(
        `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
                                 confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
         values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, crypt('staging-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', $2,
                 '', '', '', '', '', '', '', '')
         returning id`,
        [email, JSON.stringify(meta)]
      );
      const userId = userRes.rows[0].id;
      await c.query(
        `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
         values (gen_random_uuid(), $1::uuid, $2::text, jsonb_build_object('sub', $2::text, 'email', $3::text, 'email_verified', true), 'email', now(), now(), now())`,
        [userId, userId, email]
      );
      // The trigger doesn't know about brands (predates multibrand) —
      // brand_id is set here, same as the apps' client-side upsert does.
      const up = await c.query(`update profiles set brand_id = $1 where id = $2`, [brand.id, userId]);
      if (up.rowCount !== 1) throw new Error(`trigger did not create profile for ${email}`);
      console.log(`${brand.slug} / ${role}: user ${userId}, email ${email}`);
    }
  }

  await c.end();
  console.log('\nSeed complete.');
}
main().catch(e => { console.error(e.message); process.exit(1); });
