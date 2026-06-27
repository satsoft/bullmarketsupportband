/**
 * Event detection: diff the current snapshot against stored social state to find
 * postable events. First observation of an asset is SILENT (we only record state),
 * so we never spam on the first run. State stores last_position, which naturally
 * dedups a cross until the asset crosses back.
 */
import { socialConfig } from './config';
import type { AssetSnapshot, AssetState, Position } from './data';

export type EventType =
  | 'band_cross_up'
  | 'band_cross_down'
  | 'top100_entry'
  | 'rapid_mover'
  | 'regime_flip';

export interface SocialEvent {
  type: EventType;
  priority: number; // higher = post first when over budget
  asset?: AssetSnapshot;
  data?: Record<string, unknown>;
}

export interface StateUpdate {
  cryptocurrency_id: string;
  symbol: string;
  last_position: Position | null;
  last_rank: number | null;
  in_top100: boolean;
  last_cross_up_at: string | null;
  last_cross_down_at: string | null;
  last_top100_entry_at: string | null;
}

export interface DetectionResult {
  events: SocialEvent[];
  stateUpdates: StateUpdate[];
  /** % of assets (with a band) currently above it. */
  pctAbove: number;
  regime: 'bull' | 'bear';
  regimeFlipped: boolean;
}

export function detect(
  snapshot: AssetSnapshot[],
  states: Map<string, AssetState>,
  prevRegime: string | null,
  nowIso: string,
): DetectionResult {
  const events: SocialEvent[] = [];
  const stateUpdates: StateUpdate[] = [];

  let above = 0;
  let withPos = 0;

  for (const a of snapshot) {
    const st = states.get(a.id);
    const prevPos = st?.last_position ?? null;
    const newPos = a.position;

    if (newPos) {
      withPos++;
      if (newPos === 'above_band') above++;
    }

    const crossUp = prevPos != null && newPos === 'above_band' && prevPos !== 'above_band';
    const crossDown = prevPos != null && newPos === 'below_band' && prevPos !== 'below_band';
    const rank = a.rank ?? 9999;

    // Record cross timestamps for ALL assets (used by the weekly overview),
    // even when we don't post an intraday alert for it.
    const update: StateUpdate = {
      cryptocurrency_id: a.id,
      symbol: a.symbol,
      last_position: newPos,
      last_rank: a.rank,
      in_top100: rank <= 100,
      last_cross_up_at: crossUp ? nowIso : st?.last_cross_up_at ?? null,
      last_cross_down_at: crossDown ? nowIso : st?.last_cross_down_at ?? null,
      last_top100_entry_at: st?.last_top100_entry_at ?? null,
    };

    // Top-100 entry: had prior state showing NOT in top 100, now is. (Silent on first run.)
    if (st && !st.in_top100 && rank <= 100) {
      update.last_top100_entry_at = nowIso;
      events.push({ type: 'top100_entry', priority: 100, asset: a });
    }

    // Intraday band cross — only for major-cap assets (notification-worthy bar).
    if ((crossUp || crossDown) && rank <= socialConfig.majorRank) {
      events.push({
        type: crossUp ? 'band_cross_up' : 'band_cross_down',
        priority: 80 - Math.min(rank, 50) * 0.5,
        asset: a,
      });
    } else if (
      // Rapid mover — major-cap only, and not already captured as a cross.
      rank <= socialConfig.majorRank &&
      a.change24h != null &&
      Math.abs(a.change24h) >= socialConfig.moverPctMajor
    ) {
      events.push({ type: 'rapid_mover', priority: 40, asset: a, data: { change: a.change24h } });
    }

    stateUpdates.push(update);
  }

  const pctAbove = withPos ? (above / withPos) * 100 : 0;
  const regime: 'bull' | 'bear' = pctAbove >= 50 ? 'bull' : 'bear';
  const regimeFlipped = prevRegime != null && prevRegime !== regime;

  if (regimeFlipped) {
    events.push({ type: 'regime_flip', priority: 95, data: { pctAbove, regime } });
  }

  return { events, stateUpdates, pctAbove, regime, regimeFlipped };
}
