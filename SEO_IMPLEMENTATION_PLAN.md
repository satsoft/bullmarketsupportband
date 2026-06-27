# SEO_IMPLEMENTATION_PLAN.md — BullMarketSupportBand.com

_Phase 10 deliverable. Companion to `SEO_ANALYSIS.md` (read that first). Prioritized rollout._

**Status:** ✅ IMPLEMENTED (2026-06-27) — Priority 1, Priority 2, and the non-gated Priority 3 page shipped to production. GSC-demand-gated P3 items remain deferred by design (see below).

**Completion checklist:**
- [x] 1.2 Sitemap consolidated (single dynamic `app/sitemap.ts`, www host, real pages only; deleted static `app/sitemap.xml` + dead `vercel.json` rewrite)
- [x] 1.3 Canonical tags added; standardized on **www** (layout, page, sitemap, robots)
- [x] 1.5 SSR homepage intro block (in initial HTML, below the dashboard)
- [x] 1.6 `/what-is-the-bull-market-support-band` (overview + visible FAQ + `FAQPage` schema)
- [x] 1.7 `/methodology`
- [x] 1.8 Thin `test-*` pages removed
- [x] 1.9 Soft-404 fixed (`[ticker]` now `notFound()` for unknown paths)
- [x] 1.10 Internal linking (`SiteFooterNav` on every content/asset page; homepage intro links)
- [x] 1.11 Structured data synced (`WebSite`/`Organization` added; "10 min" → "15 min")
- [x] P2 SSR asset pages `/{asset}-bull-market-support-band` (9 majors, values in initial HTML, unique meta, ISR 15m); `/btc`-style symbol URLs **308-redirect** to canonical slug; in sitemap + nav
- [x] P3 `/market-breadth` page
- [ ] 1.1 GSC verification — **needs your verification code** (wired to `GOOGLE_SITE_VERIFICATION` env var; see "Open items")
- [ ] 1.4 apex→www **permanent** redirect — **Vercel dashboard toggle** (currently 307; see "Open items")

**Open items requiring you:**
1. **Google Search Console:** verify the property, then set `GOOGLE_SITE_VERIFICATION=<code>` in Vercel env (the meta tag emits automatically). Submit `https://www.bullmarketsupportband.com/sitemap.xml`.
2. **apex→www redirect:** in Vercel → Project → Domains, set the apex (`bullmarketsupportband.com`) redirect to **permanent (308)**. (Symbol→slug redirects are already 308 in code.)

---

_Original plan retained below for reference._

Effort = rough build size · Confidence = likelihood it helps without downside · Risk = chance of regressing something live.

---

## Priority 1 — Low effort, high confidence (do first)

These are additive, reversible, and don't touch existing public URLs. Recommended order:

