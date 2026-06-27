# RECOVERY_PLAN.md — BullMarketSupportBand.com

_Phase 2 deliverable. Companion to `SYSTEM_AUDIT.md`. Goal: restore the existing app with the smallest possible changes and near-zero ongoing cost. No redesign, no stack change._

## Root cause (one sentence)

The Supabase database project was deleted; everything else is intact. Recovery is **rebuild the database + re-ingest data + repoint credentials + re-enable cost-tuned jobs + redeploy** — not a code rewrite.

---

## 1. What is currently broken

1. **Database** — Supabase project `nbsavboafgavrabkxhxn` deleted (DNS NXDOMAIN). All data lost; schema preserved in repo.
2. **Credentials** — `.env.local`, Vercel env, and GitHub secrets point at the dead DB.
3. **Scheduled jobs** — all 9 GitHub Actions + Vercel cron fail (dead DB; possibly auto-disabled for inactivity).
4. **Dashboard / APIs / asset pages** — all return empty/errors (no DB).

## 2. What still works

- Entire codebase: schema SQL, ingestion + backfill scripts, BMSB math, API routes, dashboard UI, workflow definitions.
- Vercel project link and deploy config.
- BMSB methodology (standard 20-wk SMA / 21-wk EMA; to be test-verified in Phase 5).

## 3. Which files need changes (expected to be small)

| File | Change | Why |
|---|---|---|
| `.env.local` | New Supabase URL + anon + service-role keys | Point at the new DB |
| Vercel project env vars | Same new keys + CoinGecko + CRON/ADMIN secrets | Production runtime |
| GitHub Actions secrets | Same new keys | So workflows can write |
| `lib/database-schema.sql` (+ `setup-rls-policies.sql`, `add-bybit-support.sql`, `update-exchange-constraint.sql`) | Run as-is (no edit expected) against new DB | Recreate schema |
| `package.json` | Add a unified `backfill` script + a `test` script | Phase 4 & 5 deliverables |
| `.github/workflows/price-updates.yml` | **Reduce `*/5` → less frequent** (e.g. `*/30` or hourly) | Stay under GA free tier (cost) |
| `app/api/cron/update-bmsb/` | Remove empty dir or add route | Dangling reference (minor) |

**No application/UI redesign. No framework or DB-provider change.** (Justification for keeping Supabase: the schema, client, RLS policies, and all scripts are written for Supabase/Postgres; the only failure was an unpaid/inactive free project, which is fully reproducible on a new free Supabase project. Migrating to another Postgres host would be strictly more work for no benefit.)

## 4. Required environment variables

