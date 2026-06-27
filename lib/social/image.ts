/**
 * Best-effort chart image generation. NEVER throws — any failure (no puppeteer,
 * serverless limits, free-tier media restrictions upstream) returns null and the
 * caller posts text-only. Uses dynamic import so a missing puppeteer dependency
 * can't crash the bot at module load.
 */
import { socialConfig } from './config';
import type { AssetSnapshot } from './data';

export async function tickerImage(asset: AssetSnapshot): Promise<Buffer | null> {
  if (!socialConfig.images) return null;
  try {
    const { renderAssetCard } = await import('./asset-card');
    return await renderAssetCard(asset);
  } catch (e) {
    console.warn(`[image] asset card ${asset.symbol} failed → text-only:`, (e as Error).message);
    return null;
  }
}

export async function marketImage(): Promise<Buffer | null> {
  if (!socialConfig.images) return null;
  try {
    const { TargetedScreenshotService } = await import('../targeted-screenshot-service');
    return await TargetedScreenshotService.captureMarketStatusSection(socialConfig.siteUrl);
  } catch (e) {
    console.warn('[image] market failed → text-only:', (e as Error).message);
    return null;
  }
}
