# SOCIAL_PLAN.md — Automated X/Twitter Growth Engine (@BullMarketSB)

_Strategy + operating plan for the automated social presence. Goal: **grow a devoted following and drive traffic** by posting high-signal BMSB events when traders most want them, in maximally shareable formats. Companion to `MONETIZATION_PLAN.md` (social is the top-of-funnel traffic engine) and the SEO docs (asset pages are the landing targets)._

**Account:** @BullMarketSB ("Bull Market Support Band") — verified working, 90 followers / 222 tweets at planning time.
**API tier:** **Free** (~500 writes/month ≈ ~16/day hard ceiling) → we operate well under it with a configurable daily cap and event prioritization.

---

## 1. Objective & growth thesis

**Objective:** amass a devoted, engaged following and convert that attention into site traffic (and ultimately revenue).

**Thesis:** virality for a data/signal account comes from **(a) timing** (post when traders are looking), **(b) identity/FOMO hooks** (people reshare news about *their* coin), and **(c) shareability** (each post is a self-contained, screenshot-worthy unit that carries meaning when reshared). We engineer all three.

**The growth flywheel:**
```
High-signal post (tags $TICKER + @project)
   → project & its community reshare to THEIR audience
      → new followers + traffic to the asset page
         → more data/credibility → more reshareable posts → repeat
```
Tagging the **project's own X handle** is the single biggest growth lever — it puts our post in front of an audience that already cares, and projects love being told they're strong / entered the top 100.

**North-star principle — every post must be notification-worthy.** The explicit goal is to get followers to turn **notifications ON** for @BullMarketSB. X fires a notification for *every* post from an account a user has notifications enabled for — it does not distinguish "big" posts from routine ones. Therefore **the bar for posting at all is: would a trader be glad their phone buzzed for this?** If not, we don't post it. Scarcity is the strategy: fewer, higher-signal posts → more notification opt-ins → a genuinely devoted following. Over-posting is the single fastest way to get muted and lose the notification audience. When in doubt, **don't post.**

**Note on compute (correcting a common assumption):** posts are emitted *inside* scheduled workflow runs — the bot runs on a cron and posts 0–N tweets per run, so **GitHub compute is driven by how often the workflow runs, not by how many tweets we send**. And because this repo is **public**, GitHub Actions standard-runner minutes are **free and unlimited**. So GitHub compute is *not* a reason to limit posting. The real limits are the **Twitter free-tier write cap (~16/day)**, **CoinGecko rate limits**, and — the binding one — **follower attention** (the notification-worthy bar above).

---

## 2. Meet the audience where they are (timing)

Crypto trades 24/7, but **attention is not uniform** — it spikes around market opens and the weekly candle. We post into those windows.

| Window | When (ET) | Why | What we post |
|---|---|---|---|
| **Weekly open / "the week ahead"** | **Monday, pre-NYO (~8:00 AM ET)** | The weekly BMSB candle has just closed (Sun ~00:00 UTC); traders set the week's bias Monday morning. | **Big weekly overview** (see §3.1) — the flagship post(s). |
| **Daily pre-NYO** | **Mon–Fri ~8:00 AM ET** (before US equities/NY open) | Traders check positioning as the US session begins; highest daily attention. | **Daily snapshot**: market breadth (bull/bear regime) + notable overnight movers. |
| **Intraday** | As events occur, **rate-limited** | Real-time relevance; rewards following the account. | **Event posts**: definitive band crosses, top-100 entries, rapid movers. |
| **Weekends** | **Reduced** | Lower trader attention Sat/Sun. | Only high-signal events (major cross, top-100 entry). No routine daily snapshot. |

**Timezone handling:** all schedules are stored in **UTC** (cron), targeting **ET market hours**, with a note that ET↔UTC shifts 1 hour at US DST changes — schedule for the EDT alignment and accept the 1-hour drift in winter (or adjust twice a year). "NYO" here = the US morning attention window (~8:00 AM ET); we post *before* it so the info is ready when traders arrive.

---

## 3. Content types (each is a standalone, shareable post)

> **Format rule (per decision):** the API/free-tier path won't rely on threads. **Every tweet is self-contained and individually shareable** — a reshare of any single tweet makes sense on its own. Related items (e.g. "crossed up" vs "crossed down") are **separate tweets**, not a thread, so each can go viral independently.

> **Media & links (revised — links suppress X reach):** External links in the main post get **throttled by the X algorithm**, so **main posts carry NO link** — just text + `$ticker` + `@project` + a **chart/BMSB image** (images help reach). When a post benefits from the asset page (e.g. a spotlight or top-100 entry), put the **link in a self-reply** (`in_reply_to` the main tweet) — this preserves the main post's reach while still offering the click-through. Image generation failing → post **text-only (still no link in main)**; never fall back to a link in the main post. Traffic is also carried by the **profile/bio link** and brand recall (`bullmarketsupportband.com` = the account name). Reach/following is the priority; SEO remains the primary traffic driver, so links are a reply-only bonus, not a per-post requirement. (Note: a self-reply with a link costs a 2nd write against the ~16/day cap — use it only where it adds real value.)

