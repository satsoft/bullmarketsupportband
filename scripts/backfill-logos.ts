#!/usr/bin/env tsx
/** Backfill cryptocurrencies.logo_url from CoinGecko /coins/markets (image field). 1-2 calls. */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { supabaseAdmin } from '../lib/supabase';
const KEY = process.env.COINGECKO_API_KEY || '';
const BASE = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));
async function main(){
  const byId = new Map<string,string>();
  for (const page of [1,2]) {
    const url = `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false`;
    const res = await fetch(url, { headers: { 'x-cg-demo-api-key': KEY } });
    if (!res.ok) { console.log(`page ${page}: HTTP ${res.status}`); continue; }
    const rows:any[] = await res.json();
    for (const r of rows) if (r.id && r.image) byId.set(r.id, r.image);
    await sleep(2600);
  }
  console.log(`fetched ${byId.size} logo URLs`);
  const { data: assets } = await supabaseAdmin.from('cryptocurrencies').select('id, coingecko_id').eq('is_active', true);
  let updated = 0;
  for (const a of assets || []) {
    const logo = byId.get(a.coingecko_id);
    if (logo) { await supabaseAdmin.from('cryptocurrencies').update({ logo_url: logo }).eq('id', a.id); updated++; }
  }
  console.log(`updated ${updated} assets with logos`);
  process.exit(0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