| # | Item | Effort | Confidence | Risk | Where |
|---|---|---|---|---|---|
| 1.1 | **Verify Google Search Console** (+ Bing Webmaster). Uncomment/add `verification.google` in metadata or add DNS TXT. Submit sitemap. | XS | High | None | `app/layout.tsx` |
| 1.2 | **Fix the sitemap** — delete static `app/sitemap.xml` and the dead `vercel.json` rewrite (`/sitemap.xml → /api/sitemap`); keep a single dynamic `app/sitemap.ts`; **remove the `/api/*` JSON URLs**; list only real HTML pages. | S | High | Low | `app/sitemap.ts`, `app/sitemap.xml`, `vercel.json` |
| 1.3 | **Add canonical tags** via `alternates.canonical`, and **standardize on one host**. Make all signals (metadataBase, OG `url`, JSON-LD `url`, robots sitemap line) agree with the host that serves 200s (recommend **www**). | S | High | Low | `app/layout.tsx`, `app/page.tsx` |
| 1.4 | **Make apex→www redirect permanent (308/301)** instead of 307. | XS | High | Low | Vercel domains config |
| 1.5 | **Add a server-rendered homepage intro block** (concise; below is fine, but it must be in initial HTML): what BMSB is, what the dashboard tracks, update cadence, what above/inside/below mean. Keep dashboard immediately visible; no long article. | M | High | Low | `app/page.tsx` (+ small server component) |
| 1.6 | **Add the `/what-is-the-bull-market-support-band` overview page** (SSR, unique title/description, genuine content). | M | High | None (new URL) | new `app/what-is-the-bull-market-support-band/page.tsx` |
| 1.7 | **Add the `/methodology` page** (SSR, documents this site's implementation). | M | High | None (new URL) | new `app/methodology/page.tsx` |
| 1.8 | **Resolve test pages** — delete `/test-*` or add `robots: { index: false }` metadata (robots.txt `Disallow` alone doesn't guarantee non-indexing). | XS | Med-High | Low | `app/test-*` |
| 1.9 | **Fix the soft-404** — give `[ticker]` (and unknown paths) a real `notFound()`/404 for non-assets so `/anything` stops returning 200. (Becomes moot for real pages once static routes exist, but unknown junk should 404.) | S | High | Low | `app/[ticker]/page.tsx`, `app/not-found.tsx` |
| 1.10 | **Improve internal linking** — link the new intro to overview/methodology; cross-link overview ↔ methodology. (Asset-name → asset-page links come in P2.) | XS | Med | None | content pages |
| 1.11 | **Sync structured data with reality** — fix "every 10 minutes" → actual cadence; add `WebSite` + `Organization` schema. | XS | Med | Low | `app/page.tsx`, `app/layout.tsx` |

**Acceptance for P1:** GSC verified + sitemap submitted; homepage initial HTML contains BMSB definition text; `/what-is...` and `/methodology` live and indexable; one canonical host with matching signals; no soft-404s for junk paths; no existing public URL changed.

---

## Priority 2 — Asset landing pages (**requires approval**)

Goal: a **small, high-quality** set of SSR asset pages with real values in initial HTML. Quality over quantity.

Steps:
1. **Decide the template & URL** — recommend keyword-rich slug **`/{asset}-bull-market-support-band`** (e.g. `/bitcoin-bull-market-support-band`), SSR via `generateStaticParams` + `generateMetadata`. **Plan the `[ticker]` redirect** (symbol URLs 301→slug, or canonical to slug) *before* touching that route — it's currently unindexed/orphaned, so low risk, but do it deliberately.
2. **Build the page template** containing, in **server-rendered initial HTML**: current price, 20W SMA, 21W EMA, band range, above/inside/below status, % distance from band, last-updated time, an embedded chart (if supported), a short asset-specific explanation, and internal links (→ dashboard, → overview, → methodology, → related assets).
3. **Ensure values are in the initial HTML** (fetch server-side from the DB/`/api/bmsb-data` at request or ISR time) — **not** a client-only fetch like the current `[ticker]` page.
4. **Unique titles/descriptions per asset** (e.g. "Bitcoin Bull Market Support Band — Live BTC 20W SMA / 21W EMA").
5. **Add meaningful, non-duplicated copy** per asset (don't ship a page with no indexable content).
6. **Add them to the sitemap** and **link dashboard asset names to them**.
7. **Start with majors only:** Bitcoin, Ethereum, Solana, XRP, BNB, Dogecoin, Cardano, Chainlink, Avalanche — and only assets that actually have valid BMSB data (skip stablecoins/RWAs/excluded tokens).

| Concern | Note |
|---|---|
| Effort | M–L (one good template; per-asset content is the real cost) |
| Risk | Low–Med (new URLs; the only sensitive part is the `[ticker]` redirect) |
| Guardrail | Don't auto-generate the full asset universe; majors first. |

**Acceptance for P2:** each shipped asset page returns real BMSB values in `view-source`, has unique title/description, links into the graph, and is in the sitemap; `[ticker]` symbol URLs redirect/canonical to slugs; no thin/empty asset pages.

---

## Priority 3 — Broader content (**requires approval; only after GSC demonstrates demand**)

Do **not** start these until Search Console shows real impressions/clicks justifying them:
- Additional asset pages beyond the majors (demand-ranked from GSC queries).
- Historical crossover pages (e.g. "times BTC reclaimed the BMSB").
- Weekly BMSB summary posts.
- Market-breadth pages (e.g. "% of top 100 above their BMSB").
- Supporting educational articles (20W SMA vs 21W EMA, BMSB vs other supports, etc.).
- FAQ expansion with `FAQPage` markup **only** where answers are visibly on-page and compliant with current guidance.

| Concern | Note |
|---|---|
| Effort | L (ongoing content) |
| Risk | Med — this is where thin/duplicate content creeps in; gate on data + demand. |

---

## Sequencing & dependencies
1. **1.1 (GSC) before everything** — it's the measurement backbone; P3 decisions depend on its data.
2. P1 content (1.5–1.7) and infra (1.2–1.4) can proceed in parallel.
3. **P2 only after P1 ships and is approved.** P2's `[ticker]` redirect needs the slug routes to exist first.
4. **P3 only after GSC data justifies specific pages.**

## Risk ledger (live-URL safety)
- Only `/` is currently a public ranking surface; all P1/P2 content is additive new URLs.
- The two redirect-sensitive changes are **1.4** (apex→www permanence) and **P2's `[ticker]`→slug** redirect — both planned, both low-risk because nothing currently ranks on www-vs-apex distinctions or on symbol URLs.
- Everything in this plan is reversible (delete the route / revert the metadata) with no impact on the live dashboard or data pipeline.

---

_No changes have been made to the application. This document and `SEO_ANALYSIS.md` are analysis deliverables only. Await approval before implementing Priority 1 (confirm) and explicitly before Priority 2/3._
