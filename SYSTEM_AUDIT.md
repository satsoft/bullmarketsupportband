# SYSTEM_AUDIT.md — BullMarketSupportBand.com

_Audit date: 2026-06-27. Phase 1 deliverable. Read-only audit; no application code was changed to produce this report._

This document describes the **existing** system as built, the **data flow**, and the **current problems**. It distinguishes:

- **[EXISTING]** — how the system was designed to work
- **[BROKEN]** — something that is currently non-functional
- **[MISSING DATA]** — data that should exist but does not
- **[IMPROVEMENT]** — a recommendation (deferred; not part of restore)

---

## 1. Existing architecture

| Layer | Technology | Notes |
|---|---|---|
| **Frontend framework** | Next.js 15.3.4 (App Router), React 19, TypeScript | `app/` directory. Dashboard is a **client component** (`app/components/Dashboard.tsx`). |
| **Styling** | Tailwind CSS 3.4 + Radix UI primitives + lucide-react icons | `tailwind.config.js`, `components.json` |
| **Backend / API** | Next.js API routes (`app/api/**/route.ts`) | No separate backend service. All server logic runs as Vercel serverless functions. |
| **Database** | **Supabase (hosted PostgreSQL)** | Client in `lib/supabase.ts`. Project ref was `nbsavboafgavrabkxhxn`. **See §4 — this project has been deleted.** |
| **Hosting** | **Vercel** | Project `prj_dhNCjeS3uGz60QnGGUKBz3TvVkQU`, org `team_r9y01Jus029mQQaL4In2RYLk` (`.vercel/project.json`). Domain: bullmarketsupportband.com. |
| **Data provider** | **CoinGecko** (Demo/free tier, `x-cg-demo-api-key`) | `lib/coingecko.ts`. **Sole** market-data provider. No Binance / CryptoCompare integration (Binance/Coinbase names appear only as TradingView chart symbols). |
| **Charts** | TradingView embedded widget | `app/components/TradingViewChart.tsx` (1W candles + 20 SMA / 21 EMA studies). Client-side script. |
| **Scheduled jobs** | **GitHub Actions** (9 workflows) + **1 Vercel cron** | Cron moved off Vercel to GitHub Actions historically to control Vercel bandwidth (commit `63a49de`). |
| **Analytics** | Vercel Analytics (`@vercel/analytics`) | Wrapped in `app/layout.tsx`. |
| **Social** | Twitter bot (`twitter-api-v2` + Puppeteer screenshots) | `scripts/twitter-*.ts`, `app/api/twitter/**`. Non-core. |

### Database tables [EXISTING]

Defined in `lib/database-schema.sql` (+ `setup-rls-policies.sql`, `add-bybit-support.sql`, `update-exchange-constraint.sql`). All PKs are UUID; child tables FK to `cryptocurrencies(id)` `ON DELETE CASCADE`.

| Table | Purpose | Key columns / constraints |
|---|---|---|
| `cryptocurrencies` | Master asset list & metadata | `coingecko_id` (UNIQUE), `symbol`, `name`, `current_rank`, `is_active`, `is_stablecoin`, `categories[]`, `price_change_percentage_24h`, `price_change_24h`, `price_updated_at` |
| `daily_prices` | Daily OHLCV (drives live price + BMSB) | UNIQUE `(cryptocurrency_id, date)` |
| `weekly_prices` | Weekly aggregated OHLCV | UNIQUE `(cryptocurrency_id, week_start_date)` |
| `bmsb_calculations` | Stored BMSB results | UNIQUE `(cryptocurrency_id, calculation_date)`; CHECKs on `price_position`, `sma_trend`, `ema_trend`, `band_health` |
| `market_cap_rankings` | Historical rank snapshots | `rank`, `market_cap`, `recorded_at` |
| `exchange_mappings` | TradingView symbol per asset | UNIQUE `(cryptocurrency_id, exchange_name)`; `is_preferred` |
| `twitter_bot_state`, `twitter_bot_posts` | Bot state & post log | JSONB state; post_type |

### BMSB calculation [EXISTING]

Production path is `lib/database-bmsb-calculator.ts` (`DatabaseBMSBCalculator`), which computes **from stored `daily_prices` — zero external API calls**. Three other calculator classes exist (`bmsb-calculator.ts`, `optimized-bmsb-calculator.ts`, `historical-bmsb-calculator.ts`) with identical math, used only for setup/backfill.

