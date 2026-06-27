/**
 * Orchestrator for the social bot. Three modes:
 *   - intraday : detect events, post the most notable (rank-gated, capped, deduped)
 *   - daily    : one daily snapshot (breadth + movers)
 *   - weekly   : the weekly overview (3 separate, shareable tweets)
 *
 * Safety: dry-run by default (generate + log, no posting, no state mutation).
 * State (positions/crosses/top100/market regime) is persisted ONLY on live runs so
 * a dry run never "consumes" an event. First live observation of an asset is silent.
 */
import { socialConfig } from './config';
import * as data from './data';
import { detect } from './detectors';
import { composeEvent, composeDailySnapshot, composeWeeklyOverview } from './compose';
import { SocialPoster } from './poster';
import { tickerImage, marketImage } from './image';
import { assetFromSymbolOrSlug, assetPath } from '../asset-pages';

export type Mode = 'intraday' | 'daily' | 'weekly';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Optional self-reply link — only for assets that have a dedicated SSR page. */
function assetReplyLink(symbol: string): string | null {
  const asset = assetFromSymbolOrSlug(symbol);
  return asset ? `${socialConfig.siteUrl}${assetPath(asset)}` : null;
}

export async function runSocial(mode: Mode): Promise<void> {
  const live = socialConfig.enabled && !socialConfig.dryRun;
  console.log(`[social] mode=${mode} ${live ? 'LIVE' : 'DRY-RUN'} cap=${socialConfig.dailyCap}`);

  const snapshot = await data.loadSnapshot();
  if (!snapshot.length) {
    console.log('[social] no snapshot data; aborting.');
    return;
  }
  const states = await data.loadStates(snapshot.map((a) => a.id));
  const market = await data.loadMarketState();
  const now = new Date();
  const nowIso = now.toISOString();

  const det = detect(snapshot, states, market?.regime ?? null, nowIso);
  console.log(`[social] breadth ${det.pctAbove.toFixed(1)}% above (${det.regime}); ${det.events.length} candidate event(s)`);

  const poster = live ? new SocialPoster() : null;
  let postedToday = await data.postsInLast24h();
  const lastPost = await data.lastPostedAt();
  let remaining = Math.max(0, socialConfig.dailyCap - postedToday);

  // Post-or-log one item, honoring the daily cap.
  const emit = async (
    eventType: string,
    symbol: string | null,
    text: string,
    image: Buffer | null,
    replyLink: string | null,
  ): Promise<boolean> => {
    if (remaining <= 0) {
      await data.recordPost({ event_type: eventType, symbol, content: text, status: 'skipped_cap' });
      console.log(`[cap] skipped ${eventType} ${symbol ?? ''}`);
      return false;
    }
    if (!live) {
      await data.recordPost({ event_type: eventType, symbol, content: text, status: 'dry_run' });
      console.log(`\n──── DRY-RUN ${eventType} ${symbol ?? ''} ────\n${text}\n[image:${image ? 'yes' : 'no'}] [reply:${replyLink ?? 'none'}]\n`);
      return true;
    }
    try {
      const id = await poster!.tweet(text, image);
      // Reply links are opt-in (SOCIAL_REPLY_LINKS=true) — each reply is a billable 2nd tweet.
      if (replyLink && socialConfig.replyLinks) {
        try {
          await poster!.reply(replyLink, id);
        } catch (e) {
          console.warn('[poster] self-reply failed:', (e as Error).message);
        }
      }
      await data.recordPost({ event_type: eventType, symbol, content: text, tweet_id: id, status: 'posted' });
      remaining--;
      postedToday++;
      console.log(`[posted] ${eventType} ${symbol ?? ''} id=${id}`);
      return true;
    } catch (e) {
      await data.recordPost({ event_type: eventType, symbol, content: text, status: 'error', reason: (e as Error).message });
      console.error(`[error] ${eventType}:`, (e as Error).message);
      return false;
    }
  };

  if (mode === 'intraday') {
    const withinInterval =
      live && lastPost && now.getTime() - lastPost.getTime() < socialConfig.minIntervalMinutes * 60000;
    if (withinInterval) {
      console.log('[interval] within global min-interval; no intraday posts this run.');
    } else {
      const cooldownMs = socialConfig.perAssetCooldownHours * 3600 * 1000;
      const events = [...det.events].sort((a, b) => b.priority - a.priority);
      let postedThisRun = 0;
      for (const ev of events) {
        if (postedThisRun >= 2) break; // never burst intraday
        const a = ev.asset;
        if (a) {
          const st = states.get(a.id);
          if (st?.last_posted_at && now.getTime() - new Date(st.last_posted_at).getTime() < cooldownMs) {
            await data.recordPost({ event_type: ev.type, symbol: a.symbol, content: '', status: 'skipped_dedup', reason: 'asset cooldown' });
            continue;
          }
        }
        const text = composeEvent(ev);
        if (!text) continue;
        const image = a ? await tickerImage(a.symbol) : await marketImage();
        const replyLink = a ? assetReplyLink(a.symbol) : `${socialConfig.siteUrl}/market-breadth`;
        const ok = await emit(ev.type, a?.symbol ?? null, text, image, replyLink);
        if (ok) {
          postedThisRun++;
          if (live && a) await data.upsertState({ cryptocurrency_id: a.id, symbol: a.symbol, last_posted_at: nowIso });
        }
      }
    }
    // Persist positions/crosses/top100 + regime ONLY on live runs.
    if (live) {
      for (const u of det.stateUpdates) await data.upsertState(u);
      await data.saveMarketState(det.pctAbove, det.regime);
    }
  } else if (mode === 'daily') {
    const text = composeDailySnapshot(snapshot, det.pctAbove, det.pctBelow, det.regime);
    const image = await marketImage();
    await emit('daily_snapshot', null, text, image, `${socialConfig.siteUrl}/market-breadth`);
    if (live) await data.saveMarketState(det.pctAbove, det.regime);
  } else if (mode === 'weekly') {
    const tweets = composeWeeklyOverview(snapshot, states, det.pctAbove, det.pctBelow, det.regime, now.getTime());
    const regimeImg = await marketImage();
    for (let i = 0; i < tweets.length; i++) {
      const t = tweets[i];
      await emit(t.type, null, t.text, i === 0 ? regimeImg : null, `${socialConfig.siteUrl}/market-breadth`);
      if (live) await sleep(4000); // small spacing, not the full min-interval
    }
    if (live) {
      for (const u of det.stateUpdates) await data.upsertState(u);
      await data.saveMarketState(det.pctAbove, det.regime);
    }
  }

  console.log(`[social] done. posted today (24h): ${postedToday}/${socialConfig.dailyCap}`);
}
