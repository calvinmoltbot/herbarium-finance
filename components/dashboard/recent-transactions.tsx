'use client';

import { useRecentTransactions } from '@/hooks/use-recent-transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calendar, PoundSterling, Wallet, Tag } from 'lucide-react';
import { useCategorizationPatterns } from '@/hooks/use-categorization-patterns';
import { useNicknameMode } from '@/hooks/use-nickname-mode';
import { PatternMatcher } from '@/lib/pattern-matcher';

export function RecentTransactions() {
  const { data: transactions, isLoading, error } = useRecentTransactions();
  const { patterns } = useCategorizationPatterns();
  const { showNicknames, toggleNicknames } = useNicknameMode();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Your latest financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="h-6 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load transactions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center" style={{ color: '#e8e6e3' }}>
            <Calendar className="h-5 w-5 mr-2" />
            Recent Transactions
          </CardTitle>
          <Button
            variant={showNicknames ? 'default' : 'outline'}
            size="sm"
            onClick={toggleNicknames}
            className="flex items-center gap-2"
            style={showNicknames ? { backgroundColor: '#f59e0b', color: '#17151e' } : undefined}
          >
            <Tag className="h-4 w-4" />
            {showNicknames ? 'Nicknames On' : 'Nicknames'}
          </Button>
        </div>
        <CardDescription style={{ color: '#9794a8' }}>Your latest financial activity</CardDescription>
      </CardHeader>
      <CardContent>
        {!transactions || transactions.length === 0 ? (
          <div className="text-center py-8">
            <PoundSterling className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No transactions yet</p>
            <p className="text-sm text-muted-foreground">
              Start by adding your first income or expenditure
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-start justify-between p-3 rounded-lg transition-colors"
                style={{ borderBottom: '1px solid #2a2835' }}
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div
                    className="p-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: transaction.type === 'income' ? 'rgba(16,185,129,0.15)' : transaction.type === 'capital' ? 'rgba(124,58,237,0.15)' : 'rgba(244,63,94,0.15)',
                      color: transaction.type === 'income' ? '#10b981' : transaction.type === 'capital' ? '#7c3aed' : '#f43f5e',
                    }}
                  >
                    {transaction.type === 'income' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : transaction.type === 'capital' ? (
                      <Wallet className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col space-y-1">
                      {(() => {
                        const displayName = showNicknames
                          ? PatternMatcher.resolveDisplayName(transaction.description || '', patterns)
                          : null;
                        return displayName ? (
                          <>
                            <p className="font-bold text-sm truncate">{displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{transaction.description}</p>
                          </>
                        ) : (
                          <p className="font-medium text-sm truncate">
                            {transaction.description || 'No description'}
                          </p>
                        );
                      })()}
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString('en-GB')}
                        </p>
                        {transaction.category && (
                          <span
                            className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: transaction.category.color + '20',
                              color: transaction.category.color,
                            }}
                          >
                            {transaction.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p
                    className={`font-semibold text-sm ${
                      transaction.type === 'income'
                        ? 'text-green-600'
                        : transaction.type === 'capital'
                        ? 'text-purple-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : transaction.type === 'capital' ? '' : '-'}£{transaction.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
