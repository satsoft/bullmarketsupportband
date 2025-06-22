import { supabaseAdmin } from './lib/supabase';
import { getAllExcludedTokens, shouldExcludeToken } from './lib/token-filters';

interface TokenRankingAnalysis {
  symbol: string;
  name: string;
  current_rank: number;
  is_stablecoin: boolean;
  exclusion_reason: string;
  would_be_in_top_100: boolean;
  would_be_in_top_150: boolean;
}

async function analyzeExcludedTokens() {
  console.log('🔍 Analyzing excluded tokens and their market cap rankings...\n');

  // Get all excluded token symbols from the filter system
  const excludedTokenSymbols = getAllExcludedTokens();
  console.log(`Total explicitly excluded tokens: ${excludedTokenSymbols.length}`);

  // Query database for all cryptocurrencies including excluded ones
  const { data: allCryptos, error } = await supabaseAdmin
    .from('cryptocurrencies')
    .select(`
      id,
      symbol,
      name,
      current_rank,
      is_stablecoin
    `)
    .eq('is_active', true)
    .order('current_rank', { ascending: true })
    .limit(500); // Get top 500 to analyze ranking patterns

  if (error) {
    console.error('Error fetching cryptocurrency data:', error);
    return;
  }

  if (!allCryptos || allCryptos.length === 0) {
    console.error('No cryptocurrency data found');
    return;
  }

  console.log(`Fetched ${allCryptos.length} active cryptocurrencies from database\n`);

  // Analyze each crypto for exclusion status
  const analysis: TokenRankingAnalysis[] = [];
  const includedTokens: string[] = [];
  const excludedTokens: TokenRankingAnalysis[] = [];

  for (const crypto of allCryptos) {
    const exclusion = shouldExcludeToken({
      symbol: crypto.symbol,
      name: crypto.name,
      is_stablecoin: crypto.is_stablecoin
    });

    const tokenAnalysis: TokenRankingAnalysis = {
      symbol: crypto.symbol,
      name: crypto.name,
      current_rank: crypto.current_rank || 999,
      is_stablecoin: crypto.is_stablecoin,
      exclusion_reason: exclusion.reason || 'none',
      would_be_in_top_100: (crypto.current_rank || 999) <= 100,
      would_be_in_top_150: (crypto.current_rank || 999) <= 150
    };

    if (exclusion.exclude) {
      excludedTokens.push(tokenAnalysis);
    } else {
      includedTokens.push(crypto.symbol);
    }

    analysis.push(tokenAnalysis);
  }

  // Filter for excluded tokens that would be in top 100 or 150
  const excludedInTop100 = excludedTokens.filter(t => t.would_be_in_top_100);
  const excludedInTop150 = excludedTokens.filter(t => t.would_be_in_top_150);
  const excludedBeyond150 = excludedTokens.filter(t => !t.would_be_in_top_150);

  console.log('📊 EXCLUSION ANALYSIS RESULTS');
  console.log('=' .repeat(50));
  console.log(`Total tokens analyzed: ${analysis.length}`);
  console.log(`Tokens included: ${includedTokens.length}`);
  console.log(`Tokens excluded: ${excludedTokens.length}`);
  console.log();

  console.log('🏆 EXCLUDED TOKENS THAT WOULD BE IN TOP 100:');
  console.log('=' .repeat(50));
  if (excludedInTop100.length === 0) {
    console.log('None - all excluded tokens are ranked below 100');
  } else {
    excludedInTop100
      .sort((a, b) => a.current_rank - b.current_rank)
      .forEach(token => {
        console.log(`#${token.current_rank.toString().padStart(3, ' ')} ${token.symbol.padEnd(8, ' ')} - ${token.name} (${token.exclusion_reason})`);
      });
  }
  console.log(`Total: ${excludedInTop100.length} tokens\n`);

  console.log('🥈 EXCLUDED TOKENS THAT WOULD BE IN TOP 101-150:');
  console.log('=' .repeat(50));
  const excludedIn101to150 = excludedInTop150.filter(t => !t.would_be_in_top_100);
  if (excludedIn101to150.length === 0) {
    console.log('None - all excluded tokens are either in top 100 or below 150');
  } else {
    excludedIn101to150
      .sort((a, b) => a.current_rank - b.current_rank)
      .forEach(token => {
        console.log(`#${token.current_rank.toString().padStart(3, ' ')} ${token.symbol.padEnd(8, ' ')} - ${token.name} (${token.exclusion_reason})`);
      });
  }
  console.log(`Total: ${excludedIn101to150.length} tokens\n`);

  console.log('📉 EXCLUDED TOKENS RANKED BELOW 150:');
  console.log('=' .repeat(50));
  if (excludedBeyond150.length === 0) {
    console.log('None - all excluded tokens are in top 150');
  } else {
    console.log('Sample of excluded tokens ranked below 150:');
    excludedBeyond150
      .sort((a, b) => a.current_rank - b.current_rank)
      .slice(0, 20) // Show first 20
      .forEach(token => {
        console.log(`#${token.current_rank.toString().padStart(3, ' ')} ${token.symbol.padEnd(8, ' ')} - ${token.name} (${token.exclusion_reason})`);
      });
    if (excludedBeyond150.length > 20) {
      console.log(`... and ${excludedBeyond150.length - 20} more tokens ranked below 150`);
    }
  }
  console.log(`Total: ${excludedBeyond150.length} tokens\n`);

  // Categorize exclusions by reason
  console.log('📋 EXCLUSION REASONS BREAKDOWN:');
  console.log('=' .repeat(50));
  const reasonCounts = excludedTokens.reduce((acc, token) => {
    acc[token.exclusion_reason] = (acc[token.exclusion_reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(reasonCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([reason, count]) => {
      const inTop100 = excludedTokens.filter(t => t.exclusion_reason === reason && t.would_be_in_top_100).length;
      const inTop150 = excludedTokens.filter(t => t.exclusion_reason === reason && t.would_be_in_top_150).length;
      console.log(`${reason.padEnd(25, ' ')}: ${count.toString().padStart(3, ' ')} total (${inTop100} in top 100, ${inTop150} in top 150)`);
    });

  console.log('\n🎯 RECOMMENDATION FOR TOOLTIP:');
  console.log('=' .repeat(50));
  if (excludedInTop150.length === 0) {
    console.log('✅ Show message: "No excluded tokens would rank in top 150"');
  } else {
    console.log(`Show only these ${excludedInTop150.length} excluded tokens in tooltip:`);
    excludedInTop150
      .sort((a, b) => a.current_rank - b.current_rank)
      .forEach(token => {
        const category = token.exclusion_reason.replace(/^(explicit_|pattern_|database_)/, '');
        console.log(`• ${token.symbol} (#${token.current_rank}) - ${category}`);
      });
    
    console.log(`\nHide these ${excludedBeyond150.length} tokens that are ranked below 150 (not competitive)`);
  }

  console.log('\n🔧 CURRENT TOP 100 ANALYSIS:');
  console.log('=' .repeat(50));
  
  // Check what the current top 100 looks like after exclusions
  const currentTop100Eligible = allCryptos
    .filter(crypto => {
      const exclusion = shouldExcludeToken({
        symbol: crypto.symbol,
        name: crypto.name,
        is_stablecoin: crypto.is_stablecoin
      });
      return !exclusion.exclude;
    })
    .slice(0, 100);

  const actualRanks = currentTop100Eligible.map(c => c.current_rank || 999);
  const maxRank = Math.max(...actualRanks);
  const gaps = actualRanks.filter(rank => rank > 100);

  console.log(`Current TOP 100 dashboard includes tokens ranked up to #${maxRank}`);
  console.log(`${gaps.length} tokens in display are ranked beyond #100`);
  console.log(`Highest ranked token in display: #${maxRank}`);
  
  if (gaps.length > 0) {
    console.log('\nTokens in TOP 100 display but ranked beyond #100:');
    currentTop100Eligible
      .filter(c => (c.current_rank || 0) > 100)
      .slice(0, 10)
      .forEach(crypto => {
        console.log(`#${crypto.current_rank} ${crypto.symbol} - ${crypto.name}`);
      });
  }
}

// Run the analysis
analyzeExcludedTokens().catch(console.error);