'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { PatternMatcher } from '@/lib/pattern-matcher';

export interface CategorySuggestion {
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

/**
 * Hook for category suggestions
 * Provides functions for getting suggestions for a transaction and accepting or rejecting those suggestions
 */
export function useCategorySuggestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  /**
   * Get suggestions for a transaction
   * @param description Transaction description
   * @param amount Transaction amount
   * @returns Array of category suggestions
   */
  const getSuggestionsForTransaction = async (
    description: string,
    amount: number
  ): Promise<CategorySuggestion[]> => {
    if (!user?.id) return [];

    try {
      // 1. Get all user's patterns
      const { data: patterns, error: patternsError } = await supabase
        .from('categorization_patterns')
        .select(`
          id,
          pattern,
          category_id,
          confidence_score,
          category:categories(id, name, type, color)
        `)
        .eq('user_id', user.id);

      if (patternsError) throw patternsError;

      // Transform patterns to ensure category is an object, not an array
      const transformedPatterns = (patterns || []).map(p => ({
        id: p.id,
        pattern: p.pattern,
        category_id: p.category_id,
        confidence_score: p.confidence_score,
        category: Array.isArray(p.category) ? p.category[0] : p.category
      }));

      // 2. Match patterns against the description
      const matches = PatternMatcher.matchPatterns(description, transformedPatterns);

      // 3. Sort by confidence and return top suggestions
      return matches
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5) as CategorySuggestion[]; // Return top 5 suggestions
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  };

  /**
   * Accept a suggestion
   * Updates the transaction with the suggested category and updates pattern statistics
   */
  const acceptSuggestion = useMutation({
    mutationFn: async (data: {
      transactionId: string;
      categoryId: string;
      description: string;
      patternId?: string;
    }): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      // 1. Update the transaction with the suggested category
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category_id: data.categoryId })
        .eq('id', data.transactionId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // 2. If a pattern was used, update its match count and last matched date
      if (data.patternId) {
        const { error: patternError } = await supabase
          .from('categorization_patterns')
          .update({
            match_count: supabase.rpc('increment', { inc_amount: 1 }),
            confidence_score: supabase.rpc('increment', { inc_amount: 5 }),
            last_matched: new Date().toISOString(),
          })
          .eq('id', data.patternId)
          .eq('user_id', user.id);

        if (patternError) throw patternError;
      } else {
        // 3. If no pattern was used, learn from this categorization
        await PatternMatcher.learnFromCategorization(
          data.description,
          data.categoryId,
          user.id,
          supabase
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['categorization-patterns', user?.id],
      });
      toast.success('Category suggestion applied');
    },
    onError: (error) => {
      toast.error(`Failed to apply suggestion: ${error.message}`);
    },
  });

  /**
   * Reject a suggestion
   * Decreases the confidence score for the pattern
   */
  const rejectSuggestion = useMutation({
    mutationFn: async (data: {
      patternId?: string;
    }): Promise<void> => {
      if (!user?.id || !data.patternId) return;

      // Decrease confidence score for the pattern
      const { error } = await supabase
        .from('categorization_patterns')
        .update({
          confidence_score: supabase.rpc('decrement', { dec_amount: 5, min_value: 10 }),
        })
        .eq('id', data.patternId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categorization-patterns', user?.id],
      });
      toast.success('Suggestion rejected');
    },
    onError: (error) => {
      toast.error(`Failed to reject suggestion: ${error.message}`);
    },
  });

  /**
   * Apply suggestions in bulk
   * Applies all high-confidence suggestions to transactions
   */
  const applyBulkSuggestions = useMutation({
    mutationFn: async (data: {
      suggestions: Array<{
        transactionId: string;
        categoryId: string;
        patternId?: string;
      }>;
      minConfidence?: number;
    }): Promise<{ applied: number }> => {
      if (!user?.id) throw new Error('User not authenticated');

      const minConfidence = data.minConfidence || 0.8; // Default to 80% confidence
      const highConfidenceSuggestions = data.suggestions.filter(s => 
        // Filter logic would be here if we had confidence in the suggestions array
        // For now, assume all passed suggestions meet the criteria
        true
      );

      let appliedCount = 0;

      // Apply each suggestion
      for (const suggestion of highConfidenceSuggestions) {
        try {
          // Update transaction
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ category_id: suggestion.categoryId })
            .eq('id', suggestion.transactionId)
            .eq('user_id', user.id);

          if (updateError) throw updateError;

          // Update pattern statistics if applicable
          if (suggestion.patternId) {
            const { error: patternError } = await supabase
              .from('categorization_patterns')
              .update({
                match_count: supabase.rpc('increment', { inc_amount: 1 }),
                confidence_score: supabase.rpc('increment', { inc_amount: 2 }),
                last_matched: new Date().toISOString(),
              })
              .eq('id', suggestion.patternId)
              .eq('user_id', user.id);

            if (patternError) throw patternError;
          }

          appliedCount++;
        } catch (error) {
          console.error('Error applying suggestion:', error);
          // Continue with other suggestions
        }
      }

      return { applied: appliedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['categorization-patterns', user?.id],
      });
      toast.success(`Applied ${result.applied} suggestions`);
    },
    onError: (error) => {
      toast.error(`Failed to apply suggestions: ${error.message}`);
    },
  });

  /**
   * Update transaction category
   * Direct category update for manual amendments
   */
  const updateCategory = useMutation({
    mutationFn: async (data: {
      transactionId: string;
      categoryId: string | null;
      description?: string;
    }): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Update the transaction with the new category (or null to clear)
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category_id: data.categoryId })
        .eq('id', data.transactionId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Fire-and-forget: learn pattern from manual categorization
      if (data.categoryId && data.description) {
        PatternMatcher.learnFromCategorization(
          data.description,
          data.categoryId,
          user.id,
          supabase
        ).catch((err) => console.error('Pattern learning failed:', err));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', user?.id],
      });
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });

  return {
    getSuggestionsForTransaction,
    acceptSuggestion: acceptSuggestion.mutate,
    rejectSuggestion: rejectSuggestion.mutate,
    applyBulkSuggestions: applyBulkSuggestions.mutate,
    updateCategory: updateCategory.mutateAsync,
    isUpdatingCategory: updateCategory.isPending,
  };
}
