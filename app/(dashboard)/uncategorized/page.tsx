'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useCategories, type Category } from '@/hooks/use-categories';
import { PageLayout, PageSection, PageEmptyState } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  List,
} from 'lucide-react';
import { toast } from 'sonner';
import { PatternMatcher } from '@/lib/pattern-matcher';

const PAGE_SIZES = [25, 50, 100] as const;

interface UncategorizedTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  type: 'income' | 'expenditure' | 'capital';
}

export default function UncategorizedPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Fetch all categories (unfiltered) so we can filter client-side by type
  const { data: categories = [] } = useCategories();

  // Fetch uncategorized transactions with pagination
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['uncategorized-transactions', user?.id, page, pageSize],
    queryFn: async () => {
      const supabase = createClient();
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error, count } = await supabase
        .from('transactions')
        .select('id, transaction_date, description, amount, type', { count: 'exact' })
        .is('category_id', null)
        .order('transaction_date', { ascending: false })
        .range(start, end);

      if (error) throw error;

      const transactions: UncategorizedTransaction[] = (data || []).map(t => ({
        id: t.id,
        transaction_date: t.transaction_date,
        description: t.description || '',
        amount: Number(t.amount),
        type: t.type as UncategorizedTransaction['type'],
      }));

      return {
        transactions,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds — this list changes often during triage
  });

  // Mutation to assign a category
  const assignCategory = useMutation({
    mutationFn: async ({ txId, categoryId }: { txId: string; categoryId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('id', txId);

      if (error) throw error;
    },
    onMutate: ({ txId }) => {
      setAssigningId(txId);
    },
    onSuccess: (_data, { txId, categoryId }) => {
      // Find the transaction to show a nice toast
      const tx = transactions.find(t => t.id === txId);
      toast.success(
        tx
          ? `Categorized "${tx.description.slice(0, 40)}${tx.description.length > 40 ? '...' : ''}"`
          : 'Transaction categorized'
      );

      // Fire-and-forget: learn pattern from this manual categorization
      if (tx?.description && user?.id) {
        const supabase = createClient();
        PatternMatcher.learnFromCategorization(
          tx.description,
          categoryId,
          user.id,
          supabase
        ).catch((err) => console.error('Pattern learning failed:', err));
      }
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['uncategorized-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to assign category: ${err.message}`);
    },
    onSettled: () => {
      setAssigningId(null);
    },
  });

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const handleAssign = useCallback(
    (txId: string, categoryId: string) => {
      assignCategory.mutate({ txId, categoryId });
    },
    [assignCategory]
  );

  const transactions = data?.transactions || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 0;

  // Helper: get categories matching a transaction type
  const categoriesForType = (type: string): Category[] =>
    categories.filter(c => c.type === type);

  // Format currency
  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

  // Format date
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  // Type badge colour
  const typeBadgeClass = (type: string) => {
    switch (type) {
      case 'income':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25';
      case 'expenditure':
        return 'bg-rose-500/15 text-rose-500 border-rose-500/25';
      case 'capital':
        return 'bg-violet-500/15 text-violet-500 border-violet-500/25';
      default:
        return '';
    }
  };

  // ---------- Loading skeleton ----------
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
          </div>

          {/* Table skeleton */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="h-6 w-52 bg-muted rounded animate-pulse" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-64 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                  <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-9 w-44 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Error state ----------
  if (error) {
    return (
      <PageLayout
        title="Uncategorized Transactions"
        description="Triage transactions that have no category assigned"
        icon={AlertTriangle}
      >
        <div className="text-center space-y-4 py-12">
          <p className="text-red-600">Failed to load uncategorized transactions: {(error as Error).message}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  // ---------- Empty state ----------
  if (totalCount === 0) {
    return (
      <PageLayout
        title="Uncategorized Transactions"
        description="Triage transactions that have no category assigned"
        icon={AlertTriangle}
      >
        <PageEmptyState
          icon={CheckCircle2}
          title="All caught up!"
          description="Every transaction has a category assigned. Nice work keeping things organised."
        />
      </PageLayout>
    );
  }

  // ---------- Main content ----------
  return (
    <PageLayout
      title="Uncategorized Transactions"
      description="Triage transactions that have no category assigned"
      icon={AlertTriangle}
      actions={
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/25 text-sm px-3 py-1">
            {totalCount.toLocaleString('en-GB')} remaining
          </Badge>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      }
    >
      <PageSection
        title="Assign Categories"
        description="Select a category for each transaction. The list updates automatically after each assignment."
        icon={List}
      >
        <div className="divide-y divide-border">
          {transactions.map((tx) => {
            const matchingCategories = categoriesForType(tx.type);
            const isAssigning = assigningId === tx.id;

            return (
              <div
                key={tx.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 first:pt-0 last:pb-0"
              >
                {/* Left: description + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {tx.description || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(tx.transaction_date)}
                  </p>
                </div>

                {/* Right: type badge, amount, select */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant="outline" className={typeBadgeClass(tx.type)}>
                    {tx.type}
                  </Badge>

                  <span
                    className={`text-sm font-semibold tabular-nums w-24 text-right ${
                      tx.type === 'income'
                        ? 'text-emerald-500'
                        : tx.type === 'expenditure'
                        ? 'text-rose-500'
                        : 'text-violet-500'
                    }`}
                  >
                    {formatAmount(tx.amount)}
                  </span>

                  {/* Category selector */}
                  <div className="w-52">
                    {isAssigning ? (
                      <div className="flex items-center justify-center h-9 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-xs">Saving...</span>
                      </div>
                    ) : (
                      <Select onValueChange={(val) => handleAssign(tx.id, val)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {matchingCategories.length === 0 ? (
                            <SelectItem value="__none" disabled>
                              No {tx.type} categories
                            </SelectItem>
                          ) : (
                            matchingCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: cat.color }}
                                  />
                                  {cat.name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PageSection>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1}&ndash;{Math.min(page * pageSize, totalCount)} of{' '}
              {totalCount.toLocaleString('en-GB')} transactions
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Per page:</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map(size => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
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
    </PageLayout>
  );
}
