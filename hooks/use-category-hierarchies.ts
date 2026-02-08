'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';

export interface CategoryHierarchy {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expenditure' | 'capital';
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryHierarchyAssignment {
  id: string;
  user_id: string;
  category_id: string;
  hierarchy_id: string;
  created_at: string;
}

export interface CategoryHierarchyWithCategories extends CategoryHierarchy {
  categories: Array<{
    id: string;
    name: string;
    type: string;
    color?: string;
  }>;
}

export function useCategoryHierarchies(type?: 'income' | 'expenditure' | 'capital') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['category-hierarchies', user?.id, type],
    queryFn: async (): Promise<CategoryHierarchy[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      let query = supabase
        .from('category_hierarchies')
        .select('*')
        .order('display_order', { ascending: true });

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

export function useCategoryHierarchiesWithCategories(type?: 'income' | 'expenditure' | 'capital') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['category-hierarchies-with-categories', user?.id, type],
    queryFn: async (): Promise<CategoryHierarchyWithCategories[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get hierarchies
      let hierarchyQuery = supabase
        .from('category_hierarchies')
        .select('*')
        .order('display_order', { ascending: true });

      if (type) {
        hierarchyQuery = hierarchyQuery.eq('type', type);
      }

      const { data: hierarchies, error: hierarchyError } = await hierarchyQuery;
      if (hierarchyError) throw hierarchyError;

      // Get category assignments with category details
      const { data: assignments, error: assignmentError } = await supabase
        .from('category_hierarchy_assignments')
        .select(`
          id,
          user_id,
          category_id,
          hierarchy_id,
          created_at,
          category:categories(id, name, type, color)
        `);

      if (assignmentError) throw assignmentError;

      // Combine hierarchies with their assigned categories
      const hierarchiesWithCategories: CategoryHierarchyWithCategories[] = (hierarchies || []).map(hierarchy => ({
        ...hierarchy,
        categories: (assignments || [])
          .filter(assignment => assignment.hierarchy_id === hierarchy.id)
          .map(assignment => assignment.category)
          .filter(Boolean)
          .flat() as Array<{
            id: string;
            name: string;
            type: string;
            color?: string;
          }>
      }));

      return hierarchiesWithCategories;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCategoryHierarchy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; type: 'income' | 'expenditure' | 'capital'; display_order?: number }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      const { data: result, error } = await supabase
        .from('category_hierarchies')
        .insert({
          user_id: user.id,
          name: data.name,
          type: data.type,
          display_order: data.display_order || 0
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });
    },
  });
}

export function useUpdateCategoryHierarchy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; name?: string; display_order?: number }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.display_order !== undefined) updateData.display_order = data.display_order;

      const { data: result, error } = await supabase
        .from('category_hierarchies')
        .update(updateData)
        .eq('id', data.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });
    },
  });
}

export function useDeleteCategoryHierarchy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hierarchyId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // First delete all assignments for this hierarchy
      const { error: assignmentError } = await supabase
        .from('category_hierarchy_assignments')
        .delete()
        .eq('hierarchy_id', hierarchyId);

      if (assignmentError) throw assignmentError;

      // Then delete the hierarchy itself
      const { error: hierarchyError } = await supabase
        .from('category_hierarchies')
        .delete()
        .eq('id', hierarchyId);

      if (hierarchyError) throw hierarchyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });
    },
  });
}

export function useAssignCategoryToHierarchy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { category_id: string; hierarchy_id: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      const { data: result, error } = await supabase
        .from('category_hierarchy_assignments')
        .insert({
          user_id: user.id,
          category_id: data.category_id,
          hierarchy_id: data.hierarchy_id
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });
    },
  });
}

export function useRemoveCategoryFromHierarchy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { category_id: string; hierarchy_id: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      const { error } = await supabase
        .from('category_hierarchy_assignments')
        .delete()
        .eq('category_id', data.category_id)
        .eq('hierarchy_id', data.hierarchy_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });
    },
  });
}

export function useReorderCategoryHierarchies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { hierarchies: Array<{ id: string; display_order: number }> }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Update display orders for all hierarchies
      const updates = data.hierarchies.map(hierarchy => 
        supabase
          .from('category_hierarchies')
          .update({ 
            display_order: hierarchy.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', hierarchy.id)
      );

      const results = await Promise.all(updates);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });
    },
  });
}

export function useSetupDefaultHierarchies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Call the database function to set up default hierarchies
      const { error } = await supabase.rpc('setup_default_category_hierarchies', {
        target_user_id: user.id
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['category-hierarchies-with-categories', user?.id] });
    },
  });
}
