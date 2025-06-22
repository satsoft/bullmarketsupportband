/**
 * Comprehensive token filtering system for identifying derivative tokens
 * that should be excluded from BMSB analysis
 */

// Explicit token exclusions by symbol
export const EXCLUDED_TOKENS = {
  // Wrapped tokens
  wrapped: [
    'WETH', 'WBTC', 'WBNB', 'WMATIC', 'WAVAX', 'WFTM', 'WONE', 'WCFX',
    'WSOL', 'WADA', 'WDOT', 'WLINK', 'WTRX'
  ],
  
  // Liquid Staking Tokens (LSTs) - actual derivative tokens, not protocol tokens
  liquidStaking: [
    'STETH', 'RETH', 'CBETH', 'SFRXETH', 'WSTETH', 'SWETH', 'OSETH',
    'MSOL', 'JUPSOL', 'JSOL', 'BSOL', 'SCNSOL', 'JITOSOL', 'BNSOL',
    'METH', 'EZETH', 'RSETH', 'ETHX', 'RSWETH', 'SOLVBTC', 'XSOLVBTC', 'SUPEROETH'
  ],
  
  // Stablecoins
  stablecoins: [
    'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD', 'FRAX', 
    'LUSD', 'FDUSD', 'PYUSD', 'USDE', 'CRVUSD', 'GUSD', 'USDM', 'OUSG'
  ],
  
  // Liquid Restaking Tokens (LRTs) - actual derivative tokens, not protocol tokens
  liquidRestaking: [
    'EZETH', 'RSETH', 'PZETH', 'UNIETH', 'RESTAKE', 'CMETH'
  ],
  
  // Cross-chain wrapped tokens
  crossChain: [
    'CLBTC', 'WLUNA', 'WATOM', 'HBTC', 'RENBTC', 'BTCB', 'TBTC', 'LBTC', 'BTC.B', 'CGETH.HASHKEY'
  ],
  
  // Synthetic/derivative tokens
  synthetic: [
    'AETHC', 'ETHX', 'OETH', 'SETH2', 'ALETH', 'ANKRETH'
  ]
};

// Pattern-based filters for dynamic detection (more specific patterns)
export const TOKEN_PATTERNS = {
  // Wrapped token patterns - more specific
  wrapped: /^W(BTC|ETH|BNB|MATIC|AVAX|FTM|ONE|CFX|SOL|ADA|DOT|LINK|TRX)$/,
  
  // Staked token patterns - more specific 
  staked: /^ST(ETH|MATIC|DOT|ATOM)$|^(J|B|M)SOL$/,
  
  // Liquid staking patterns - more specific
  liquidStaking: /^(RETH|CBETH|FRXETH|SWETH|OSETH)$|^(ST|R|CB|FR|SW|OS)ETH$/,
  
  // Cross-chain bridge patterns - more specific
  bridge: /^(HBTC|CLBTC|RENBTC|BTCB|TBTC)$/,
  
  // Vault/yield bearing patterns - more specific
  vault: /VAULT|YIELD|^(Y|V)USD|^A(USDT|USDC|DAI)$/i
};

// Name-based filters for tokens that might have misleading symbols
export const NAME_FILTERS = [
  // Wrapped indicators - more specific
  /^wrapped\s+(bitcoin|ethereum|bnb|matic|avalanche)/i,
  /\bwrapped\s+\w+/i,
  
  // Binance-pegged tokens
  /^binance.?peg/i,
  /\bbinance.?pegged/i,
  /\bbep.?20\s+\w+/i,
  
  // Staking indicators - more specific
  /\bliquid\s+staking/i,
  /\bstaking\s+derivative/i,
  /\bliquid\s+staked/i,
  /\bstaked\s+(ethereum|eth)\b/i,
  
  // Yield/vault indicators - more specific
  /\byield\s+(farming|bearing|vault)/i,
  /\bvault\s+token/i,
  /\bsynthetic\s+(asset|token)/i,
  
  // Bridge indicators - more specific
  /\bbridge\s+token/i,
  /\bcross.?chain\s+(wrapped|bridge)/i,
  /\bmulti.?chain\s+bridge/i
];

