'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { PageLayout, PageSection } from '@/components/ui/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Eye,
  Flag,
} from 'lucide-react';
import { format } from 'date-fns';

type FlagStatus = 'none' | 'verified' | 'suspicious';

interface NearbyTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  type: 'income' | 'expenditure' | 'capital';
  category_id: string | null;
  category?: {
    name: string;
    color: string;
    capital_movement_type?: string | null;
  } | null;
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function BankReconciliationPage() {
  const { user } = useAuth();
  const [statementDate, setStatementDate] = useState('');
  const [statementBalanceInput, setStatementBalanceInput] = useState('');
  const [hasReconciled, setHasReconciled] = useState(false);
  const [statementBalance, setStatementBalance] = useState(0);
  const [reconciledDate, setReconciledDate] = useState('');
  const [flaggedTransactions, setFlaggedTransactions] = useState<Record<string, FlagStatus>>({});

  // Fetch all transactions up to statement date for balance calculation
  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['reconciliation-balance', user?.id, reconciledDate],
    queryFn: async () => {
      const supabase = createClient();

      // Fetch income total
      const { data: incomeData, error: incomeError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .lte('transaction_date', reconciledDate);

      if (incomeError) throw incomeError;

      // Fetch expenditure total
      const { data: expenditureData, error: expenditureError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expenditure')
        .lte('transaction_date', reconciledDate);

      if (expenditureError) throw expenditureError;

      // Fetch capital transactions with category info for movement type
      const { data: capitalData, error: capitalError } = await supabase
        .from('transactions')
        .select('amount, categories:category_id(capital_movement_type)')
        .eq('type', 'capital')
        .lte('transaction_date', reconciledDate);

      if (capitalError) throw capitalError;

      // Fetch uncategorized count
      const { count: uncategorizedCount, error: uncatError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .is('category_id', null)
        .lte('transaction_date', reconciledDate);

      if (uncatError) throw uncatError;

      const totalIncome = (incomeData || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenditure = (expenditureData || []).reduce((sum, t) => sum + Number(t.amount), 0);

      let capitalInjections = 0;
      let capitalDrawings = 0;
      for (const row of capitalData || []) {
        const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
        const movementType = (cat as { capital_movement_type?: string | null } | null)?.capital_movement_type;
        const amount = Math.abs(Number(row.amount));
        if (movementType === 'injection') capitalInjections += amount;
        else if (movementType === 'drawing') capitalDrawings += amount;
      }

      // Get opening balance from localStorage
      let openingBalance = 0;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('herbarium-opening-balance');
        if (stored) {
          const parsed = parseFloat(stored);
          if (!isNaN(parsed)) openingBalance = parsed;
        }
      }

      const calculatedBalance = openingBalance + totalIncome - totalExpenditure + capitalInjections - capitalDrawings;

      return {
        openingBalance,
        totalIncome,
        totalExpenditure,
        capitalInjections,
        capitalDrawings,
        calculatedBalance,
        uncategorizedCount: uncategorizedCount || 0,
      };
    },
    enabled: !!user?.id && !!reconciledDate,
    staleTime: 30 * 1000,
  });

  // Fetch nearby transactions (7 days before statement date)
  const { data: nearbyTransactions, isLoading: isLoadingNearby } = useQuery({
    queryKey: ['reconciliation-nearby', user?.id, reconciledDate],
    queryFn: async () => {
      const supabase = createClient();
      const endDate = reconciledDate;
      const startDate = format(
        new Date(new Date(reconciledDate).getTime() - 7 * 24 * 60 * 60 * 1000),
        'yyyy-MM-dd'
      );

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          description,
          amount,
          type,
          category_id,
          categories:category_id(
            name,
            color,
            capital_movement_type
          )
        `)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((t): NearbyTransaction => ({
        id: t.id,
        transaction_date: t.transaction_date,
        description: t.description || '',
        amount: Number(t.amount),
        type: t.type as NearbyTransaction['type'],
        category_id: t.category_id,
        category: Array.isArray(t.categories) ? t.categories[0] : t.categories,
      }));
    },
    enabled: !!user?.id && !!reconciledDate,
    staleTime: 30 * 1000,
  });

  const handleReconcile = useCallback(() => {
    const parsed = parseFloat(statementBalanceInput);
    if (isNaN(parsed) || !statementDate) return;
    setStatementBalance(parsed);
    setReconciledDate(statementDate);
    setHasReconciled(true);
    setFlaggedTransactions({});
  }, [statementBalanceInput, statementDate]);

  const toggleFlag = useCallback((id: string) => {
    setFlaggedTransactions(prev => {
      const current = prev[id] || 'none';
      const next: FlagStatus = current === 'none' ? 'verified' : current === 'verified' ? 'suspicious' : 'none';
      return { ...prev, [id]: next };
    });
  }, []);

  const variance = useMemo(() => {
    if (!balanceData) return null;
    return statementBalance - balanceData.calculatedBalance;
  }, [statementBalance, balanceData]);

  const varianceStatus = useMemo(() => {
    if (variance === null) return 'neutral';
    const absVariance = Math.abs(variance);
    if (absVariance <= 0.01) return 'green';
    if (absVariance <= 5) return 'amber';
    return 'red';
  }, [variance]);

  const variancePercentage = useMemo(() => {
    if (variance === null || !balanceData) return null;
    if (balanceData.calculatedBalance === 0) return variance === 0 ? 0 : 100;
    return (variance / Math.abs(balanceData.calculatedBalance)) * 100;
  }, [variance, balanceData]);

  const varianceColorClass = useMemo(() => {
    switch (varianceStatus) {
      case 'green': return 'text-emerald-500';
      case 'amber': return 'text-amber-500';
      case 'red': return 'text-rose-500';
      default: return 'text-muted-foreground';
    }
  }, [varianceStatus]);

  const varianceBgClass = useMemo(() => {
    switch (varianceStatus) {
      case 'green': return 'bg-emerald-500/10 border-emerald-500/25';
      case 'amber': return 'bg-amber-500/10 border-amber-500/25';
      case 'red': return 'bg-rose-500/10 border-rose-500/25';
      default: return 'bg-muted';
    }
  }, [varianceStatus]);

  const isReconciling = isLoadingBalance || isLoadingNearby;

  // Loading skeleton
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-12 px-6 space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-12 w-12 bg-muted rounded animate-pulse" />
              <div className="h-10 w-80 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-6 w-96 bg-muted rounded animate-pulse mx-auto" />
          </div>
          <div className="border rounded-lg p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 w-full bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      title="Bank Reconciliation"
      description="Compare your calculated balance against your bank statement to identify discrepancies"
      icon={Scale}
    >
      {/* Statement Balance Input */}
      <PageSection
        title="Statement Details"
        description="Enter the details from your bank statement"
        icon={Info}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <Label htmlFor="statement-date">Statement Date</Label>
            <Input
              id="statement-date"
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statement-balance">Statement Balance (GBP)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
              <Input
                id="statement-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={statementBalanceInput}
                onChange={(e) => setStatementBalanceInput(e.target.value)}
                className="pl-7 tabular-nums"
              />
            </div>
          </div>
          <Button
            onClick={handleReconcile}
            disabled={!statementDate || !statementBalanceInput || isReconciling}
            className="h-10"
          >
            {isReconciling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reconciling...
              </>
            ) : (
              <>
                <Scale className="w-4 h-4 mr-2" />
                Reconcile
              </>
            )}
          </Button>
        </div>
      </PageSection>

      {/* Reconciliation Results */}
      {hasReconciled && balanceData && (
        <>
          {/* Balance Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Statement Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {formatAmount(statementBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  As of {formatDate(reconciledDate)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Calculated Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {formatAmount(balanceData.calculatedBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Opening: {formatAmount(balanceData.openingBalance)}
                </p>
              </CardContent>
            </Card>

            <Card className={`border ${varianceBgClass}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Variance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold tabular-nums ${varianceColorClass}`}>
                  {variance !== null ? (variance >= 0 ? '+' : '') + formatAmount(variance) : '--'}
                </p>
                <p className={`text-xs mt-1 ${varianceColorClass}`}>
                  {varianceStatus === 'green' && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Reconciled
                    </span>
                  )}
                  {varianceStatus === 'amber' && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Minor variance ({variancePercentage !== null ? variancePercentage.toFixed(2) : '0'}%)
                    </span>
                  )}
                  {varianceStatus === 'red' && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Significant variance ({variancePercentage !== null ? variancePercentage.toFixed(2) : '0'}%)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Balance Breakdown */}
          <PageSection
            title="Balance Breakdown"
            description="How the calculated balance was derived"
            icon={Eye}
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Opening Balance</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(balanceData.openingBalance)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-sm font-semibold tabular-nums text-emerald-500">
                  +{formatAmount(balanceData.totalIncome)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Expenditure</p>
                <p className="text-sm font-semibold tabular-nums text-rose-500">
                  -{formatAmount(balanceData.totalExpenditure)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Capital Injections</p>
                <p className="text-sm font-semibold tabular-nums text-violet-500">
                  +{formatAmount(balanceData.capitalInjections)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Capital Drawings</p>
                <p className="text-sm font-semibold tabular-nums text-violet-500">
                  -{formatAmount(balanceData.capitalDrawings)}
                </p>
              </div>
            </div>
          </PageSection>

          {/* Summary Tips */}
          {varianceStatus !== 'green' && (
            <Card className="border-amber-500/25 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-500">
                  <Info className="w-4 h-4" />
                  Reconciliation Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {balanceData.uncategorizedCount > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">--</span>
                      You have <span className="font-medium text-foreground">{balanceData.uncategorizedCount}</span> uncategorized
                      transaction{balanceData.uncategorizedCount !== 1 ? 's' : ''} up to this date.
                      Uncategorized transactions may not be correctly included in the balance calculation.
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">--</span>
                    Check that capital movements are correctly classified as injections or drawings.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">--</span>
                    Verify there are no duplicate imports from your bank statements.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">--</span>
                    Ensure your opening balance is correct (currently {formatAmount(balanceData.openingBalance)}).
                    You can update it via <code className="text-xs bg-muted px-1 py-0.5 rounded">localStorage</code> key{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">herbarium-opening-balance</code>.
                  </li>
                  {variance !== null && variance < 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">--</span>
                      Your calculated balance is <span className="font-medium text-foreground">higher</span> than the
                      statement. This could indicate missing expenditures or over-reported income.
                    </li>
                  )}
                  {variance !== null && variance > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">--</span>
                      Your calculated balance is <span className="font-medium text-foreground">lower</span> than the
                      statement. This could indicate missing income or over-reported expenditures.
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Nearby Transactions */}
          <PageSection
            title="Recent Transactions"
            description={`Transactions in the 7 days leading up to ${formatDate(reconciledDate)} that may explain discrepancies`}
            icon={Flag}
            actions={
              nearbyTransactions && nearbyTransactions.length > 0 ? (
                <Badge variant="outline" className="text-xs">
                  {nearbyTransactions.length} transaction{nearbyTransactions.length !== 1 ? 's' : ''}
                </Badge>
              ) : undefined
            }
          >
            {isLoadingNearby ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-56 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : nearbyTransactions && nearbyTransactions.length > 0 ? (
              <div className="divide-y divide-border">
                {nearbyTransactions.map((tx) => {
                  const flagStatus = flaggedTransactions[tx.id] || 'none';
                  const isUncategorized = !tx.category_id;

                  return (
                    <div
                      key={tx.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3 first:pt-0 last:pb-0 ${
                        flagStatus === 'suspicious' ? 'bg-rose-500/5 -mx-6 px-6' :
                        flagStatus === 'verified' ? 'bg-emerald-500/5 -mx-6 px-6' : ''
                      }`}
                    >
                      {/* Left: description + date */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {tx.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tx.transaction_date)}
                          </p>
                          {isUncategorized && (
                            <Badge variant="outline" className="text-[10px] h-4 bg-amber-500/10 text-amber-500 border-amber-500/25">
                              Uncategorized
                            </Badge>
                          )}
                          {tx.category && (
                            <Badge variant="outline" className="text-[10px] h-4">
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-1 flex-shrink-0"
                                style={{ backgroundColor: tx.category.color }}
                              />
                              {tx.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Right: type, amount, flag button */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={
                            tx.type === 'income'
                              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25'
                              : tx.type === 'expenditure'
                              ? 'bg-rose-500/15 text-rose-500 border-rose-500/25'
                              : 'bg-violet-500/15 text-violet-500 border-violet-500/25'
                          }
                        >
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

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFlag(tx.id)}
                          className={`h-7 px-2 text-xs ${
                            flagStatus === 'verified'
                              ? 'text-emerald-500 hover:text-emerald-600'
                              : flagStatus === 'suspicious'
                              ? 'text-rose-500 hover:text-rose-600'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          title={
                            flagStatus === 'none'
                              ? 'Click to mark as verified'
                              : flagStatus === 'verified'
                              ? 'Click to mark as suspicious'
                              : 'Click to clear flag'
                          }
                        >
                          {flagStatus === 'verified' && <CheckCircle2 className="w-4 h-4" />}
                          {flagStatus === 'suspicious' && <AlertTriangle className="w-4 h-4" />}
                          {flagStatus === 'none' && <Flag className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions found in the 7 days before the statement date.
              </p>
            )}
          </PageSection>
        </>
      )}
    </PageLayout>
  );
}
