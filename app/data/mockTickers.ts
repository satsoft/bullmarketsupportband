import { Ticker } from '../types';

const cryptos = [
  'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE', 'DOT', 'AVAX', 'SHIB',
  'MATIC', 'LTC', 'UNI', 'LINK', 'BCH', 'ALGO', 'XLM', 'VET', 'FIL', 'TRX',
  'ETC', 'ATOM', 'ICP', 'THETA', 'XMR', 'AAVE', 'MKR', 'NEO', 'CAKE', 'KSM',
  'AXS', 'SAND', 'MANA', 'ENJ', 'CHZ', 'HOT', 'BAT', 'ZIL', 'SUSHI', 'CRV',
  'COMP', 'YFI', 'SNX', 'UMA', 'BAL', 'LRC', 'ZRX', 'REN', 'KNC', '1INCH',
  'ALPHA', 'BAND', 'STORJ', 'NMR', 'GRT', 'SKL', 'NU', 'OGN', 'ANKR', 'CVC',
  'REQ', 'RLC', 'FET', 'OCEAN', 'CTSI', 'CELO', 'IOTX', 'ONE', 'ZEN', 'KAVA',
  'QTUM', 'ICX', 'ONT', 'SC', 'DGB', 'RVN', 'BTG', 'NANO', 'WAVES', 'LSK',
  'STRAX', 'STMX', 'DENT', 'WIN', 'BTT', 'TRB', 'FTM', 'ROSE', 'NEAR', 'LUNA',
  'EGLD', 'FLOW', 'XTZ', 'DASH', 'ZEC', 'DCR', 'MIOTA', 'HBAR', 'HNT', 'RUNE'
];

const cryptoNames: Record<string, string> = {
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'BNB': 'BNB',
  'XRP': 'XRP',
  'ADA': 'Cardano',
  'SOL': 'Solana',
  'DOGE': 'Dogecoin',
  'DOT': 'Polkadot',
  'AVAX': 'Avalanche',
  'SHIB': 'Shiba Inu',
  'MATIC': 'Polygon',
  'LTC': 'Litecoin',
  'UNI': 'Uniswap',
  'LINK': 'Chainlink',
  'BCH': 'Bitcoin Cash',
  'ALGO': 'Algorand',
  'XLM': 'Stellar',
  'VET': 'VeChain',
  'FIL': 'Filecoin',
  'TRX': 'TRON',
  'ETC': 'Ethereum Classic',
  'ATOM': 'Cosmos',
  'ICP': 'Internet Computer',
  'THETA': 'Theta Network',
  'XMR': 'Monero',
  'AAVE': 'Aave',
  'MKR': 'Maker',
  'NEO': 'Neo',
  'CAKE': 'PancakeSwap',
  'KSM': 'Kusama',
  'AXS': 'Axie Infinity',
  'SAND': 'The Sandbox',
  'MANA': 'Decentraland',
  'ENJ': 'Enjin Coin',
  'CHZ': 'Chiliz',
  'HOT': 'Holo',
  'BAT': 'Basic Attention Token',
  'ZIL': 'Zilliqa',
  'SUSHI': 'SushiSwap',
  'CRV': 'Curve DAO Token',
  'COMP': 'Compound',
  'YFI': 'yearn.finance',
  'SNX': 'Synthetix',
  'UMA': 'UMA',
  'BAL': 'Balancer',
  'LRC': 'Loopring',
  'ZRX': '0x',
  'REN': 'Ren',
  'KNC': 'Kyber Network',
  '1INCH': '1inch',
  'ALPHA': 'Alpha Finance Lab',
  'BAND': 'Band Protocol',
  'STORJ': 'Storj',
  'NMR': 'Numeraire',
  'GRT': 'The Graph',
  'SKL': 'SKALE Network',
  'NU': 'NuCypher',
  'OGN': 'Origin Protocol',
  'ANKR': 'Ankr',
  'CVC': 'Civic',
  'REQ': 'Request',
  'RLC': 'iExec RLC',
  'FET': 'Fetch.ai',
  'OCEAN': 'Ocean Protocol',
  'CTSI': 'Cartesi',
  'CELO': 'Celo',
  'IOTX': 'IoTeX',
  'ONE': 'Harmony',
  'ZEN': 'Horizen',
  'KAVA': 'Kava',
  'QTUM': 'Qtum',
  'ICX': 'ICON',
  'ONT': 'Ontology',
  'SC': 'Siacoin',
  'DGB': 'DigiByte',
  'RVN': 'Ravencoin',
  'BTG': 'Bitcoin Gold',
  'NANO': 'Nano',
  'WAVES': 'Waves',
  'LSK': 'Lisk',
  'STRAX': 'Stratis',
  'STMX': 'StormX',
  'DENT': 'Dent',
  'WIN': 'WINkLink',
  'BTT': 'BitTorrent',
  'TRB': 'Tellor',
  'FTM': 'Fantom',
  'ROSE': 'Oasis Network',
  'NEAR': 'NEAR Protocol',
  'LUNA': 'Terra Luna Classic',
  'EGLD': 'MultiversX',
  'FLOW': 'Flow',
  'XTZ': 'Tezos',
  'DASH': 'Dash',
  'ZEC': 'Zcash',
  'DCR': 'Decred',
  'MIOTA': 'IOTA',
  'HBAR': 'Hedera',
  'HNT': 'Helium',
  'RUNE': 'THORChain'
};

function generateRandomPrice(symbol: string): number {
  // BTC and ETH get higher prices
  if (symbol === 'BTC') return Math.random() * 10000 + 60000;
  if (symbol === 'ETH') return Math.random() * 1000 + 3000;
  // Other major cryptos
  if (['BNB', 'SOL', 'ADA', 'DOT', 'AVAX'].includes(symbol)) {
    return Math.random() * 100 + 10;
  }
  // Smaller altcoins
  return Math.random() * 10 + 0.1;
}

function generateRandomChange(): { change: number; changePercent: number; status: 'up' | 'down' } {
  const changePercent = (Math.random() - 0.5) * 20; // -10% to +10% (more volatile for crypto)
  const status: 'up' | 'down' = changePercent >= 0 ? 'up' : 'down';
  const change = changePercent; // We'll calculate the actual change amount in the component
  
  return { change, changePercent, status };
}

export function generateMockTickers(): Ticker[] {
  return cryptos.map((symbol, index) => {
    const price = generateRandomPrice(symbol);
    const { change, changePercent, status } = generateRandomChange();
    
    return {
      id: `ticker-${index}`,
      symbol,
      name: cryptoNames[symbol] || symbol,
      price,
      change,
      changePercent,
      status,
      lastUpdate: new Date(Date.now() - Math.random() * 300000), // Random time within last 5 minutes
      // BMSB fields
      rank: index + 1,
      sma_20_week: price * (0.9 + Math.random() * 0.2),
      ema_21_week: price * (0.9 + Math.random() * 0.2),
      support_band_lower: price * 0.9,
      support_band_upper: price * 1.1,
      price_position: Math.random() > 0.5 ? 'above_band' : 'below_band' as 'above_band' | 'in_band' | 'below_band',
      sma_trend: Math.random() > 0.5 ? 'increasing' : 'decreasing' as 'increasing' | 'decreasing',
      ema_trend: Math.random() > 0.5 ? 'increasing' : 'decreasing' as 'increasing' | 'decreasing',
      band_health: Math.random() > 0.5 ? 'healthy' : 'weak' as 'healthy' | 'weak',
      is_stablecoin: false,
      calculation_date: new Date().toISOString().split('T')[0]
    };
  });
}