Group — must be set in **all three** places (`.env.local`, Vercel, GitHub secrets) unless noted:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` _(new values)_
- **CoinGecko:** `COINGECKO_API_KEY`, `COINGECKO_BASE_URL` _(verify existing key works)_
- **Auth:** `CRON_SECRET_KEY`, `ADMIN_API_KEY` _(can reuse existing)_
- **Site:** `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_SITE_URL`
- **Twitter (non-core, optional during restore):** `TWITTER_API_KEY/SECRET`, `TWITTER_ACCESS_TOKEN/SECRET`, `TWITTER_BEARER_TOKEN`, `TWITTER_BOT_HANDLE`, `INCLUDE_SCREENSHOTS`

## 5. Database tables to recreate & repopulate

All from `lib/database-schema.sql`: `cryptocurrencies`, `daily_prices`, `weekly_prices`, `bmsb_calculations`, `market_cap_rankings`, `exchange_mappings`, `twitter_bot_state`, `twitter_bot_posts`. Then apply `setup-rls-policies.sql` and the two exchange `*.sql` patches. **Repopulate** in order: cryptocurrencies → daily/weekly prices (backfill) → exchange mappings → bmsb_calculations.

## 6. Scheduled jobs to restore

Re-enable in GitHub Actions tab after secrets are set, **with reduced price cadence**:
- Keep: BMSB calc (hourly), daily maintenance (ranks/discovery), weekly maintenance, top-150 refresh.
- Tune down: `price-updates.yml` from every 5 min to every 30–60 min (cost). Disable `conservative-update.yml` (redundant).
- Twitter workflows: leave disabled until core dashboard is verified (non-core).

## 7. Market-data providers in use

**CoinGecko only** (Demo/free tier). No Binance/CryptoCompare. Recommendation: keep CoinGecko (existing client, rate limiter, and weekly-close logic are all built around it). Only if the key is dead/insufficient do we evaluate a free replacement — documented in Phase 7.

## 8. Expected ongoing cost

**Decision (2026-06-27):** BMSB will run as a **Micro instance inside the existing Supabase Pro org** (no pausing, no free-tier limits — chosen for public-site reliability). The idle `ccmm` project is being **deleted**, freeing the slot, so BMSB's **net incremental Supabase cost is $0** — the org total stays **$35/mo** (Pro $25 base + 2 Micro $20 − $10 compute credit; the two Micros = `fraxwire` + `bmsb`).

> Why not free tier: a paid Micro can't be paused/limited, which matters for a bookmark-and-leave-open public site. Why not $45: deleting unused `ccmm` lets BMSB reuse its compute slot at no added cost. The $10 compute credit covers exactly one of the two remaining Micros.

| Service | Plan | Est. cost |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| Supabase | Pro org, BMSB on Micro (reuses deleted ccmm's slot) | **$0 incremental** (org stays $35/mo incl. fraxwire) |
| CoinGecko | Demo (free) | $0 — keep cadence within ~10k calls/mo |
| GitHub Actions | Free 2,000 min/mo | $0 **only if** price job cadence is reduced (current `*/5` blows the budget) |
| Vercel Analytics | Free | $0 |
| Domain | bullmarketsupportband.com | already owned (registrar fee only) |
| **BMSB incremental total** | | **~$0/month** with cost-tuning |

## 9. Risks & assumptions

- **Re-pausing risk: eliminated** — BMSB runs on a paid Micro instance (Pro org), which is never auto-paused. (This is the specific failure that killed the original DB, now structurally avoided.)
- **CoinGecko key validity** unverified until DB exists — Phase 3 will ping it.
- **Backfill burst:** ~150 assets × `market_chart` is a one-time ~150 calls; must respect ~30 req/min. Free Demo tier should handle it spread over a few minutes.
- **GA free-tier ceiling:** non-negotiable to reduce the `*/5` price job, or costs return.
- **Assumption:** owner will create the new Supabase project (or grant a Management API token) — see open question below.
- **No data backup exists** of the old DB; history is fully reconstructed from CoinGecko (≈1 year, which is enough for 20/21-week MAs).

## 10. Implementation order

1. **Create new Supabase project** (free tier). Capture URL + anon + service-role keys.
2. **Apply schema** in this exact order (the original 4-file list was incomplete and mis-ordered — corrected below):
   1. `lib/database-schema.sql` (base tables)
   2. `setup-rls-policies.sql` (RLS + policies)
   3. `update-exchange-constraint.sql` — **older** MEXC→KuCoin migration; truncates `exchange_mappings` and sets constraint **without** bybit. Must run **before** bybit.
   4. `add-bybit-support.sql` — adds `bybit` to the constraint. Must run **last** of the two exchange files, or bybit gets stripped back out.
   5. `lib/add-24h-change-fields.sql` — **was missing from the original list.** Adds `price_change_24h`, `price_change_percentage_24h`, `price_updated_at` to `cryptocurrencies`. Without it, `/api/bmsb-data` 500s with `column ... price_change_percentage_24h does not exist`.
   6. `lib/add-previous-health-column.sql` — **was missing from the original list.** Adds `previous_health` to `bmsb_calculations`. Without it, `calculate-database-bmsb` fails every row with `Could not find the 'previous_health' column`. (Also now folded into `database-schema.sql` base so a fresh CREATE includes it.)
   - `lib/database-schema-twitter.sql` — Twitter tables; **deferred** (non-core), apply only when re-enabling the Twitter bot.
3. **Update `.env.local`**; run `npm run check-database-status` to confirm reachability. _(Note: `npm run test-connection` in package.json is a **dead reference** — `scripts/test-connection.ts` doesn't exist; use `check-database-status` instead, or fix/remove the script entry.)_ Local connections must use the **session pooler** host `aws-1-us-east-1.pooler.supabase.com:5432` with user `postgres.<project-ref>` — the direct `db.<ref>.supabase.co` host is IPv6-only and won't resolve from a typical local machine.
4. **Verify CoinGecko** key with a single live call.
5. **Discover assets**: `npm run discover-cryptos` (or top-150) → populates `cryptocurrencies`.
6. **Backfill history** (Phase 4 script): 365-day daily/weekly prices for all assets, idempotent, rate-limited.
7. **Calculate BMSB**: `npm run calculate-database-bmsb`; run coverage checks.
8. **Validate** (Phase 4 report) + **add tests** (Phase 5).
9. **Populate exchange mappings** (for TradingView symbols).
10. **Local run** against new DB; verify dashboard shows data.
11. **Set Vercel env + GitHub secrets**; redeploy.
12. **Re-enable cost-tuned schedules**; verify in production (Phase 8 → `PRODUCTION_CHECKLIST.md`).
13. Only then: SEO analysis (Phase 10).

---

### Immediate open question (gating step 1)

How should the new Supabase project be created? See the chat for options.
