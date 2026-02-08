'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export interface TransactionMetadata {
  id: string;
  transaction_id: string;
  user_id: string;
  user_notes: string | null;
  extended_description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for managing transaction metadata
 * Provides functions for getting, updating, and deleting transaction metadata
 */
export function useTransactionMetadata(transactionId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  /**
   * Get transaction metadata
   * SHARED DATA MODEL: All users can see all transaction metadata
   */
  const getTransactionMetadata = useQuery({
    queryKey: ['transaction-metadata', transactionId],
    queryFn: async (): Promise<TransactionMetadata | null> => {
      if (!transactionId) return null;

      const { data, error } = await supabase
        .from('transaction_metadata')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data as TransactionMetadata;
    },
    enabled: !!transactionId,
  });

  /**
   * Update transaction metadata
   * If metadata doesn't exist, it will be created
   */
  const updateTransactionMetadata = useMutation({
    mutationFn: async (data: {
      transaction_id: string;
      user_notes?: string | null;
      extended_description?: string | null;
      tags?: string[] | null;
    }): Promise<TransactionMetadata> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { transaction_id, ...updateData } = data;
      const now = new Date().toISOString();

      // Check if metadata already exists
      const { data: existing, error: checkError } = await supabase
        .from('transaction_metadata')
        .select('id')
        .eq('transaction_id', transaction_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existing) {
        // Update existing metadata
        const { data: updated, error: updateError } = await supabase
          .from('transaction_metadata')
          .update({ ...updateData, updated_at: now })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return updated as TransactionMetadata;
      } else {
        // Insert new metadata
        const { data: inserted, error: insertError } = await supabase
          .from('transaction_metadata')
          .insert({
            transaction_id,
            user_id: user.id,
            ...updateData,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return inserted as TransactionMetadata;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['transaction-metadata', variables.transaction_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['all-transaction-metadata'],
      });
      toast.success('Transaction metadata updated');
    },
    onError: (error) => {
      toast.error(`Failed to update metadata: ${error.message}`);
    },
  });

  /**
   * Delete transaction metadata
   * SHARED DATA MODEL: All users can delete any transaction metadata
   */
  const deleteTransactionMetadata = useMutation({
    mutationFn: async (transaction_id: string): Promise<void> => {
      const { error } = await supabase
        .from('transaction_metadata')
        .delete()
        .eq('transaction_id', transaction_id);

      if (error) throw error;
    },
    onSuccess: (_, transaction_id) => {
      queryClient.invalidateQueries({
        queryKey: ['transaction-metadata', transaction_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['all-transaction-metadata'],
      });
      toast.success('Transaction metadata deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete metadata: ${error.message}`);
    },
  });

  /**
   * Get all transaction metadata
   * SHARED DATA MODEL: All users can see all transaction metadata
   */
  const getAllTransactionMetadata = useQuery({
    queryKey: ['all-transaction-metadata'],
    queryFn: async (): Promise<Record<string, TransactionMetadata>> => {
      const { data, error } = await supabase
        .from('transaction_metadata')
        .select('*');

      if (error) throw error;

      // Convert to a record keyed by transaction_id for easier lookup
      const metadataRecord: Record<string, TransactionMetadata> = {};
      (data || []).forEach(item => {
        metadataRecord[item.transaction_id] = item as TransactionMetadata;
      });

      return metadataRecord;
    },
  });

  /**
   * Check if a transaction has metadata
   */
  const hasMetadata = (transaction_id: string): boolean => {
    if (!getAllTransactionMetadata.data) return false;
    return !!getAllTransactionMetadata.data[transaction_id];
  };

  /**
   * Get metadata for a transaction
   */
  const getMetadataForTransaction = (transaction_id: string): TransactionMetadata | null => {
    if (!getAllTransactionMetadata.data) return null;
    return getAllTransactionMetadata.data[transaction_id] || null;
  };

  return {
    metadata: getTransactionMetadata.data,
    isLoading: getTransactionMetadata.isLoading,
    updateMetadata: updateTransactionMetadata.mutate,
    deleteMetadata: deleteTransactionMetadata.mutate,
    allMetadata: getAllTransactionMetadata.data || {},
    isLoadingAll: getAllTransactionMetadata.isLoading,
    hasMetadata,
    getMetadataForTransaction,
  };
}
