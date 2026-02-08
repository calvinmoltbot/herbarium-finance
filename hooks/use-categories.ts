'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expenditure' | 'capital';
  color: string;
  created_at: string;
}

export interface CreateCategoryData {
  name: string;
  type: 'income' | 'expenditure' | 'capital';
  color: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
}

export function useCategories(type?: 'income' | 'expenditure' | 'capital') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['categories', type, user?.id],
    queryFn: async (): Promise<Category[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      let query = supabase
        .from('categories')
        .select('*')
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategoryMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationFn: async (data: CreateCategoryData): Promise<Category> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // First, ensure the user exists in the public.users table
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create them
        const { error: insertUserError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
          });

        if (insertUserError) {
          throw new Error('Failed to create user record');
        }
      } else if (userError) {
        throw userError;
      }

      // Now create the category
      const { data: category, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: data.name,
          type: data.type,
          color: data.color,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      return category;
    },
    onSuccess: (newCategory) => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`Category "${newCategory.name}" created successfully!`);
    },
    onError: (error: Error) => {
      console.error('Error creating category:', error);
      toast.error('Failed to create category. Please try again.');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryData }): Promise<Category> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      const { data: category, error } = await supabase
        .from('categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Also invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      toast.success(`Category "${updatedCategory.name}" updated successfully!`);
    },
    onError: (error: Error) => {
      console.error('Error updating category:', error);
      toast.error('Failed to update category. Please try again.');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      
      // First check if category is in use by transactions
      const { data: transactions, error: checkError } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (transactions && transactions.length > 0) {
        throw new Error('Cannot delete category that is in use by transactions. Please reassign or delete the transactions first.');
      }

      // Check if category is assigned to any hierarchies
      const { data: hierarchyAssignments, error: hierarchyCheckError } = await supabase
        .from('category_hierarchy_assignments')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (hierarchyCheckError) throw hierarchyCheckError;

      if (hierarchyAssignments && hierarchyAssignments.length > 0) {
        throw new Error('Cannot delete category that is assigned to hierarchies. Please remove from hierarchies first.');
      }

      // Now delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['unallocated-categories'] });
      queryClient.invalidateQueries({ queryKey: ['unallocated-categories-stats'] });
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories'] });
      toast.success('Category deleted successfully!');
    },
    onError: (error: Error) => {
      console.error('Error deleting category:', error);
      if (error.message.includes('in use')) {
        toast.error('Cannot delete category that is in use by transactions');
      } else {
        toast.error('Failed to delete category. Please try again.');
      }
    },
  });

  return {
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

// Hook for getting category usage statistics
export function useCategoryStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['category-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          category_id,
          category:categories(name, color, type),
          amount
        `);

      if (error) throw error;

      // Calculate usage statistics
      const stats = new Map<string, {
        id: string;
        name: string;
        color: string;
        type: string;
        transactionCount: number;
        totalAmount: number;
        lastUsed: string;
      }>();

      data?.forEach(transaction => {
        const category = Array.isArray(transaction.category) ? transaction.category[0] : transaction.category;
        if (!category) return;

        const existing = stats.get(transaction.category_id) || {
          id: transaction.category_id,
          name: category.name,
          color: category.color,
          type: category.type,
          transactionCount: 0,
          totalAmount: 0,
          lastUsed: '',
        };

        existing.transactionCount += 1;
        existing.totalAmount += Number(transaction.amount);
        stats.set(transaction.category_id, existing);
      });

      return Array.from(stats.values()).sort((a, b) => b.transactionCount - a.transactionCount);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