- **SMA20** = mean of the **last 20 weekly closes** (`weeklyPrices.slice(-20)` averaged).
- **EMA21** = standard EMA, multiplier `2/(21+1) = 0.0909`, **seeded** with the SMA of the first 21 weeks, then rolled forward over **all** available weekly closes (for stability).
- **Band:** `lower = min(SMA20, EMA21)`, `upper = max(SMA20, EMA21)`.
- **Position:** `price > upper → above_band`; `price < lower → below_band`; else `in_band`.
- **Band health:** `healthy` if both SMA20 and EMA21 trends are increasing; else `weak`; `stablecoin` (→ `is_applicable=false`) for flagged stablecoins.
- **Weekly boundary:** Monday→Sunday **UTC** (`getUTCDay()`). CoinGecko returns daily opens, so the code treats **Monday's value as the prior Sunday's close**. Only completed weeks are used; the current incomplete week is excluded.
- **Minimum history:** ~147 days (~21 weeks) required, or the asset is excluded as `insufficient_data`.

### Top-100 / top-150 selection [EXISTING]

`CurrentPriceService.updateTop150Cryptocurrencies()` (`lib/current-price-service.ts`) pulls CoinGecko `/coins/markets?per_page=150&page=1` (top 150 as a buffer), upserts into `cryptocurrencies`, and keyword-flags stablecoins. The dashboard API (`app/api/bmsb-data/route.ts`) reads top ~175, applies `shouldExcludeToken()` (stablecoins, wrapped/staking/synthetic/cross-chain, insufficient data), keeps only rows with non-null SMA20 **and** EMA21, then returns the top `limit` (default 100).

### Update frequency [EXISTING] (GitHub Actions unless noted)

| Job | Schedule | Action |
|---|---|---|
| `price-updates.yml` | `*/5 * * * *` | POST `/api/admin/update-prices` (full price refresh) |
| `update-prices.yml` | hourly | POST `/api/cron/update-prices` (smart: top-20 hourly, full daily) |
| `bmsb-calculations.yml` | `5 * * * *` | `scripts/calculate-database-bmsb.ts` (recompute BMSB from DB) |
| `daily-maintenance.yml` | `0 1 * * *` | rankings + token discovery + top-150 |
| `update-top-cryptocurrencies.yml` | `0 6 * * *` | refresh top-150 |
| `weekly-maintenance.yml` | `0 2 * * 0` | diagnostics only |
| `twitter-daily-update.yml` | `0 12 * * *` | daily tweet |
| `twitter-health-alerts.yml` | `20 */2 * * *` | health-change tweets |
| `conservative-update.yml` | every 4h (template/disabled) | backup price update |
| Vercel cron (`vercel.json`) | `0 9 * * *` | `/api/twitter/daily-summary` |

---

## 2. Current data flow [EXISTING]

```
CoinGecko (/coins/markets, /coins/{id}/market_chart, /simple/price)
  → ingestion:
       scripts/ingest-historical-data.ts        (one-time: 365d OHLC → weekly_prices + daily_prices)
       lib/current-price-service.ts             (recurring: daily_prices, ranks, 24h change)
  → Supabase (daily_prices, weekly_prices, cryptocurrencies, market_cap_rankings, exchange_mappings)
  → moving averages:
       scripts/calculate-database-bmsb.ts → DatabaseBMSBCalculator (reads daily_prices, no API)
  → stored in bmsb_calculations
  → application API:
       app/api/bmsb-data/route.ts  (joins cryptocurrencies + bmsb_calculations + daily_prices + exchange_mappings,
                                     excludes via shouldExcludeToken, 5-min in-memory cache, 60 req/min limit)
  → dashboard:
       app/components/Dashboard.tsx  (client) fetches /api/bmsb-data?limit=100
  → "live" price updates:
       client setInterval re-fetches /api/bmsb-data every 120s. No WebSocket/SSE.
       "Live" freshness ultimately bounded by the */5-min price job + 5-min API cache.
```

**Live-price mechanism in detail [EXISTING]:** purely client **polling** every 2 minutes (`setInterval(fetchBMSBData, 120000)` in `Dashboard.tsx`) against `/api/bmsb-data`. No WebSocket, SSE, SWR, or React Query. No tab-visibility handling, no reconnect/backoff, no explicit "stale" badge (there is a 15s fetch abort + Retry button). No secret keys are exposed client-side (only the Supabase anon key and CoinGecko attribution text). Real freshness = CoinGecko → `daily_prices` (every 5 min) → API cache (5 min) → client poll (2 min).

