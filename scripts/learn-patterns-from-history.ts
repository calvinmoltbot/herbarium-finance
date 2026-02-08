#!/usr/bin/env tsx

/**
 * Pattern Learning Script
 *
 * Analyzes existing transactions to learn categorization patterns
 * Usage: pnpm learn-patterns
 */

import { createClient } from '@supabase/supabase-js';
import { PatternMatcher } from '../lib/pattern-matcher';

// Initialize Supabase client for CLI
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Transaction {
  id: string;
  description: string;
  category_id: string;
  category?: {
    id: string;
    name: string;
    type: 'income' | 'expenditure' | 'capital';
  };
}

interface PatternGroup {
  description: string;
  category_id: string;
  category_name: string;
  count: number;
  transaction_ids: string[];
}

async function main() {
  console.log('🧠 Learning patterns from historical transactions...\n');

  // Step 1: Fetch all transactions with categories
  console.log('📊 Fetching transactions...');
  const { data: transactions, error: fetchError } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      category_id,
      category:categories(id, name, type)
    `)
    .not('category_id', 'is', null)
    .not('description', 'is', null);

  if (fetchError) {
    console.error('❌ Error fetching transactions:', fetchError);
    process.exit(1);
  }

  if (!transactions || transactions.length === 0) {
    console.log('ℹ️  No transactions found with categories');

    // Debug: Check total transaction count
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total transactions in database: ${count || 0}`);

    if (count && count > 0) {
      // Check how many have categories
      const { count: withCategories } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .not('category_id', 'is', null);

      console.log(`   Transactions with categories: ${withCategories || 0}`);
      console.log('   💡 You may need to categorize your transactions first');
    } else {
      console.log('   💡 Import some transactions first using the bank import feature');
    }

    process.exit(0);
  }

  console.log(`✅ Found ${transactions.length} transactions\n`);

  // Step 2: Group transactions by normalized description + category
  console.log('🔍 Grouping transactions by pattern...');
  const groups = new Map<string, PatternGroup>();

  for (const transaction of transactions as Transaction[]) {
    // Skip transactions with short or invalid descriptions
    if (!transaction.description || transaction.description.trim().length < 4) {
      continue;
    }

    // Skip transactions without category
    if (!transaction.category_id || !transaction.category) {
      continue;
    }

    // Normalize description for grouping
    const normalizedDesc = PatternMatcher.normalizeText(transaction.description);
    const groupKey = `${normalizedDesc}|${transaction.category_id}`;

    if (groups.has(groupKey)) {
      const group = groups.get(groupKey)!;
      group.count++;
      group.transaction_ids.push(transaction.id);
    } else {
      groups.set(groupKey, {
        description: normalizedDesc,
        category_id: transaction.category_id,
        category_name: transaction.category.name,
        count: 1,
        transaction_ids: [transaction.id],
      });
    }
  }

  console.log(`✅ Found ${groups.size} unique description+category combinations\n`);

  // Step 3: Extract patterns and save to database
  console.log('💾 Creating patterns...');
  let patternsCreated = 0;
  let patternsUpdated = 0;
  let patternsSkipped = 0;

  const now = new Date().toISOString();

  for (const group of groups.values()) {
    // Only create patterns for groups with 2+ occurrences
    if (group.count < 2) {
      patternsSkipped++;
      continue;
    }

    // Extract patterns from description
    const patterns = PatternMatcher.extractPatternsFromDescription(group.description);

    // Take top 3 patterns to avoid overwhelming the database
    const topPatterns = patterns.slice(0, 3);

    for (const pattern of topPatterns) {
      try {
        // Validate pattern is a valid regex
        new RegExp(pattern);
      } catch (error) {
        console.warn(`⚠️  Skipping invalid pattern: ${pattern}`);
        continue;
      }

      // Calculate confidence score based on match count
      // Formula: min(50 + (count * 10), 100)
      const confidenceScore = Math.min(50 + (group.count * 10), 100);

      // Check if pattern already exists
      const { data: existing, error: checkError } = await supabase
        .from('categorization_patterns')
        .select('id, category_id, match_count, confidence_score')
        .eq('pattern', pattern)
        .maybeSingle();

      if (checkError) {
        console.error(`❌ Error checking pattern "${pattern}":`, checkError);
        continue;
      }

      if (existing) {
        // Update existing pattern
        if (existing.category_id === group.category_id) {
          // Same category - increase confidence and match count
          const newMatchCount = existing.match_count + group.count;
          const newConfidence = Math.min(existing.confidence_score + 10, 100);

          const { error: updateError } = await supabase
            .from('categorization_patterns')
            .update({
              match_count: newMatchCount,
              confidence_score: newConfidence,
              last_matched: now,
              updated_at: now,
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`❌ Error updating pattern "${pattern}":`, updateError);
          } else {
            patternsUpdated++;
          }
        } else {
          // Different category - this is a conflict, skip
          patternsSkipped++;
        }
      } else {
        // Create new pattern
        const { error: insertError } = await supabase
          .from('categorization_patterns')
          .insert({
            user_id: null, // Shared data model - no user_id
            pattern,
            category_id: group.category_id,
            match_count: group.count,
            confidence_score: confidenceScore,
            last_matched: now,
            created_at: now,
            updated_at: now,
          });

        if (insertError) {
          console.error(`❌ Error creating pattern "${pattern}":`, insertError);
        } else {
          patternsCreated++;
        }
      }
    }
  }

  // Step 4: Report results
  console.log('\n✨ Learning complete!\n');
  console.log('📈 Results:');
  console.log(`   • Patterns created: ${patternsCreated}`);
  console.log(`   • Patterns updated: ${patternsUpdated}`);
  console.log(`   • Patterns skipped: ${patternsSkipped}`);
  console.log(`   • Total processed: ${patternsCreated + patternsUpdated + patternsSkipped}\n`);

  // Step 5: Show top patterns for review
  console.log('🔝 Top 10 Patterns Created/Updated:');
  const { data: topPatterns, error: topError } = await supabase
    .from('categorization_patterns')
    .select(`
      pattern,
      match_count,
      confidence_score,
      category:categories(name)
    `)
    .order('confidence_score', { ascending: false })
    .order('match_count', { ascending: false })
    .limit(10);

  if (topError) {
    console.error('❌ Error fetching top patterns:', topError);
  } else if (topPatterns && topPatterns.length > 0) {
    topPatterns.forEach((p, i) => {
      const categoryName = (p.category as any)?.name || 'Unknown';
      console.log(`   ${i + 1}. "${p.pattern}" → ${categoryName} (confidence: ${p.confidence_score}, matches: ${p.match_count})`);
    });
  }

  console.log('\n💡 Next steps:');
  console.log('   1. Review patterns at /patterns page');
  console.log('   2. Edit or delete any incorrect patterns');
  console.log('   3. Re-import your CSV to test improved suggestions\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
