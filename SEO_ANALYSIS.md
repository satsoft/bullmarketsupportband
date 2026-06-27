# SEO_ANALYSIS.md — BullMarketSupportBand.com

_Phase 10 deliverable. **Analysis and recommendations only** — no code, URL, or content changes were made in producing this report. Companion to `SEO_IMPLEMENTATION_PLAN.md`._

**Audited:** 2026-06-27 against commit `104ff8f`, live site `https://www.bullmarketsupportband.com`.
**Scope:** Next.js 15 (App Router) on Vercel; Supabase/CoinGecko data; single live dashboard + a client-only `[ticker]` route.

> ⚠️ **Hard constraint honored throughout:** do not change existing URLs that may already rank without first planning redirects. The only currently-public HTML URL is `/` (the homepage). Everything else proposed here is **additive**.

---

## 0. Executive summary

The site is technically clean in the basics (one strong H1, valid WebApplication JSON-LD, sensible robots directives, OG/Twitter cards, mobile viewport) but has **three structural SEO problems** that cap its ceiling:

1. **All meaningful content is client-rendered.** The top-100 table, every price, and every BMSB value are fetched from `/api/bmsb-data` *after* page load. The initial HTML contains the concept name and chrome but **zero market data and no educational copy**. There is nothing for search engines to index beyond the title/description.
2. **There is no indexable content surface beyond the homepage.** No educational page, no methodology page, no real asset pages. The `[ticker]` route exists but is client-only, has duplicate metadata, and isn't linked or in the sitemap.
3. **The catch-all `[ticker]` route produces soft-404s.** Any unknown path (e.g. `/methodology`, `/this-is-not-a-real-asset-xyz`) currently returns **HTTP 200** with a client-side "not found" message. This is a soft-404 pattern Google penalizes and it will collide conceptually with the proposed static pages until those real routes are added.

None of these are emergencies, and the fixes are mostly additive and low-risk. Priorities are in `SEO_IMPLEMENTATION_PLAN.md`.

---

## 1. Technical SEO audit

### 1.1 Indexed / indexable URLs
| URL | Type | Status | Notes |
|---|---|---|---|
| `/` | Homepage (client dashboard) | 200, indexable | The only genuinely public content page. |
| `/[ticker]` (e.g. `/btc`) | Dynamic, client-only | 200 | Symbol-based. No unique metadata, no SSR data, not linked, not in sitemap. Effectively an orphan. |
| `/test-bmsb`, `/test-dashboard`, `/test-spacing`, `/test-tooltip` | Dev/test pages | 200 | Thin. Blocked via `robots.txt` `Disallow: /test-*` but **not** `noindex` — still indexable if linked anywhere. Recommend removing or `noindex`. |
| `/sitemap.xml`, `/robots.txt` | Infra | 200 | See 1.5–1.6. |
| any unknown path | `[ticker]` catch-all | **200 (soft-404)** | e.g. `/methodology` → 200 today. Should be a real 404 or a real page. |

There is **no Search Console verification** in place, so we cannot see what Google has actually indexed. Verifying GSC is the single highest-value first step (see plan P1).

