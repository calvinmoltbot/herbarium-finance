'use client';

import { useRecentTransactions } from '@/hooks/use-recent-transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, PoundSterling, Wallet } from 'lucide-react';

export function RecentTransactions() {
  const { data: transactions, isLoading, error } = useRecentTransactions();

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Recent Transactions
        </CardTitle>
        <CardDescription>Your latest financial activity</CardDescription>
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
                className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div
                    className={`p-2 rounded-full flex-shrink-0 ${
                      transaction.type === 'income'
                        ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
                        : transaction.type === 'capital'
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                    }`}
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
                      <p className="font-medium text-sm truncate">
                        {transaction.description || 'No description'}
                      </p>
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
