'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedTransactionList } from '@/components/transactions/enhanced-transaction-list';
import { RefreshCw, List, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [25, 50, 100] as const;

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  type: 'income' | 'expenditure' | 'capital';
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions-paginated', user?.id, page, pageSize],
    queryFn: async () => {
      const supabase = createClient();
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error, count } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          description,
          amount,
          type,
          category_id,
          categories (
            id,
            name,
            color
          )
        `, { count: 'exact' })
        .order('transaction_date', { ascending: false })
        .range(start, end);

      if (error) throw error;

      const transactions: Transaction[] = (data || []).map(transaction => ({
        ...transaction,
        category: Array.isArray(transaction.categories) ? transaction.categories[0] : transaction.categories
      }));

      return {
        transactions,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const transactions = data?.transactions || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-12 px-6 space-y-8">
          {/* Header skeleton */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-12 w-12 bg-muted rounded animate-pulse" />
              <div className="h-10 w-80 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-6 w-96 bg-muted rounded animate-pulse mx-auto" />
            <div className="h-9 w-24 bg-muted rounded animate-pulse mx-auto" />
          </div>

          {/* Filter card skeleton */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="h-6 w-36 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-10 w-full bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Transaction list skeleton */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-64 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                  <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
                  <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-12 px-6">
          <div className="text-center space-y-4">
            <List className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Transaction Management</h1>
            <p className="text-red-600">Failed to load transactions: {error.message}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto py-12 px-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <List className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Transaction Management</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manage and categorize your transactions with enhanced notes functionality
          </p>
          <div className="flex justify-center">
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Transaction List */}
        <EnhancedTransactionList
          transactions={transactions}
          onTransactionUpdate={() => refetch()}
        />

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} transactions
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per page:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map(size => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
