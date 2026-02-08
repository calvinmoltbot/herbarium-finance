'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';

export interface UserPreference {
  id: string;
  user_id: string;
  preference_key: string;
  preference_value: any;
  created_at: string;
  updated_at: string;
}

export function useUserPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async (): Promise<UserPreference[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserPreference<T = any>(key: string, defaultValue?: T) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-preference', user?.id, key],
    queryFn: async (): Promise<T | undefined> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', user.id)
        .eq('preference_key', key)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data?.preference_value ?? defaultValue;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSetUserPreference() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { key: string; value: any }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      const { data: result, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preference_key: data.key,
          preference_value: data.value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,preference_key'
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-preference', user?.id, variables.key] });
    },
  });
}

export function useDeleteUserPreference() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('preference_key', key);

      if (error) throw error;
    },
    onSuccess: (result, key) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-preference', user?.id, key] });
    },
  });
}

// Specific hooks for common preferences
export function usePLHierarchyExpandState() {
  const { data: expandState = {} } = useUserPreference<Record<string, boolean>>('pl_hierarchy_expand_state', {});
  const setPreference = useSetUserPreference();

  const setHierarchyExpanded = (hierarchyId: string, expanded: boolean) => {
    const newState = { ...expandState, [hierarchyId]: expanded };
    setPreference.mutate({ key: 'pl_hierarchy_expand_state', value: newState });
  };

  const isHierarchyExpanded = (hierarchyId: string, defaultExpanded = true) => {
    return expandState[hierarchyId] ?? defaultExpanded;
  };

  const expandAll = (hierarchyIds: string[]) => {
    const newState = { ...expandState };
    hierarchyIds.forEach(id => {
      newState[id] = true;
    });
    setPreference.mutate({ key: 'pl_hierarchy_expand_state', value: newState });
  };

  const collapseAll = (hierarchyIds: string[]) => {
    const newState = { ...expandState };
    hierarchyIds.forEach(id => {
      newState[id] = false;
    });
    setPreference.mutate({ key: 'pl_hierarchy_expand_state', value: newState });
  };

  return {
    expandState,
    setHierarchyExpanded,
    isHierarchyExpanded,
    expandAll,
    collapseAll,
    isLoading: setPreference.isPending
  };
}
