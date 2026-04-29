'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';

export interface EmailSuggestion {
  id: string;
  matched_transaction_id: string;
  vendor: string | null;
  amount: number | null;
  email_date: string | null;
  sender: string | null;
  raw_excerpt: string | null;
  confidence: number | null;
  match_score: number | null;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
}

/**
 * Fetch email_classifications joined to a set of transaction IDs. Returned as
 * a map keyed by transaction id (for O(1) lookup in the triage list).
 *
 * If a transaction has multiple matched emails (rare), the highest-confidence
 * one wins.
 */
export function useEmailSuggestions(transactionIds: string[]) {
  const { user } = useAuth();
  const idsKey = [...transactionIds].sort().join(',');

  return useQuery({
    queryKey: ['email-suggestions', user?.id, idsKey],
    enabled: !!user?.id && transactionIds.length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('email_classifications')
        .select(
          'id, matched_transaction_id, vendor, amount, email_date, sender, raw_excerpt, confidence, match_score, suggested_category_id, categories:suggested_category_id(name)',
        )
        .in('matched_transaction_id', transactionIds);
      if (error) throw error;

      const byTx = new Map<string, EmailSuggestion>();
      for (const row of data ?? []) {
        if (!row.matched_transaction_id) continue;
        const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
        const suggestion: EmailSuggestion = {
          id: row.id,
          matched_transaction_id: row.matched_transaction_id,
          vendor: row.vendor,
          amount: row.amount,
          email_date: row.email_date,
          sender: row.sender,
          raw_excerpt: row.raw_excerpt,
          confidence: row.confidence,
          match_score: row.match_score,
          suggested_category_id: row.suggested_category_id,
          suggested_category_name: cat?.name ?? null,
        };
        const existing = byTx.get(row.matched_transaction_id);
        const newScore = (suggestion.match_score ?? 0) + (suggestion.confidence ?? 0);
        const oldScore = existing ? (existing.match_score ?? 0) + (existing.confidence ?? 0) : -1;
        if (!existing || newScore > oldScore) byTx.set(row.matched_transaction_id, suggestion);
      }
      return byTx;
    },
  });
}
