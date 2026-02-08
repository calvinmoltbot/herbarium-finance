// Pattern Matcher Utility
// Handles pattern matching, extraction, and learning from categorization decisions

export interface Pattern {
  id: string;
  pattern: string;
  category_id: string;
  confidence_score: number;
  category?: {
    id: string;
    name: string;
    type: 'income' | 'expenditure' | 'capital';
    color: string;
  };
}

export interface PatternMatch {
  category_id: string;
  confidence: number;
  pattern_id?: string;
  category: {
    id: string;
    name: string;
    type: 'income' | 'expenditure' | 'capital';
    color: string;
  };
}

export class PatternMatcher {
  /**
   * Match a description against a set of patterns
   */
  static matchPatterns(description: string, patterns: Pattern[]): PatternMatch[] {
    const normalizedDescription = this.normalizeText(description);
    const matches: PatternMatch[] = [];

    for (const pattern of patterns) {
      try {
        const patternRegex = new RegExp(pattern.pattern, 'i');
        if (patternRegex.test(normalizedDescription)) {
          matches.push({
            category_id: pattern.category_id,
            confidence: pattern.confidence_score / 100,
            pattern_id: pattern.id,
            category: pattern.category!,
          });
        }
      } catch (error) {
        console.error(`Invalid pattern regex: ${pattern.pattern}`, error);
        // Skip invalid patterns
      }
    }

    return matches;
  }

  /**
   * Extract patterns from a transaction description
   */
  static extractPatternsFromDescription(description: string): string[] {
    const normalized = this.normalizeText(description);
    const patterns: string[] = [];

    // Extract key terms (words with 4+ characters)
    const words = normalized.split(/\s+/).filter(word => word.length >= 4);
    
    // Create patterns from individual words
    words.forEach(word => {
      patterns.push(word);
    });

    // Create patterns from word pairs
    for (let i = 0; i < words.length - 1; i++) {
      patterns.push(`${words[i]}\\s+${words[i+1]}`);
    }

    // Create pattern from first 3 words if available
    if (words.length >= 3) {
      patterns.push(`${words[0]}\\s+${words[1]}\\s+${words[2]}`);
    }

    // Create pattern from company names (words starting with capital letters)
    const companyNamePattern = normalized.match(/\b[A-Z][a-z]+\b/g);
    if (companyNamePattern && companyNamePattern.length > 0) {
      patterns.push(companyNamePattern.join('\\s+'));
    }

    return patterns;
  }

  /**
   * Learn patterns from a categorization
   */
  static async learnFromCategorization(
    description: string,
    categoryId: string,
    userId: string,
    supabaseClient: any
  ): Promise<void> {
    const patterns = this.extractPatternsFromDescription(description);
    const now = new Date().toISOString();

    // Take top 3 patterns at most to avoid overwhelming the database
    const topPatterns = patterns.slice(0, 3);

    for (const pattern of topPatterns) {
      try {
        // Check if pattern already exists
        const { data: existing, error: checkError } = await supabaseClient
          .from('categorization_patterns')
          .select('id, category_id, match_count, confidence_score')
          .eq('user_id', userId)
          .eq('pattern', pattern)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking pattern:', checkError);
          continue;
        }

        if (existing) {
          // If pattern exists for this category, increase confidence and match count
          if (existing.category_id === categoryId) {
            await supabaseClient
              .from('categorization_patterns')
              .update({
                match_count: existing.match_count + 1,
                confidence_score: Math.min(existing.confidence_score + 5, 100),
                last_matched: now,
                updated_at: now,
              })
              .eq('id', existing.id);
          } 
          // If pattern exists but for a different category, decrease confidence
          else {
            await supabaseClient
              .from('categorization_patterns')
              .update({
                confidence_score: Math.max(existing.confidence_score - 5, 10),
                updated_at: now,
              })
              .eq('id', existing.id);
          }
        } else {
          // Create new pattern
          await supabaseClient
            .from('categorization_patterns')
            .insert({
              user_id: userId,
              pattern,
              category_id: categoryId,
              match_count: 1,
              confidence_score: 60, // Start with moderate confidence
              last_matched: now,
              created_at: now,
              updated_at: now,
            });
        }
      } catch (error) {
        console.error(`Error processing pattern: ${pattern}`, error);
      }
    }
  }

  /**
   * Normalize text for pattern matching
   */
  static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Test if a pattern matches a description
   */
  static testPattern(pattern: string, description: string): boolean {
    try {
      const regex = new RegExp(pattern, 'i');
      const normalizedDescription = this.normalizeText(description);
      return regex.test(normalizedDescription);
    } catch (error) {
      console.error(`Invalid pattern regex: ${pattern}`, error);
      return false;
    }
  }

  /**
   * Find the best matching pattern for a description
   */
  static findBestMatch(description: string, patterns: Pattern[]): PatternMatch | null {
    const matches = this.matchPatterns(description, patterns);
    
    if (matches.length === 0) {
      return null;
    }
    
    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches[0];
  }

  /**
   * Generate suggestions for a transaction
   */
  static generateSuggestions(
    description: string,
    amount: number,
    patterns: Pattern[],
    maxSuggestions: number = 5
  ): PatternMatch[] {
    const matches = this.matchPatterns(description, patterns);
    
    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);
    
    // Return top N suggestions
    return matches.slice(0, maxSuggestions);
  }
}
