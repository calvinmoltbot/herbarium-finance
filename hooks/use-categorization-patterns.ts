'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export interface CategorizationPattern {
  id: string;
  user_id: string;
  pattern: string;
  category_id: string;
  match_count: number;
  confidence_score: number;
  last_matched: string;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    type: 'income' | 'expenditure' | 'capital';
    color: string;
  };
}

/**
 * Hook for managing categorization patterns
 * Provides functions for getting, adding, updating, and deleting patterns
 */
export function useCategorizationPatterns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  /**
   * Get all patterns for the current user
   */
  const getPatterns = useQuery({
    queryKey: ['categorization-patterns', user?.id],
    queryFn: async (): Promise<CategorizationPattern[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('categorization_patterns')
        .select(`
          *,
          category:categories(id, name, type, color)
        `)
        .order('confidence_score', { ascending: false })
        .order('match_count', { ascending: false });

      if (error) throw error;
      return data as CategorizationPattern[];
    },
    enabled: !!user?.id,
  });

  /**
   * Add a new pattern
   */
  const addPattern = useMutation({
    mutationFn: async (data: {
      pattern: string;
      category_id: string;
      confidence_score?: number;
    }): Promise<CategorizationPattern> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Validate pattern
      try {
        new RegExp(data.pattern);
      } catch (error) {
        throw new Error('Invalid regular expression pattern');
      }

      const now = new Date().toISOString();
      const { data: inserted, error } = await supabase
        .from('categorization_patterns')
        .insert({
          user_id: user.id,
          pattern: data.pattern,
          category_id: data.category_id,
          confidence_score: data.confidence_score || 50,
          last_matched: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;
      return inserted as CategorizationPattern;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categorization-patterns', user?.id],
      });
      toast.success('Pattern added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add pattern: ${error.message}`);
    },
  });

  /**
   * Update an existing pattern
   */
  const updatePattern = useMutation({
    mutationFn: async (data: {
      id: string;
      pattern?: string;
      category_id?: string;
      confidence_score?: number;
      match_count?: number;
    }): Promise<CategorizationPattern> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Validate pattern if provided
      if (data.pattern) {
        try {
          new RegExp(data.pattern);
        } catch (error) {
          throw new Error('Invalid regular expression pattern');
        }
      }

      const { id, ...updateData } = data;
      const now = new Date().toISOString();

      const { data: updated, error } = await supabase
        .from('categorization_patterns')
        .update({ ...updateData, updated_at: now })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as CategorizationPattern;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categorization-patterns', user?.id],
      });
      toast.success('Pattern updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update pattern: ${error.message}`);
    },
  });

  /**
   * Delete a pattern
   */
  const deletePattern = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('categorization_patterns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categorization-patterns', user?.id],
      });
      toast.success('Pattern deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete pattern: ${error.message}`);
    },
  });

  /**
   * Get patterns for a specific category
   */
  const getPatternsForCategory = (categoryId: string): CategorizationPattern[] => {
    if (!getPatterns.data) return [];
    return getPatterns.data.filter(pattern => pattern.category_id === categoryId);
  };

  /**
   * Get patterns by confidence level
   */
  const getPatternsByConfidence = (minConfidence: number, maxConfidence: number = 100): CategorizationPattern[] => {
    if (!getPatterns.data) return [];
    return getPatterns.data.filter(
      pattern => pattern.confidence_score >= minConfidence && pattern.confidence_score <= maxConfidence
    );
  };

  /**
   * Increment match count for a pattern
   */
  const incrementMatchCount = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('categorization_patterns')
        .update({
          match_count: supabase.rpc('increment', { inc_amount: 1 }),
          last_matched: now,
          updated_at: now,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categorization-patterns', user?.id],
      });
    },
    onError: (error) => {
      console.error('Failed to increment match count:', error);
    },
  });

  /**
   * Adjust confidence score for a pattern
   */
  const adjustConfidenceScore = useMutation({
    mutationFn: async ({ id, adjustment }: { id: string; adjustment: number }): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get current confidence score
      const { data: pattern, error: getError } = await supabase
        .from('categorization_patterns')
        .select('confidence_score')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      // Calculate new confidence score (clamped between 1 and 100)
      const newScore = Math.max(1, Math.min(100, (pattern?.confidence_score || 50) + adjustment));

      // Update confidence score
      const { error: updateError } = await supabase
        .from('categorization_patterns')
        .update({
          confidence_score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categorization-patterns', user?.id],
      });
    },
    onError: (error) => {
      console.error('Failed to adjust confidence score:', error);
    },
  });

  return {
    patterns: getPatterns.data || [],
    isLoading: getPatterns.isLoading,
    addPattern: addPattern.mutate,
    updatePattern: updatePattern.mutate,
    deletePattern: deletePattern.mutate,
    getPatternsForCategory,
    getPatternsByConfidence,
    incrementMatchCount: incrementMatchCount.mutate,
    adjustConfidenceScore: adjustConfidenceScore.mutate,
  };
}