---

## 3. BMSB values: stored vs computed

BMSB values are **stored** in `bmsb_calculations` (upsert keyed by `(cryptocurrency_id, calculation_date)`) and **read** by the API — they are **not** recomputed per request. They are regenerated hourly by `bmsb-calculations.yml`.

---

## 4. Current problems

### 🔴 CRITICAL — the database no longer exists [BROKEN] [MISSING DATA]

- The Supabase REST host `nbsavboafgavrabkxhxn.supabase.co` returns **NXDOMAIN** (DNS does not resolve). `npm run check-database-status` fails with `TypeError: fetch failed`.
- **Confirmed by the owner**: the Supabase project was deleted (free-tier projects pause after inactivity and are deleted after extended pausing). The current Supabase org contains only `ccmm` and `fraxwire` — neither is this project.
- **Consequence:** every data-dependent surface is down — `/api/bmsb-data`, `/api/summary`, the dashboard, all asset pages, and all scheduled jobs (they all read/write this database). **All historical price data, rankings, exchange mappings, and BMSB results are lost** and must be re-created and re-ingested. The schema itself survives in `lib/database-schema.sql` and the root `*.sql` files.

### 🟠 Environment / credentials [BROKEN]

- `.env.local` still points at the dead Supabase project (URL + anon + service-role keys are now invalid). These must be replaced with credentials for a **new** Supabase project. Vercel env vars and GitHub Actions secrets will need the same update.
- CoinGecko key in `.env.local` (`CG-o3q…`) is present but **unverified** (cannot be exercised until the DB exists; needs a live ping). Twitter keys present but non-core.

### 🟠 Scheduled jobs [BROKEN]

- All 9 GitHub Actions and the Vercel cron currently target the dead DB / dead deployment, so they are effectively no-ops or failing. They cannot succeed until the DB and env vars are restored.
- The most recent commits (`Refresh GitHub Actions to prevent 60-day expiration`) suggest GitHub auto-disabled the workflows due to repo inactivity — they may need to be re-enabled in the Actions tab.

### 🟡 Cost / sustainability concerns [EXISTING, IMPROVEMENT]

- `price-updates.yml` at **every 5 minutes** ≈ 8,640 GA-minutes/month alone — **well over** the 2,000-min free tier. This (plus prior 20 GB Vercel bandwidth overage, commit `63a49de`) is likely part of why costs/inactivity led to the lapse. **Recommend reducing price cadence during restore** (see RECOVERY_PLAN.md §8).
- CoinGecko free Demo tier (~10k calls/month, ~30 req/min) is **near its ceiling** under the old cadence. Backfill of ~150 assets × 365-day market_chart must be rate-limited and is a one-time burst.

### 🟡 Quality / testing gaps [EXISTING]

- **No automated test suite** (`package.json` has no `test` script; no `*.test.ts`). Only manual `testBMSBCalculations()` and diagnostic scripts. Phase 5 will add real tests.
- Four near-duplicate BMSB calculator classes — maintenance risk, not a blocker.
- `app/api/cron/update-bmsb/` directory exists but is **empty** (no `route.ts`) — dangling reference.

### 🟡 Not yet verified (blocked by dead DB)

- Whether the local app builds/runs (`npm run build`) — frontend should build, but runtime shows no data without a DB.
- CoinGecko key validity, Vercel deployment state, and which GitHub secrets are still set.

---

## 5. What still works [EXISTING]

- The **codebase is intact**: schema SQL, ingestion/backfill scripts, BMSB math, API routes, dashboard, and all 9 workflow definitions are present and coherent.
- BMSB **methodology is sound** and matches the standard definition (will be confirmed with tests in Phase 5).
- Deployment **configuration** (Vercel project link, `vercel.json`, headers, caching) is intact.
- No secrets are leaked to the browser; auth on admin/cron endpoints is in place.

**Bottom line:** This is a **data/infrastructure outage, not a code rot problem.** The single root cause is the deleted Supabase database. Recovery = stand up a new Supabase project, apply the existing schema, re-ingest history from CoinGecko, recompute BMSB, repoint env/secrets, re-enable (cost-tuned) schedules, redeploy.
