'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedTransactionList } from '@/components/transactions/enhanced-transaction-list';
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker';
import { RefreshCw, List, ChevronLeft, ChevronRight, Search, X, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';

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

interface Filters {
  search: string;
  type: 'all' | 'income' | 'expenditure' | 'capital';
  amountMin: string;
  amountMax: string;
  dateRange: DateRange;
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  type: 'all',
  amountMin: '',
  amountMax: '',
  dateRange: { from: null, to: null, preset: 'all' },
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search and amount inputs to avoid excessive queries
  const debouncedSearch = useDebounce(filters.search, 300);
  const debouncedAmountMin = useDebounce(filters.amountMin, 300);
  const debouncedAmountMax = useDebounce(filters.amountMax, 300);

  // Count active filters for badge display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count++;
    if (filters.type !== 'all') count++;
    if (debouncedAmountMin) count++;
    if (debouncedAmountMax) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  }, [debouncedSearch, filters.type, debouncedAmountMin, debouncedAmountMax, filters.dateRange]);

  const hasActiveFilters = activeFilterCount > 0;

  // Reset to page 1 when any debounced filter changes
  const filterKey = `${debouncedSearch}|${filters.type}|${debouncedAmountMin}|${debouncedAmountMax}|${filters.dateRange.from?.toISOString()}|${filters.dateRange.to?.toISOString()}`;
  const prevFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
    }
  }, [filterKey]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['transactions-paginated', user?.id, page, pageSize, debouncedSearch, filters.type, debouncedAmountMin, debouncedAmountMax, filters.dateRange.from?.toISOString(), filters.dateRange.to?.toISOString()],
    queryFn: async () => {
      const supabase = createClient();
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      let query = supabase
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
        `, { count: 'exact' });

      // Apply search filter
      if (debouncedSearch) {
        query = query.ilike('description', `%${debouncedSearch}%`);
      }

      // Apply type filter
      if (filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      // Apply amount range filters
      if (debouncedAmountMin) {
        const min = parseFloat(debouncedAmountMin);
        if (!isNaN(min)) {
          query = query.gte('amount', min);
        }
      }
      if (debouncedAmountMax) {
        const max = parseFloat(debouncedAmountMax);
        if (!isNaN(max)) {
          query = query.lte('amount', max);
        }
      }

      // Apply date range filters
      if (filters.dateRange.from) {
        query = query.gte('transaction_date', format(filters.dateRange.from, 'yyyy-MM-dd'));
      }
      if (filters.dateRange.to) {
        query = query.lte('transaction_date', format(filters.dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error, count } = await query
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

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
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

          {/* Search bar skeleton */}
          <div className="flex gap-3">
            <div className="flex-1 h-10 bg-muted rounded-md animate-pulse" />
            <div className="h-10 w-28 bg-muted rounded-md animate-pulse" />
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
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar + Filter Toggle */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search transactions by description..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10 pr-10"
            />
            {filters.search && (
              <button
                onClick={() => {
                  updateFilter('search', '');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {debouncedSearch && (
              <Badge variant="secondary" className="gap-1">
                Search: &quot;{debouncedSearch}&quot;
                <button onClick={() => updateFilter('search', '')} className="ml-1 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.type !== 'all' && (
              <Badge
                variant="secondary"
                className={`gap-1 ${
                  filters.type === 'income'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : filters.type === 'expenditure'
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    : 'bg-violet-500/10 text-violet-500 border-violet-500/20'
                }`}
              >
                Type: {filters.type}
                <button onClick={() => updateFilter('type', 'all')} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(debouncedAmountMin || debouncedAmountMax) && (
              <Badge variant="secondary" className="gap-1">
                Amount: {debouncedAmountMin ? `£${debouncedAmountMin}` : '£0'} - {debouncedAmountMax ? `£${debouncedAmountMax}` : 'any'}
                <button onClick={() => { updateFilter('amountMin', ''); updateFilter('amountMax', ''); }} className="ml-1 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.dateRange.from || filters.dateRange.to) && (
              <Badge variant="secondary" className="gap-1">
                Date: {filters.dateRange.from ? format(filters.dateRange.from, 'dd/MM/yyyy') : 'start'} - {filters.dateRange.to ? format(filters.dateRange.to, 'dd/MM/yyyy') : 'end'}
                <button onClick={() => updateFilter('dateRange', { from: null, to: null, preset: 'all' })} className="ml-1 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground hover:text-foreground">
              Clear all
            </Button>
          </div>
        )}

        {/* Expandable Filter Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Filter Transactions</CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                    Clear all filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Transaction Type</label>
                  <Select value={filters.type} onValueChange={(value) => updateFilter('type', value as Filters['type'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Income
                        </span>
                      </SelectItem>
                      <SelectItem value="expenditure">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Expenditure
                        </span>
                      </SelectItem>
                      <SelectItem value="capital">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-violet-500" />
                          Capital
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Amount Range (£)</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.amountMin}
                      onChange={(e) => updateFilter('amountMin', e.target.value)}
                      min="0"
                      step="0.01"
                      className="flex-1"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.amountMax}
                      onChange={(e) => updateFilter('amountMax', e.target.value)}
                      min="0"
                      step="0.01"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <DateRangePicker
                  value={filters.dateRange}
                  onChange={(range) => updateFilter('dateRange', range)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fetching indicator overlay */}
        {isFetching && !isLoading && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">Updating results...</span>
          </div>
        )}

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
                {hasActiveFilters && ' (filtered)'}
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

        {/* No results message when filters active but nothing found */}
        {totalCount === 0 && hasActiveFilters && (
          <div className="text-center py-12 space-y-4">
            <Search className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium text-foreground">No transactions found</h3>
            <p className="text-muted-foreground">
              No transactions match your current filters. Try adjusting or clearing your filters.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