### 3.1 Weekly overview — the flagship (Monday pre-NYO)
Posted after the weekly close, as **separate shareable tweets** (not a thread):
1. **Market regime tweet** — the bull/bear breadth signal: _"🟢 X% of the top 100 are above their Bull Market Support Band heading into the week (vs Y% last week)."_ Inherently reshareable (it's a market call). Image: breadth visual. (Optional `/market-breadth` link in a self-reply.)
2. **Reclaimed-the-band tweet** — assets that **crossed from below → above** on the weekly close: _"📈 Reclaimed the Bull Market Support Band this week: $SOL @solana, $LINK @chainlink …"_ (tagged, capped to the most notable by rank).
3. **Lost-the-band tweet** — assets that **crossed above → below**: _"📉 Lost the Bull Market Support Band this week: $ASSET @project …"_
4. (Optional) **Standout spotlight** — one notable asset's overview with chart image (asset-page link in a self-reply).

Splitting these means a strong-market week, a specific project's reclaim, and a regime call can each be reshared by different audiences.

### 3.2 Daily snapshot (Mon–Fri pre-NYO)
One self-contained tweet: current **breadth (bull/bear regime)** + the day's **notable movers / overnight crosses**, `$TICKER` tagged, chart image, **no link in the main post** (optional `/market-breadth` link in a self-reply).

### 3.3 Definitive band cross (intraday event)
Per the decision, a **two-mode** model:
- **Weekly-close confirmed crosses** are the high-signal ones featured in the **weekly overview** (§3.1) — these are "definitive."
- **Intraday live crosses** of **high-rank** assets may post in real time **with debounce + a re-cross lock** (won't repost the same direction until it crosses back), clearly framed as live ("just crossed", not "weekly close"). Rank-gated so we only real-time-alert meaningful assets and stay under the cap.
- Each: _"📈 $BTC @Bitcoin just reclaimed its Bull Market Support Band — now above the 20W SMA / 21W EMA. [values]"_ + chart image (no link in main).

### 3.4 Top-100 entry alert (event)
When a **non-stablecoin, non-RWA** asset newly enters the top 100: _"🚀 $ASSET @project just entered the TOP 100 by market cap. Here's where it sits on the Bull Market Support Band: [status]"_ + chart image. Explicitly note the **stablecoin/RWA exclusion** so the ranking is credible. **Prime reshare bait** — projects and communities love this; the asset-page link goes in a self-reply for anyone who wants the detail.

### 3.5 Rapid mover (event)
"Meaningful change in a short amount of time" — a **rank-scaled** % move and/or health/position flip within a short window (bigger assets need a smaller % to qualify; micro-caps are ignored as noise). Self-contained, tagged, capped.

---

## 4. Virality & engagement levers (engineered in)

1. **Tag the project's @handle + $cashtag** on every asset-specific post → triggers project/community reshares (the flywheel). Handles are validated before use; never tag a wrong/dead account.
2. **Identity/FOMO hooks** — "entered the TOP 100", "reclaimed the band", "X% of the market is bullish" are statements people *want* associated with their bag.
3. **Standalone shareability** — no threads; each tweet stands alone and screenshots cleanly.
4. **Chart image, no link in the main post** — images lift engagement *and* reach, while external links get throttled by the algorithm. Keep the main post link-free; if a link adds value, it goes in a **self-reply** (§3 media rule). This is a deliberate reach-over-clicks trade since SEO already drives traffic.
5. **Consistency + timing** — same valuable post at the same trader-attention window builds a habit ("check @BullMarketSB before NYO").
6. **Market-regime calls** — breadth shifts ("majority just flipped back above the band") are the most reshareable macro content we produce.
7. **Restraint** — scarcity raises signal value; we do **not** spam. Caps + prioritization keep quality high (§5).

---

## 5. Cadence, caps & prioritization (high-signal, notification-worthy)

The constraint is **attention, not compute** (§1 note). We deliberately post **few, high-signal** items so notifications stay on. The free-tier ~16/day write ceiling is a *safety net we rarely approach* — not a budget to fill.

**Target volume (deliberately low):**
- **~1–3 posts on a normal weekday**, most of them the predictable, expected cadence (daily snapshot; weekly overview on Monday).
- **Intraday interrupts are rare and big** — on a quiet day, **zero** intraday posts is the correct outcome. We only buzz phones for genuinely notable events.
- **Weekends: 0–1**, major events only.
- **Hard cap:** a configurable per-day ceiling (default **8**, well under the ~16 API limit) as a runaway backstop — not a target. We expect to sit far below it.

**The notification-worthy bar (what qualifies to post at all):**
- ✅ **Always post:** weekly overview (Mon); daily snapshot (Mon–Fri pre-NYO); a top-100 **entry**; a band cross of a **major** asset (e.g. top ~20–25 by cap); a **market-regime flip** (breadth crosses 50% bull↔bear).
- ⚠️ **Post only if notable:** band cross of a mid-cap (≈ top 25–50) **and** it's a clean weekly-close confirmation.
- ❌ **Never post (noise):** micro-cap moves, low-rank crosses, routine volatility, anything we've posted recently for the same asset/direction, anything we wouldn't want to ping a follower's phone for. **When in doubt, skip.**

**Prioritization when multiple events qualify the same day** (post the best, drop the rest — and *log* what was dropped):
1. Top-100 entries (rare, highest reshare value)
2. Market-regime flips (breadth crossing 50%)
3. Band crosses of the highest-market-cap assets
4. Everything else → deferred or dropped, never bursted

**Anti-duplication / whipsaw / anti-spam control:** per-asset social state tracks last-posted position & rank; a direction won't re-post until it crosses back; a generous **min-interval** spaces posts so they never burst; a recently-posted asset is suppressed from re-appearing. The system is biased toward **under**-posting.

---

## 6. Guardrails (don't break the account or the trust)

- **X automation rules:** tasteful, relevant tagging only (tag the project a post is *about* — never mass-tag). No identical-spam, no aggressive bursts. The cap + min-interval enforce this.
- **Handle accuracy:** validate every `@handle` against a real account before tagging; skip if unknown. A wrong tag is worse than no tag.
- **Not financial advice:** keep posts factual/observational ("reclaimed the band", "X% above") — never "buy"/"sell"/price targets. The BMSB is a trend signal, not advice.
- **Accuracy = credibility:** only post confirmed events from the live data; a wrong "entered top 100" or "crossed" erodes trust fast. Dedup + confirmation logic exists for this.
- **No scam amplification:** we report rank/position factually; tagging a project is not endorsement, but avoid spotlighting obvious scam tokens in *overview/spotlight* posts.
- **Rate-limit safety:** never exceed the daily cap; back off on API errors; queue rather than burst.

---

## 7. Metrics — what "viral" and "devoted following" mean here

Track weekly (and per-post where possible):
- **Follower growth** (net/week) — the north star for "devoted following."
- **Notification opt-ins / mute & unfollow rate** — the truest signal of "notification-worthy." Rising mutes/unfollows = we're posting too much or too low-signal; tighten the bar. (X doesn't expose notification-on counts directly, so watch mutes/unfollows and engagement-per-post as proxies.)
- **Engagement *rate* per post** (engagements ÷ impressions), not just totals — high rate = every post earns its ping; falling rate = volume is diluting signal.
- **Per-post: impressions, reshares/retweets, quotes, replies, profile clicks, link clicks** — reshares + profile clicks are the virality signals.
- **Which post types drive follows/reshares** — double down on winners (likely: top-100 entries, regime calls, major-asset crosses).
- **Referral traffic to the site** from X (via UTMs on the links) — ties social back to the traffic/monetization goal.
- **Tag→reshare rate** — how often tagged projects reshare (the flywheel's health).

Review monthly. The default move when unsure is to **post less, not more** — protect the notification audience. Reallocate toward whatever post types compound following + engagement *rate* fastest.

---

## 8. How this maps to the build (decisions locked)

| Decision | Choice |
|---|---|
| API tier / cap | Free tier; **biased toward under-posting** — target ~1–3/weekday, hard cap default **8** (backstop, not a budget), priority queue + min-interval; notification-worthy bar gates every post |
| "Definitive" cross | Weekly-close-confirmed for the **weekly overview**; live intraday crosses (debounced, rank-gated) as separate real-time alerts |
| Format | **Standalone shareable tweets, no threads**; related items split into separate posts |
| Media | **Chart image, NO link in main post** (links suppress reach); link only in an optional **self-reply**; image-fail → text-only. Traffic via bio link + brand + reply links |
| Tagging | `$TICKER` cashtag + validated `@project` handle (CoinGecko `twitter_screen_name`, enriched & stored) |
| Schedule | UTC cron targeting ET windows: weekly overview Mon ~8:00 AM ET; daily snapshot Mon–Fri ~8:00 AM ET; intraday event sweeps hourly after the BMSB calc; reduced weekends |
| Roll-out | Build with safety caps and **go live directly** on @BullMarketSB |

**Build components (next step):**
1. `twitter_handle` enrichment on assets (from CoinGecko, validated).
2. Per-asset **social-state table** (last-posted position + rank) for cross/entry detection + dedup.
3. **Event detectors**: weekly-close crosses, live crosses, top-100 entries, rapid movers, breadth.
4. **Post composer** (templates per §3) + chart-image generation with text/link fallback.
5. **Scheduler/queue** with daily cap, priority, min-interval (GitHub Actions cron jobs).
6. Extend `twitter_bot_posts` post-type enum + logging for skipped/dropped events.

---

_Strategy document. Implementation follows per §8. Posts are factual BMSB observations, not financial advice._
