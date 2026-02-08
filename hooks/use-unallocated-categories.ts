'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Category } from './use-categories';
import { toast } from 'sonner';

export interface UnallocatedCategory extends Category {
  transactionCount?: number;
  totalAmount?: number;
}

export function useUnallocatedCategories(type?: 'income' | 'expenditure' | 'capital') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unallocated-categories', user?.id, type],
    queryFn: async (): Promise<UnallocatedCategory[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get all categories for the user
      let categoryQuery = supabase
        .from('categories')
        .select('*')
        ;

      if (type) {
        categoryQuery = categoryQuery.eq('type', type);
      }

      const { data: allCategories, error: categoryError } = await categoryQuery;
      if (categoryError) throw categoryError;

      // Get all assigned category IDs
      const { data: assignments, error: assignmentError } = await supabase
        .from('category_hierarchy_assignments')
        .select('category_id');

      if (assignmentError) throw assignmentError;

      const assignedCategoryIds = new Set(
        (assignments || []).map(assignment => assignment.category_id)
      );

      // Filter out assigned categories
      const unallocatedCategories = (allCategories || []).filter(
        category => !assignedCategoryIds.has(category.id)
      );

      // Get transaction stats for unallocated categories
      if (unallocatedCategories.length > 0) {
        const { data: transactionStats, error: statsError } = await supabase
          .from('transactions')
          .select('category_id, amount')
          .in('category_id', unallocatedCategories.map(cat => cat.id));

        if (statsError) throw statsError;

        // Calculate stats for each category
        const statsMap = new Map<string, { count: number; total: number }>();
        (transactionStats || []).forEach(transaction => {
          const existing = statsMap.get(transaction.category_id) || { count: 0, total: 0 };
          existing.count += 1;
          existing.total += Number(transaction.amount);
          statsMap.set(transaction.category_id, existing);
        });

        // Add stats to categories
        return unallocatedCategories.map(category => ({
          ...category,
          transactionCount: statsMap.get(category.id)?.count || 0,
          totalAmount: statsMap.get(category.id)?.total || 0,
        }));
      }

      return unallocatedCategories;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter than other queries since this changes more frequently)
  });
}

export function useBulkAssignCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { categoryIds: string[]; hierarchyId: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Create assignments for all categories
      const assignments = data.categoryIds.map(categoryId => ({
        user_id: user.id,
        category_id: categoryId,
        hierarchy_id: data.hierarchyId
      }));

      const { data: result, error } = await supabase
        .from('category_hierarchy_assignments')
        .insert(assignments)
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['unallocated-categories', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unallocated-categories-stats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });

      toast.success(`Successfully assigned ${variables.categoryIds.length} categories to hierarchy`);
    },
    onError: (error: any) => {
      console.error('Error bulk assigning categories:', error);
      toast.error('Failed to assign categories. Please try again.');
    },
  });
}

export function useQuickAssignCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { categoryId: string; hierarchyId: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      const { data: result, error } = await supabase
        .from('category_hierarchy_assignments')
        .insert({
          user_id: user.id,
          category_id: data.categoryId,
          hierarchy_id: data.hierarchyId
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['unallocated-categories', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unallocated-categories-stats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });

      toast.success('Category assigned successfully');
    },
    onError: (error: any) => {
      console.error('Error assigning category:', error);
      toast.error('Failed to assign category. Please try again.');
    },
  });
}

export function useUnallocatedCategoriesStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unallocated-categories-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get count of unallocated categories by type
      const { data: allCategories, error: categoryError } = await supabase
        .from('categories')
        .select('id, type');

      if (categoryError) throw categoryError;

      // Get assigned category IDs
      const { data: assignments, error: assignmentError } = await supabase
        .from('category_hierarchy_assignments')
        .select('category_id');

      if (assignmentError) throw assignmentError;

      const assignedCategoryIds = new Set(
        (assignments || []).map(assignment => assignment.category_id)
      );

      const unallocatedCategories = (allCategories || []).filter(
        category => !assignedCategoryIds.has(category.id)
      );

      const stats = {
        total: unallocatedCategories.length,
        income: unallocatedCategories.filter(cat => cat.type === 'income').length,
        expenditure: unallocatedCategories.filter(cat => cat.type === 'expenditure').length,
        capital: unallocatedCategories.filter(cat => cat.type === 'capital').length,
      };

      return stats;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
