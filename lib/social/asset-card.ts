/**
 * Renders a self-contained, on-brand per-asset BMSB card (1000x500, 2:1 for X) via
 * puppeteer + setContent. No live-site dependency (unlike the old captureTickerFocus),
 * and pure CSS (no emoji-font reliance) so it renders identically in CI.
 */
import puppeteer from 'puppeteer';
import type { AssetSnapshot } from './data';

function fmtPrice(n: number | null): string {
  if (n == null) return 'N/A';
  if (n >= 1) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.001) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(2)}`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function buildHtml(a: AssetSnapshot): string {
  const pos = a.position;
  const color = pos === 'above_band' ? '#10b981' : pos === 'below_band' ? '#ef4444' : '#f59e0b';
  const posLabel = pos === 'above_band' ? 'ABOVE BAND' : pos === 'below_band' ? 'BELOW BAND' : pos === 'in_band' ? 'IN BAND' : '—';
  const chg = a.change24h;
  const chgColor = chg != null && chg >= 0 ? '#10b981' : '#ef4444';
  const chgText = chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% (24h)` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1000px; height:500px; font-family:-apple-system,'Segoe UI',Roboto,'DejaVu Sans',Arial,sans-serif;
    background:linear-gradient(135deg,#0a0e1a 0%,#111a2e 55%,#0a1420 100%); color:#e5e7eb; overflow:hidden; }
  .wrap { padding:46px 54px; height:100%; display:flex; flex-direction:column; justify-content:space-between; position:relative; }
  .accent { position:absolute; left:0; top:0; bottom:0; width:10px; background:${color}; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; }
  .sym { font-size:62px; font-weight:800; color:#fff; letter-spacing:-1px; line-height:1; }
  .name { font-size:24px; color:#9ca3af; margin-top:8px; }
  .badge { background:${color}22; color:${color}; border:2px solid ${color}; border-radius:999px;
    padding:12px 26px; font-size:24px; font-weight:800; letter-spacing:.5px; white-space:nowrap; }
  .price { font-size:74px; font-weight:800; color:#fff; line-height:1; }
  .chg { font-size:28px; font-weight:700; color:${chgColor}; margin-top:10px; }
  .stats { display:flex; gap:54px; }
  .stat .lbl { font-size:19px; color:#9ca3af; text-transform:uppercase; letter-spacing:.5px; }
  .stat .val { font-size:30px; font-weight:700; color:#fff; margin-top:4px; font-variant-numeric:tabular-nums; }
  .foot { display:flex; justify-content:space-between; align-items:center; color:#6b7280; font-size:20px; font-weight:600; }
  .foot .brand { color:#9ca3af; letter-spacing:1px; }
  </style></head><body><div class="wrap">
    <div class="accent"></div>
    <div class="top">
      <div><div class="sym">$${esc(a.symbol.toUpperCase())}</div><div class="name">${esc(a.name)}</div></div>
      <div class="badge">${posLabel}</div>
    </div>
    <div>
      <div class="price">${fmtPrice(a.price)}</div>
      ${chgText ? `<div class="chg">${chgText}</div>` : ''}
    </div>
    <div class="stats">
      <div class="stat"><div class="lbl">20W SMA</div><div class="val">${fmtPrice(a.sma)}</div></div>
      <div class="stat"><div class="lbl">21W EMA</div><div class="val">${fmtPrice(a.ema)}</div></div>
      <div class="stat"><div class="lbl">Support Band</div><div class="val">${fmtPrice(a.bandLower)} – ${fmtPrice(a.bandUpper)}</div></div>
    </div>
    <div class="foot"><div class="brand">BULL MARKET SUPPORT BAND</div><div>bullmarketsupportband.com</div></div>
  </div></body></html>`;
}

export async function renderAssetCard(a: AssetSnapshot): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 500, deviceScaleFactor: 2 });
    await page.setContent(buildHtml(a), { waitUntil: 'networkidle0', timeout: 20000 });
    const buf = await page.screenshot({ type: 'png' });
    return buf as Buffer;
  } finally {
    await browser.close();
  }
}