### 1.2 Page titles
- Homepage title: `Bull Market Support Band - Real-time Crypto BMSB Analysis` — good, keyword-aligned, ~52 chars.
- Title template configured: `%s | Bull Market Support Band` (good — ready for per-page titles).
- **Problem:** the `[ticker]` pages have **no `generateMetadata`**, so they all inherit the homepage default title → **duplicate titles** across every asset page. (Not yet harmful only because those pages aren't indexed/linked.)

### 1.3 Meta descriptions
- Homepage description is present, descriptive, ~190 chars (slightly long; Google may truncate ~160). Acceptable.
- No per-page descriptions anywhere else.

### 1.4 Canonical tags
- **None present.** No `<link rel="canonical">` in the live `<head>` (no `alternates.canonical` in metadata).
- **Host inconsistency:** `metadataBase`, OG `og:url`, and the JSON-LD `url` all use the **non-www** apex `https://bullmarketsupportband.com`, but the site **serves on www** (`https://www.bullmarketsupportband.com`) via an apex→www redirect. So every canonical signal points at a URL that immediately redirects. Pick one canonical host and make all signals agree with the host that actually serves 200s.

### 1.5 Sitemap — **misconfigured / conflicting (3 competing definitions)**
- `app/sitemap.ts` — dynamic, 3 URLs (`/`, `/api/bmsb-data`, `/api/summary`), `lastModified: new Date()`.
- `app/sitemap.xml` — a **static file** that also resolves to `/sitemap.xml` (Next.js dev emits a "Duplicate page detected" warning for exactly this).
- `vercel.json` rewrite: `/sitemap.xml → /api/sitemap` — but **no `/api/sitemap` route exists**.
- **Live result:** `/sitemap.xml` serves only 2 URLs with a hard-coded `lastmod` of `2025-01-21` — i.e. a stale source is winning, not `sitemap.ts`.
- **Content problems regardless of source:** it lists **JSON API endpoints** (`/api/bmsb-data`, `/api/summary`) which are not HTML pages and should not be in a sitemap, and it omits every real (future) content page.
- **Action:** collapse to a single dynamic `sitemap.ts`, remove the static file and the dead rewrite, drop the API URLs, add real pages as they ship.

### 1.6 robots.txt
- Reasonable: `Allow: /`, `Disallow: /test-*`, `Disallow: /api/admin/`, `Disallow: /api/cron/`, explicit Googlebot/Bingbot allows.
- Minor: `Crawl-delay: 1` is ignored by Google (harmless). It `Allow`s `/api/bmsb-data` etc. — fine for access, but those should not be sitemap/indexing targets.
- Sitemap line points at the non-www apex (align with chosen canonical host).

### 1.7 Heading structure
- Homepage has exactly one `<h1>`: "BULL MARKET SUPPORT BAND" (good — single H1).
- **No `<h2>`/content subheadings** and **no intro paragraph** in the initial HTML. There is no indexable prose describing what the BMSB is or what the dashboard shows. This is the biggest on-page content gap.
- `[ticker]` pages have an `<h1>` (`SYMBOL - Name`) but it's client-rendered (not in initial HTML).

### 1.8 Structured data
- Homepage: valid `WebApplication` + nested `Dataset` JSON-LD (good baseline). Includes author, offers (free), featureList.
- **Gaps:** no `Organization`/`WebSite` schema (and no `WebSite` `SearchAction`), no `BreadcrumbList`, no `FAQPage`, no per-asset structured data.
- One stale detail: featureList says "Live price updates every 10 minutes" — actual cadence is now **15 minutes** (price job) / hourly BMSB. Keep structured data factually in sync.

### 1.9 Internal linking
- **Effectively none.** The dashboard's only links are **external**: CoinGecko, x.com/StableScarab, and `app.lighter.xyz` (referral). Asset tiles open a TradingView popup/tooltip rather than navigating to a URL.
- The `[ticker]` pages are **orphans** — not linked from anywhere, not in the sitemap.
- There is no link hierarchy to distribute authority to (future) educational/asset pages.

### 1.10 Page speed
- Stack is fast at the edge (Next 15, Vercel iad1, Tailwind, small shared JS ~102 kB). Likely good Core Web Vitals for the shell.
- **But** the meaningful content (table + values) paints only after a client-side `fetch('/api/bmsb-data')` resolves, which hurts LCP for "content" and means crawlers see an empty table. Measure real CWV via PageSpeed Insights + Search Console once GSC is connected. (No Lighthouse run was performed for this report.)

### 1.11 Mobile usability
- `viewport: width=device-width` set; Tailwind responsive classes throughout (`sm:`/`lg:` breakpoints in the dashboard). No obvious mobile blockers. Validate in GSC "Mobile Usability" after verification.

### 1.12 Broken links / redirects
- Apex→www redirect is **307 (temporary)** — should be **308/301 (permanent)** so link equity consolidates and Google treats www as canonical.
- `/api/rankings` returns 404 but is not linked (harmless).
- No broken outbound links observed in the dashboard.

### 1.13 Client-side-JS dependency & data in initial HTML
- **The entire dashboard is `'use client'`.** Confirmed: initial HTML for `/` contains the concept name, logo alt text, and chrome, but **no asset rows, no prices, no BMSB values, no TradingView symbols** — all injected after the API call.
- For an indexable, content-rich result, at minimum a **server-rendered intro section** and (ideally) a server-rendered snapshot of key assets should appear in initial HTML. The interactive dashboard can remain client-side; SSR a lightweight content layer around it.

### 1.14 Duplicate / thin pages
- 4 `test-*` pages (thin, dev-only).
- `[ticker]` pages share the homepage's metadata (duplicate titles/descriptions) — a latent duplicate-content issue if they ever get indexed as-is.
- Soft-404s from the catch-all (1.1) are a form of low-value duplicate.

### 1.15 Search Console / Analytics / backlinks
- **Search Console:** not verified (`verification.google` is commented out). **Do this first** — without it we're flying blind on indexing, queries, and CWV.
- **Analytics:** Vercel Analytics is installed (`@vercel/analytics`). No Google Analytics (fine; GA optional). No event tracking on asset interactions.
- **Backlinks:** the only visible outbound/identity signal is `@StableScarab` on X (used as `author`/`creator`/`sameAs`). No backlink data available without a tool (Ahrefs/Search Console "Links"). Recommend checking GSC "Links" after verification.

---

## 2. Search opportunity analysis

> No live keyword-volume API was available for this report, so the figures below are **relative intent/priority judgments**, not measured volumes. Validate with Search Console (after verification) + a keyword tool (Ahrefs/Semrush/Google Keyword Planner) before committing to Priority 2/3.

### 2.1 Intent map
| Query cluster | Dominant intent | Best-fit page type | Priority |
|---|---|---|---|
| "what is the bull market support band" | **Informational** (definition) | Educational overview page | **High** — foundational, evergreen, winnable |
| "bull market support band" | Mixed (info + tool/chart) | Homepage + overview | **High** — the brand/core term |
| "bitcoin bull market support band" | Info + live value | Bitcoin asset page | **High** — highest-volume asset variant |
| "ethereum / solana / xrp … bull market support band" | Info + live value | Per-asset pages | **Medium-High** (scales down by asset) |
| "bitcoin BMSB", "BMSB" | Abbreviation, often returning visitors | Homepage + overview | **Medium** |
| "bull market support band chart" | Tool/visual intent | Homepage (it *is* the chart) + asset pages | **Medium** |
| "bull market support band calculator" | Tool intent | Methodology/dashboard (we compute it live) | **Medium** |
| "20-week SMA and 21-week EMA" | Educational (mechanics) | Overview + methodology | **Medium** |
| Individual altcoin BMSB (long tail) | Info + value | Asset pages (only for assets with real data) | **Low→Medium**, demand-validated |

### 2.2 Reading of the landscape
- The space is **definition + live-value** dominated. People want either "explain it" or "show me BTC's current band." We can serve both, and we have a genuine differentiator: **a live, top-100 BMSB dataset** most competitors don't expose.
- The **brand term IS the keyword** ("Bull Market Support Band"). The exact-match domain is a real asset; consolidating canonical signals and adding genuine content should compound well.
- **Bitcoin is the anchor.** "bitcoin bull market support band" is the single most valuable asset query; Ethereum and Solana follow. The long tail of altcoins has real but thin demand — build those only where we have quality data and (later) demonstrated GSC demand.
- **Competition:** general TA sites and a few BMSB-specific tools/threads. Winnable via (a) a genuinely useful definition page and (b) live per-asset values in indexable HTML — something thin competitors lack.

### 2.3 Recommendation
Prioritize **depth over breadth**: one excellent overview page, one methodology page, an indexable homepage intro, and a **handful** of high-quality SSR asset pages (BTC/ETH/SOL first). **Do not auto-generate hundreds of asset pages** — that invites thin-content/quality issues and dilutes crawl budget. Expand the asset set only after GSC shows demand (Priority 3).

---

## 3. Recommended SEO page structure

### 3.1 Homepage `/` (keep as the live dashboard)
- Keep the dashboard immediately visible — **do not** stack a long article above it.
- Add a **concise, server-rendered intro block** (2–4 short paragraphs / a few sentences + small definition list) in the initial HTML covering: what the BMSB is; what the dashboard tracks (top-100, 20W SMA / 21W EMA); update frequency (prices ~15 min, BMSB hourly, weekly closes drive the band); and what **above / inside / below** mean.
- This single change converts the homepage from "empty shell + JS" into an indexable page that actually contains its target keywords.
- Link from the intro to the overview and methodology pages.

### 3.2 `/what-is-the-bull-market-support-band` — educational overview (**primary content page**)
- The canonical "definition" asset. Genuinely useful, not keyword-stuffed.
- Cover: what the BMSB is; the 20-week SMA; the 21-week EMA; why traders watch the band; what above/inside/below means; historical limitations; how *this site* computes it (brief, link to methodology); why values differ between platforms (timezone/weekly-close/exchange differences); and an explicit "not a guaranteed signal" disclaimer.
- Server-rendered. Unique title/description. Eligible for a `FAQPage` block **only** if the FAQs are visibly on the page.

### 3.3 `/methodology` — this site's implementation
- Documents **our** implementation (the overview explains the concept; this explains the build):
  - Data source: **CoinGecko** (Demo tier), single provider.
  - Formulas: 20-week **SMA**, 21-week **EMA**; band = the zone between them.
  - Weekly-candle definition + timezone; how the in-progress (live) week is handled.
  - Asset selection (top ~100 by market cap; ~150–200 tracked) and exclusions (stablecoins/RWAs, wrapped/derivative/gold-duplicate tokens).
  - Stablecoin/RWA handling (BMSB not applicable) and missing-data handling (<~21 weeks → excluded).
  - Update frequency (prices ~15 min, BMSB hourly, daily discovery/ranking, weekly maintenance).
- Builds E-E-A-T/trust and answers "why does this differ from TradingView?" authoritatively.

### 3.4 Individual asset pages — **URL decision**
**Existing state:** a client-only `app/[ticker]/page.tsx` keyed by **symbol** (`/btc`, `/eth`), no SSR, no unique metadata, orphaned.

**Recommended URL structure (least disruption, best keyword fit):**
- Use **`/bitcoin-bull-market-support-band`** (keyword-rich, slug-based) as the indexable asset URLs, generated server-side with `generateStaticParams` + `generateMetadata`.
- **Keep the existing `/[ticker]` (symbol) route working** as a convenience/redirect target — but make symbol URLs **301/redirect to the slug URL** (or canonical to it) so we don't split signals. Because `/[ticker]` currently isn't indexed or linked, repointing it is low-risk and needs no public-URL migration.
- Rationale: the slug `/{asset}-bull-market-support-band` exactly matches the highest-intent query pattern ("bitcoin bull market support band"), whereas `/assets/bitcoin` or `/btc` does not. The keyword-rich slug is worth the small extra routing work.
- **Each asset page must be SSR with real values in the initial HTML** (current price, 20W SMA, 21W EMA, band range, above/inside/below status, % distance from band, last-updated), plus a short asset-specific explanation and internal links (→ dashboard, → overview, → methodology, → related assets). **Do not ship a page that has no indexable content** (i.e. don't port the current client-only template as-is).
- **Suggested initial set (data-permitting, demand-validated later):** Bitcoin, Ethereum, Solana, XRP, BNB, Dogecoin, Cardano, Chainlink, Avalanche. Start here; expand via Priority 3 only after GSC demand shows.

### 3.5 FAQ
- Candidate questions (all answerable from overview/methodology content): what the BMSB is; how it's calculated; what "above"/"below" means for Bitcoin; reliability; why this differs from TradingView; update frequency; altcoin applicability; which timeframe.
- Implement `FAQPage` structured data **only where the answers are visibly rendered on the page** and comply with current Google FAQ-rich-result guidance (now limited largely to authoritative/gov-health sites for rich results, but the markup still aids understanding). Prefer placing FAQs on the overview and/or relevant asset pages.

### 3.6 Internal linking (target graph)
```
Homepage (/)
  → /what-is-the-bull-market-support-band
  → /methodology
  → asset pages (dashboard asset names link to their asset page where it exists)

Asset page (/bitcoin-bull-market-support-band)
  → / (dashboard)
  → /what-is-the-bull-market-support-band
  → /methodology
  → related asset pages (e.g. ETH, SOL)
```
- The biggest single internal-linking win: make **dashboard asset names link to their asset pages** once those exist (today they open a popup, creating zero crawlable links).

---

## 4. What NOT to do (guardrails)
- Don't change or remove the homepage URL or its role as the live dashboard.
- Don't stack a long article above the dashboard.
- Don't auto-generate hundreds of asset pages; start with majors and validate demand.
- Don't add `FAQPage`/structured data that doesn't match visible content.
- Don't repoint or delete `/[ticker]` without the redirect plan in the implementation doc.
- Don't implement Priority 2/3 before sign-off.

See `SEO_IMPLEMENTATION_PLAN.md` for the prioritized, effort-ranked rollout.
