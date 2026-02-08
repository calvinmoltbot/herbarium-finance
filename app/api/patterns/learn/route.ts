import { NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';
import { PatternMatcher } from '@/lib/pattern-matcher';

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

interface LearningResult {
  success: boolean;
  patternsCreated: number;
  patternsUpdated: number;
  patternsSkipped: number;
  totalTransactions: number;
  topPatterns: Array<{
    pattern: string;
    categoryName: string;
    confidence: number;
    matchCount: number;
  }>;
  error?: string;
}

export async function POST() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 1: Fetch all transactions with categories
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
      return NextResponse.json(
        { success: false, error: `Failed to fetch transactions: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json<LearningResult>({
        success: true,
        patternsCreated: 0,
        patternsUpdated: 0,
        patternsSkipped: 0,
        totalTransactions: 0,
        topPatterns: [],
        error: 'No transactions found with categories. Import and categorize transactions first.',
      });
    }

    // Step 2: Group transactions by normalized description + category
    const groups = new Map<string, PatternGroup>();

    for (const transaction of transactions as unknown as Transaction[]) {
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

    // Step 3: Extract patterns and save to database
    let patternsCreated = 0;
    let patternsUpdated = 0;
    let patternsSkipped = 0;
    let groupsWithDuplicates = 0;

    const now = new Date().toISOString();

    // Debug: Log group statistics
    console.log(`[Pattern Learning] Total groups: ${groups.size}`);
    const duplicateGroups = Array.from(groups.values()).filter(g => g.count >= 2);
    console.log(`[Pattern Learning] Groups with 2+ transactions: ${duplicateGroups.length}`);
    if (duplicateGroups.length > 0) {
      console.log('[Pattern Learning] Top duplicate groups:', duplicateGroups.slice(0, 5).map(g => ({
        description: g.description.slice(0, 30),
        category: g.category_name,
        count: g.count
      })));
    }

    for (const group of groups.values()) {
      // Only create patterns for groups with 2+ occurrences
      if (group.count < 2) {
        patternsSkipped++;
        continue;
      }

      groupsWithDuplicates++;

      // Extract patterns from description
      const patterns = PatternMatcher.extractPatternsFromDescription(group.description);

      // Take top 3 patterns to avoid overwhelming the database
      const topPatterns = patterns.slice(0, 3);

      for (const pattern of topPatterns) {
        try {
          // Validate pattern is a valid regex
          new RegExp(pattern);
        } catch {
          console.warn(`[Pattern Learning] Skipping invalid pattern: ${pattern}`);
          patternsSkipped++;
          continue;
        }

        // Calculate confidence score based on match count
        // Formula: min(50 + (count * 10), 100)
        const confidenceScore = Math.min(50 + (group.count * 10), 100);

        // Check if pattern already exists for this user
        const { data: existing, error: checkError } = await supabase
          .from('categorization_patterns')
          .select('id, category_id, match_count, confidence_score')
          .eq('pattern', pattern)
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError) {
          console.error(`[Pattern Learning] Error checking pattern "${pattern}":`, checkError);
          patternsSkipped++;
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
              console.error(`[Pattern Learning] Error updating pattern "${pattern}":`, updateError);
              patternsSkipped++;
            } else {
              patternsUpdated++;
              console.log(`[Pattern Learning] Updated pattern: "${pattern}" → ${group.category_name} (confidence: ${newConfidence})`);
            }
          } else {
            // Different category - this is a conflict, skip
            console.log(`[Pattern Learning] Conflict: pattern "${pattern}" exists for different category (${existing.category_id} vs ${group.category_id})`);
            patternsSkipped++;
          }
        } else {
          // Create new pattern
          const { error: insertError } = await supabase
            .from('categorization_patterns')
            .insert({
              user_id: user.id, // Use authenticated user ID
              pattern,
              category_id: group.category_id,
              match_count: group.count,
              confidence_score: confidenceScore,
              last_matched: now,
              created_at: now,
              updated_at: now,
            });

          if (insertError) {
            console.error(`[Pattern Learning] Error creating pattern "${pattern}":`, insertError);
            patternsSkipped++;
          } else {
            patternsCreated++;
            console.log(`[Pattern Learning] Created pattern: "${pattern}" → ${group.category_name} (confidence: ${confidenceScore})`);
          }
        }
      }
    }

    // Debug: Log final statistics
    console.log(`[Pattern Learning] Final Stats:
      - Total groups: ${groups.size}
      - Groups with duplicates: ${groupsWithDuplicates}
      - Patterns created: ${patternsCreated}
      - Patterns updated: ${patternsUpdated}
      - Patterns skipped: ${patternsSkipped}
    `);

    // Step 4: Get top patterns for response
    const { data: topPatterns } = await supabase
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedTopPatterns = (topPatterns || []).map((p: any) => ({
      pattern: p.pattern,
      categoryName: (Array.isArray(p.category) ? p.category[0]?.name : p.category?.name) || 'Unknown',
      confidence: p.confidence_score,
      matchCount: p.match_count,
    }));

    return NextResponse.json<LearningResult>({
      success: true,
      patternsCreated,
      patternsUpdated,
      patternsSkipped,
      totalTransactions: transactions.length,
      topPatterns: formattedTopPatterns,
    });

  } catch (error) {
    console.error('Pattern learning error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
