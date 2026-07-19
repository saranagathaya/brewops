# Local staging environment

A full local Supabase stack (Postgres + Auth + Storage + Realtime + Studio)
running in Docker, built from this repo's migration files. It exists so
schema/RLS changes can be tried against a disposable database instead of
production — the free Supabase plan's project limit ruled out a second
cloud project.

First validated 2026-07-15: running the complete 00→18 migration sequence
from a truly empty database for the first time surfaced two real bugs in
`00-base-schema.sql` (FK constraints ordered before the PK/UNIQUE
constraints they reference; missing default GRANTs for
`anon`/`authenticated`/`service_role` — hosted Supabase grants those as
invisible platform bootstrapping, so they'd never been needed before).
Both are fixed in that file, and after fixing, `tools/rls-check` run
against staging produced results identical to production's — same
isolation counts, same reviewed catalog crossings, same documented
`outlet_health` residual gap.

## Prerequisites

- Docker Desktop installed and running (`docker ps` works)
- Node.js

## Setup from scratch

```
cd <repo root>
npx -y supabase init        # only if supabase/config.toml doesn't exist yet
npx -y supabase start       # first run downloads ~2GB of images; can take a while
```

`supabase start` prints the local stack's URLs and keys. Defaults:

| What | Where |
|---|---|
| API (use as `SUPABASE_URL`) | `http://127.0.0.1:54321` |
| Postgres | `127.0.0.1:54322`, user/password/db all `postgres` |
| Studio (dashboard UI) | `http://127.0.0.1:54323` |
| anon key | printed by `supabase start` (well-known local demo JWT, not a secret) |

Then build the schema and seed test data:

```
cd tools/staging
npm install
node run-migrations.js      # runs 00→20 in order (19 drops the 3
                            # notification triggers everywhere — they
                            # carried a legacy key and hardcoded
                            # production's edge-function URL; 20 fixes
                            # a real order_number race condition)
node seed-staging.js        # both test brands + outlet + franchisor/
                            # franchisee login per brand (see its header
                            # for the emails; password "staging-password"),
                            # plus one isolation "probe row" per brand in
                            # each sensitive table so tools/rls-check has
                            # data that COULD leak (without them a fresh
                            # DB passes vacuously)
```

The same sequence runs automatically in CI on every SQL-touching push/PR
(`.github/workflows/rls-check.yml`), which also has a nightly read-only
drift check against production.

Finally create the `brewops-images` storage bucket (public) via Studio →
Storage, matching production.

## Verifying RLS parity

```
cd tools/rls-check && npm install
PGSSL=false PGHOST=127.0.0.1 PGPORT=54322 PGUSER=postgres PGPASSWORD=postgres PGDATABASE=postgres node check.js
```

`PGSSL=false` is required: the local stack doesn't speak SSL, while the
cloud session pooler requires it (the script defaults to SSL on).

## Pointing an app at staging

Copy one of the three HTML apps to a scratch file, swap its
`SUPABASE_URL`/`SUPABASE_KEY` constants to the local values above, and
serve it. **Never commit that scratch copy** — the hardcoded production
values in the real files are the deployed configuration.

## Day-to-day

- `npx supabase stop` — stops containers, **keeps** all data
- `npx supabase start` — resumes where you left off
- `npx supabase stop --no-backup` — stops and wipes, for a fresh rebuild
- Full schema reset without container restart: run
  `drop schema public cascade; create schema public;` in Studio's SQL
  editor, then re-run `run-migrations.js` + `seed-staging.js`

## What staging deliberately lacks

- The `send-notification` edge function (dormant on production anyway —
  migration 19 dropped the triggers that called it, everywhere)
- Production data — only the seed script's minimal rows