/**
 * Check if a token should be excluded based on comprehensive filters
 */
export function shouldExcludeToken(token: {
  symbol: string;
  name: string;
  is_stablecoin?: boolean;
  current_rank?: number;
}, allTokens?: Array<{ symbol: string; current_rank?: number }>): { exclude: boolean; reason?: string } {
  const symbol = token.symbol.toUpperCase();
  const name = token.name.toLowerCase();
  
  // Dynamic gold token selection - include only the higher-ranked gold token
  if (symbol === 'PAXG' || symbol === 'XAUT') {
    if (allTokens && allTokens.length > 0) {
      const paxg = allTokens.find(t => t.symbol === 'PAXG');
      const xaut = allTokens.find(t => t.symbol === 'XAUT');
      
      if (paxg && xaut && paxg.current_rank && xaut.current_rank) {
        // Lower rank number = higher market cap, so include the one with lower rank
        const higherRankedToken = paxg.current_rank < xaut.current_rank ? 'PAXG' : 'XAUT';
        
        if (symbol === higherRankedToken) {
          return { exclude: false }; // Include the higher-ranked gold token
        } else {
          return { exclude: true, reason: 'gold_token_lower_rank' }; // Exclude the lower-ranked one
        }
      }
    }
    
    // Fallback logic when allTokens is not provided or incomplete
    // For PAXG: if it's marked as stablecoin in DB, we need to override that and include it
    if (symbol === 'PAXG') {
      return { exclude: false }; // Include PAXG (override stablecoin status)
    }
    // For XAUT: exclude by default unless it becomes the higher-ranked one
    if (symbol === 'XAUT') {
      return { exclude: true, reason: 'gold_token_default_exclude' };
    }
  }
  
  // Check if marked as stablecoin in database
  if (token.is_stablecoin) {
    return { exclude: true, reason: 'database_stablecoin' };
  }
  
  // Check explicit exclusion lists
  for (const [category, tokens] of Object.entries(EXCLUDED_TOKENS)) {
    if (tokens.includes(symbol)) {
      return { exclude: true, reason: `explicit_${category}` };
    }
  }
  
  // Check pattern-based filters
  for (const [category, pattern] of Object.entries(TOKEN_PATTERNS)) {
    if (pattern.test(symbol)) {
      return { exclude: true, reason: `pattern_${category}` };
    }
  }
  
  // Check name-based filters
  for (const namePattern of NAME_FILTERS) {
    if (namePattern.test(name)) {
      return { exclude: true, reason: 'name_filter' };
    }
  }
  
  return { exclude: false };
}

/**
 * Get all excluded tokens as a flat array for database queries
 */
export function getAllExcludedTokens(): string[] {
  return Object.values(EXCLUDED_TOKENS).flat();
}

/**
 * Analyze a batch of tokens and return exclusion stats
 */
export function analyzeTokenExclusions(tokens: Array<{
  symbol: string;
  name: string;
  is_stablecoin?: boolean;
  current_rank?: number;
}>) {
  const results = tokens.map(token => ({
    ...token,
    exclusion: shouldExcludeToken(token, tokens.map(t => ({ symbol: t.symbol, current_rank: t.current_rank })))
  }));
  
  const excluded = results.filter(r => r.exclusion.exclude);
  const included = results.filter(r => !r.exclusion.exclude);
  
  const exclusionReasons = excluded.reduce((acc, token) => {
    const reason = token.exclusion.reason || 'unknown';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total: tokens.length,
    excluded: excluded.length,
    included: included.length,
    exclusionReasons,
    excludedTokens: excluded.map(t => ({ symbol: t.symbol, reason: t.exclusion.reason }))
  };
}