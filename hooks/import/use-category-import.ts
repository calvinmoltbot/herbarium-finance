'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface CategoryImportData {
  name: string;
  type: 'income' | 'expenditure';
  color: string;
}

interface ImportResult {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export function useCategoryImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const importCategories = async (categories: CategoryImportData[]): Promise<ImportResult> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsImporting(true);

    try {
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

      // Get existing categories to check for duplicates
      const { data: existingCategories, error: fetchError } = await supabase
        .from('categories')
        .select('name, type')
        .eq('user_id', user.id);

      if (fetchError) {
        throw fetchError;
      }

      const existingCategoryNames = new Set(
        existingCategories?.map(cat => `${cat.name.toLowerCase()}-${cat.type}`) || []
      );

      const result: ImportResult = {
        total: categories.length,
        successful: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };

      // Process categories in batches
      const batchSize = 10;
      for (let i = 0; i < categories.length; i += batchSize) {
        const batch = categories.slice(i, i + batchSize);
        
        const categoriesToInsert = batch.filter(category => {
          const key = `${category.name.toLowerCase()}-${category.type}`;
          if (existingCategoryNames.has(key)) {
            result.skipped++;
            return false;
          }
          return true;
        });

        if (categoriesToInsert.length > 0) {
          const { data, error } = await supabase
            .from('categories')
            .insert(
              categoriesToInsert.map(category => ({
                user_id: user.id,
                name: category.name,
                type: category.type,
                color: category.color,
              }))
            )
            .select();

          if (error) {
            result.failed += categoriesToInsert.length;
            result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            result.successful += data?.length || 0;
          }
        }

        // Add a small delay between batches to avoid overwhelming the database
        if (i + batchSize < categories.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Invalidate categories cache
      queryClient.invalidateQueries({ queryKey: ['categories'] });

      return result;
    } finally {
      setIsImporting(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: importCategories,
    onSuccess: (result) => {
      if (result.successful > 0) {
        toast.success(`Successfully imported ${result.successful} categories!`);
      }
      if (result.skipped > 0) {
        toast.info(`Skipped ${result.skipped} duplicate categories`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} categories`);
      }
    },
    onError: (error: Error) => {
      console.error('Category import failed:', error);
      toast.error('Failed to import categories. Please try again.');
    },
  });

  return {
    importCategories: importMutation.mutateAsync,
    isImporting: isImporting || importMutation.isPending,
    error: importMutation.error,
  };
}
