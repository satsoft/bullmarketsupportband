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

/** Fetch the token logo and inline it as a data URI (no puppeteer network dependency). */
async function fetchLogoDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 600_000) return null; // sanity cap
    const mime = res.headers.get('content-type') || 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function buildHtml(a: AssetSnapshot, logo: string | null): string {
  const pos = a.position;
  const color = pos === 'above_band' ? '#10b981' : pos === 'below_band' ? '#ef4444' : '#f59e0b';
  const posLabel = pos === 'above_band' ? 'ABOVE BAND' : pos === 'below_band' ? 'BELOW BAND' : pos === 'in_band' ? 'IN BAND' : '—';
  // Round first so a near-zero change reads as flat (neutral), not "-0.00%" in red.
  const chgR = a.change24h != null ? Math.round(a.change24h * 100) / 100 : null;
  const chgColor = chgR == null || chgR === 0 ? '#9ca3af' : chgR > 0 ? '#10b981' : '#ef4444';
  const chgText = chgR != null ? `${chgR > 0 ? '+' : chgR < 0 ? '−' : ''}${Math.abs(chgR).toFixed(2)}% (24h)` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1000px; height:500px; font-family:-apple-system,'Segoe UI',Roboto,'DejaVu Sans',Arial,sans-serif;
    background:linear-gradient(135deg,#0a0e1a 0%,#111a2e 55%,#0a1420 100%); color:#e5e7eb; overflow:hidden; }
  .wrap { padding:46px 54px; height:100%; display:flex; flex-direction:column; justify-content:space-between; position:relative; }
  .accent { position:absolute; left:0; top:0; bottom:0; width:10px; background:${color}; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; }
  .id { display:flex; align-items:center; gap:26px; }
  .logo { width:88px; height:88px; border-radius:50%; background:#ffffff10; flex:0 0 auto; }
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
      <div class="id">
        ${logo ? `<img class="logo" src="${logo}"/>` : ''}
        <div><div class="sym">$${esc(a.symbol.toUpperCase())}</div><div class="name">${esc(a.name)}</div></div>
      </div>
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
    const logo = await fetchLogoDataUri(a.logoUrl);
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 500, deviceScaleFactor: 2 });
    await page.setContent(buildHtml(a, logo), { waitUntil: 'networkidle0', timeout: 20000 });
    const buf = await page.screenshot({ type: 'png' });
    return buf as Buffer;
  } finally {
    await browser.close();
  }
}
