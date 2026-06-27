/**
 * Tweet composition. Main posts carry NO link (links suppress X reach) — just
 * $ticker + @project + values + a hashtag or two. Self-reply links are handled
 * separately by the poster. All output is kept under the 280-char limit.
 */
import type { AssetSnapshot, AssetState, Position } from './data';
import type { SocialEvent } from './detectors';

const MAX = 280;

function cashtag(sym: string): string {
  return `$${sym.toUpperCase()}`;
}
function mention(handle: string | null): string {
  return handle ? ` @${handle}` : '';
}
export function fmtPrice(n: number | null): string {
  if (n == null) return 'N/A';
  if (n >= 1) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.001) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(2)}`;
}
function pct(n: number | null): string {
  if (n == null) return 'N/A';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}
function posWord(p: Position | null): string {
  return p === 'above_band' ? 'above' : p === 'below_band' ? 'below' : p === 'in_band' ? 'inside' : 'near';
}
function bandRange(a: AssetSnapshot): string {
  return `${fmtPrice(a.bandLower)}–${fmtPrice(a.bandUpper)}`;
}

/** Compose a single asset/market event tweet. Returns null if it can't be composed. */
export function composeEvent(ev: SocialEvent): string | null {
  if (ev.type === 'regime_flip') {
    const p = (ev.data?.pctAbove as number) ?? 0;
    const regime = ev.data?.regime as string;
    return regime === 'bull'
      ? `🟢 The market just flipped BULLISH — ${p.toFixed(0)}% of the top 100 are now ABOVE their Bull Market Support Band.\n\n#BMSB #crypto`
      : `🔴 The market just flipped BEARISH — only ${p.toFixed(0)}% of the top 100 remain above their Bull Market Support Band.\n\n#BMSB #crypto`;
  }

  const a = ev.asset;
  if (!a) return null;
  const tag = `${cashtag(a.symbol)}${mention(a.handle)}`;

  switch (ev.type) {
    case 'band_cross_up':
      return clamp(
        `📈 ${tag} reclaimed its Bull Market Support Band\n\nNow trading ABOVE the 20W SMA & 21W EMA (${bandRange(a)})\nPrice: ${fmtPrice(a.price)}\n\n#BMSB`,
      );
    case 'band_cross_down':
      return clamp(
        `📉 ${tag} lost its Bull Market Support Band\n\nNow trading BELOW the 20W SMA & 21W EMA (${bandRange(a)})\nPrice: ${fmtPrice(a.price)}\n\n#BMSB`,
      );
    case 'top100_entry':
      return clamp(
        `🚀 ${tag} just entered the TOP 100 by market cap (excl. stablecoins/RWAs)\n\nBMSB: trading ${posWord(a.position)} the band · ${fmtPrice(a.price)}\n\n#BMSB #crypto`,
      );
    case 'rapid_mover':
      return clamp(
        `⚡ ${tag} ${pct(a.change24h)} (24h)\n\nTrading ${posWord(a.position)} its Bull Market Support Band · ${fmtPrice(a.price)}\n\n#BMSB`,
      );
    default:
      return null;
  }
}

/** Daily snapshot: breadth/regime + a couple of notable movers. */
export function composeDailySnapshot(snapshot: AssetSnapshot[], pctAbove: number, regime: 'bull' | 'bear'): string {
  const emoji = regime === 'bull' ? '🟢' : '🔴';
  // Rank-gate movers to top-50 so we surface meaningful names, not micro-cap noise.
  const movers = [...snapshot]
    .filter((a) => a.change24h != null && (a.rank ?? 9999) <= 50)
    .sort((a, b) => Math.abs(b.change24h!) - Math.abs(a.change24h!))
    .slice(0, 3)
    .map((a) => `${cashtag(a.symbol)} ${pct(a.change24h)}`)
    .join(' · ');
  let t = `📊 Bull Market Support Band — Daily\n\n${emoji} ${pctAbove.toFixed(0)}% of the top 100 are above their band (${regime === 'bull' ? 'bullish' : 'bearish'})`;
  if (movers) t += `\n\nMovers (24h): ${movers}`;
  t += `\n\n#BMSB #crypto`;
  return clamp(t);
}

/** Weekly overview: 3 separate, individually-shareable tweets. */
export function composeWeeklyOverview(
  snapshot: AssetSnapshot[],
  states: Map<string, AssetState>,
  pctAbove: number,
  regime: 'bull' | 'bear',
  nowMs: number,
): { type: string; text: string }[] {
  const weekAgo = nowMs - 7 * 24 * 3600 * 1000;
  const out: { type: string; text: string }[] = [];
  const emoji = regime === 'bull' ? '🟢' : '🔴';

  out.push({
    type: 'weekly_overview',
    text: clamp(
      `🗓️ The Week Ahead — Bull Market Support Band\n\n${emoji} ${pctAbove.toFixed(0)}% of the top 100 are above their band heading into the week (${regime === 'bull' ? 'bullish' : 'bearish'} breadth).\n\n#BMSB #crypto`,
    ),
  });

  const within = (iso: string | null) => iso != null && new Date(iso).getTime() >= weekAgo;
  const reclaimed = snapshot
    .filter((a) => a.position === 'above_band' && within(states.get(a.id)?.last_cross_up_at ?? null))
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
  const lost = snapshot
    .filter((a) => a.position === 'below_band' && within(states.get(a.id)?.last_cross_down_at ?? null))
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));

  if (reclaimed.length) {
    out.push({ type: 'weekly_overview', text: list('📈 Reclaimed the Bull Market Support Band this week:', reclaimed) });
  }
  if (lost.length) {
    out.push({ type: 'weekly_overview', text: list('📉 Lost the Bull Market Support Band this week:', lost) });
  }
  return out;
}

function list(header: string, assets: AssetSnapshot[]): string {
  const tail = `\n\n#BMSB #crypto`;
  let body = '';
  for (const a of assets) {
    const entry = `\n${cashtag(a.symbol)}${mention(a.handle)}`;
    if ((header + body + entry + tail).length > MAX) break;
    body += entry;
  }
  return `${header}${body}${tail}`;
}

function clamp(s: string): string {
  return s.length <= MAX ? s : s.slice(0, MAX - 1) + '…';
}
