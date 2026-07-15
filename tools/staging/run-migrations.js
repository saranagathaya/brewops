// ══ Staging migration runner ══
//
// Runs every migration file (00 through 18) in order against the LOCAL
// Supabase stack started by `npx supabase start` (see README.md in this
// folder). Stops on the first error.
//
// Deliberately hardcoded to 127.0.0.1:54322 with the Supabase CLI's
// well-known default credentials — this must never be pointed at
// production. Production's schema already exists; migrations are applied
// there one at a time via the dashboard SQL editor.
//
// Usage:  cd tools/staging && npm install && node run-migrations.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Keep in numeric order — these are NOT independent (see CLAUDE.md,
// "Database / migrations"). Add new migrations to the end of this list.
const files = [
  '00-base-schema.sql', '01-merch-products.sql', '02-merch-detail-blocks.sql',
  '03-stock-requests-fulfillment.sql', '04-customer-addresses.sql', '05-beverage-options.sql',
  '06-favourites.sql', '07-order-items-image.sql', '08-multibrand-schema.sql',
  '09-multibrand-platform-admin.sql', '10-multibrand-brand-tagline.sql',
  '11-multibrand-rls-retrofit.sql', '12-multibrand-rls-addendum.sql', '13-multibrand-views.sql',
  '14-brand-accounts-function.sql', '15-rls-orders-and-view-security-fixes.sql',
  '16-notification-triggers-drop-service-role.sql', '17-daily-ops-rls-tighten.sql',
  '18-app-settings-composite-key.sql',
  // Staging-only: 00 and 16 hardcode PRODUCTION's edge-function URL into
  // three webhook triggers; left in place on staging, any invoice/machine/
  // rent update would silently POST to production. Dropping them loses
  // nothing (no Telegram bot exists yet — see CLAUDE.md known gaps).
  'tools/staging/staging-only-drop-notification-triggers.sql',
];

async function main() {
  const client = new Client({
    host: '127.0.0.1', port: 54322,
    user: 'postgres', password: 'postgres', database: 'postgres',
  });
  await client.connect();
  const root = path.join(__dirname, '..', '..');
  for (const f of files) {
    const sql = fs.readFileSync(path.join(root, f), 'utf8');
    try {
      await client.query(sql);
      console.log('OK   ' + f);
    } catch (e) {
      console.log('FAIL ' + f + ' -> ' + e.message);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
  console.log('\nAll migrations applied successfully.');
}
main().catch(e => { console.error(e); process.exit(1); });
