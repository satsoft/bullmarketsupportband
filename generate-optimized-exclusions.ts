import { supabaseAdmin } from './lib/supabase';
import { getAllExcludedTokens, shouldExcludeToken } from './lib/token-filters';

interface OptimizedExclusionData {
  relevantExclusions: Array<{
    symbol: string;
    category: string;
    rank: number;
    name: string;
  }>;
  hiddenExclusions: Array<{
    symbol: string;
    category: string;
    rank: number;
    name: string;
  }>;
  stats: {
    totalExcluded: number;
    relevantCount: number;
    hiddenCount: number;
    topRankThreshold: number;
  };
}

async function generateOptimizedExclusions(topRankThreshold: number = 150): Promise<OptimizedExclusionData> {
  console.log(`🎯 Generating optimized exclusion list for tokens ranked ≤ ${topRankThreshold}...\n`);

  // Query database for all cryptocurrencies
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
    .limit(500);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  if (!allCryptos || allCryptos.length === 0) {
    throw new Error('No cryptocurrency data found');
  }

  // Analyze each crypto for exclusion status
  const excludedTokens: Array<{
    symbol: string;
    category: string;
    rank: number;
    name: string;
  }> = [];

  for (const crypto of allCryptos) {
    const exclusion = shouldExcludeToken({
      symbol: crypto.symbol,
      name: crypto.name,
      is_stablecoin: crypto.is_stablecoin
    });

    if (exclusion.exclude) {
      excludedTokens.push({
        symbol: crypto.symbol,
        category: exclusion.reason || 'unknown',
        rank: crypto.current_rank || 999,
        name: crypto.name
      });
    }
  }

  // Split into relevant (high-ranked) and hidden (low-ranked) exclusions
  const relevantExclusions = excludedTokens
    .filter(token => token.rank <= topRankThreshold)
    .sort((a, b) => a.rank - b.rank);

  const hiddenExclusions = excludedTokens
    .filter(token => token.rank > topRankThreshold)
    .sort((a, b) => a.rank - b.rank);

  const stats = {
    totalExcluded: excludedTokens.length,
    relevantCount: relevantExclusions.length,
    hiddenCount: hiddenExclusions.length,
    topRankThreshold
  };

  return {
    relevantExclusions,
    hiddenExclusions,
    stats
  };
}

async function main() {
  try {
    // Generate exclusions for different thresholds to see the impact
    const thresholds = [100, 120, 150];
    
    for (const threshold of thresholds) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`ANALYSIS FOR TOP ${threshold} THRESHOLD`);
      console.log(`${'='.repeat(60)}`);
      
      const optimizedData = await generateOptimizedExclusions(threshold);
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`Total excluded tokens: ${optimizedData.stats.totalExcluded}`);
      console.log(`Relevant exclusions (≤ #${threshold}): ${optimizedData.stats.relevantCount}`);
      console.log(`Hidden exclusions (> #${threshold}): ${optimizedData.stats.hiddenCount}`);
      console.log(`Tooltip reduction: ${((optimizedData.stats.hiddenCount / optimizedData.stats.totalExcluded) * 100).toFixed(1)}%`);

      if (optimizedData.relevantExclusions.length > 0) {
        console.log(`\n🏆 RELEVANT EXCLUSIONS TO SHOW IN TOOLTIP:`);
        
        // Group by category for better presentation
        const categoryGroups = optimizedData.relevantExclusions.reduce((acc, token) => {
          const category = token.category.replace(/^(explicit_|pattern_|database_)/, '');
          if (!acc[category]) acc[category] = [];
          acc[category].push(token);
          return acc;
        }, {} as Record<string, typeof optimizedData.relevantExclusions>);

        Object.entries(categoryGroups).forEach(([category, tokens]) => {
          console.log(`\n  ${category.toUpperCase()} (${tokens.length} tokens):`);
          tokens.forEach(token => {
            console.log(`    #${token.rank.toString().padStart(3, ' ')} ${token.symbol.padEnd(8, ' ')} - ${token.name}`);
          });
        });
      }

      if (threshold === 150 && optimizedData.hiddenExclusions.length > 0) {
        console.log(`\n📉 HIDDEN EXCLUSIONS (ranked > ${threshold}) - Sample:`);
        optimizedData.hiddenExclusions.slice(0, 10).forEach(token => {
          console.log(`    #${token.rank.toString().padStart(3, ' ')} ${token.symbol.padEnd(8, ' ')} - ${token.name}`);
        });
        if (optimizedData.hiddenExclusions.length > 10) {
          console.log(`    ... and ${optimizedData.hiddenExclusions.length - 10} more tokens`);
        }
      }
    }

    // Generate the final recommendation
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`FINAL RECOMMENDATION`);
    console.log(`${'='.repeat(60)}`);
    
    const recommendedData = await generateOptimizedExclusions(150);
    
    console.log(`\n💡 IMPLEMENTATION STRATEGY:`);
    console.log(`1. Show only ${recommendedData.stats.relevantCount} relevant exclusions in tooltip`);
    console.log(`2. Hide ${recommendedData.stats.hiddenCount} low-ranked exclusions`);
    console.log(`3. Update tooltip header to clarify: "Excluded tokens that would rank in TOP 150"`);
    console.log(`4. This reduces tooltip noise by ${((recommendedData.stats.hiddenCount / recommendedData.stats.totalExcluded) * 100).toFixed(1)}%`);

    // Output the actual data structure for implementation
    console.log(`\n📋 IMPLEMENTATION DATA:`);
    console.log(`// Relevant exclusions to show in tooltip:`);
    console.log(`const relevantExclusions = ${JSON.stringify(recommendedData.relevantExclusions.map(t => ({
      symbol: t.symbol,
      category: t.category,
      rank: t.rank
    })), null, 2)};`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();