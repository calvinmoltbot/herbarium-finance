'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useIncomeTransactions, useExpenditureTransactions } from '@/hooks/use-income-transactions';
import { useCategories } from '@/hooks/use-categories';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function KPIDashboard() {
  const { data: incomeTransactions = [] } = useIncomeTransactions();
  const { data: expenditureTransactions = [] } = useExpenditureTransactions();
  useCategories();

  // Calculate KPIs and metrics
  const kpiData = useMemo(() => {
    const now = new Date();
    const currentMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Current month data
    const currentMonthIncome = incomeTransactions
      .filter(t => new Date(t.transaction_date) >= currentMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonthExpenditure = expenditureTransactions
      .filter(t => new Date(t.transaction_date) >= currentMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    // Last month data
    const lastMonthIncome = incomeTransactions
      .filter(t => {
        const date = new Date(t.transaction_date);
        return date >= lastMonth && date <= lastMonthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpenditure = expenditureTransactions
      .filter(t => {
        const date = new Date(t.transaction_date);
        return date >= lastMonth && date <= lastMonthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Total data
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenditure = expenditureTransactions.reduce((sum, t) => sum + t.amount, 0);
    const netProfit = totalIncome - totalExpenditure;

    // Calculate percentage changes
    const incomeChange = lastMonthIncome > 0 ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
    const expenditureChange = lastMonthExpenditure > 0 ? ((currentMonthExpenditure - lastMonthExpenditure) / lastMonthExpenditure) * 100 : 0;
    const profitChange = (currentMonthIncome - currentMonthExpenditure) - (lastMonthIncome - lastMonthExpenditure);

    // Profitability ratios
    const grossProfitMargin = totalIncome > 0 ? ((totalIncome - totalExpenditure) / totalIncome) * 100 : 0;
    const expenditureRatio = totalIncome > 0 ? (totalExpenditure / totalIncome) * 100 : 0;

    // Category breakdown for expenditure
    const expenditureByCategory = expenditureTransactions.reduce((acc, transaction) => {
      const categoryName = transaction.category?.name || 'Uncategorized';
      acc[categoryName] = (acc[categoryName] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    const topExpenseCategories = Object.entries(expenditureByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenditure > 0 ? (amount / totalExpenditure) * 100 : 0
      }));

    // Income streams
    const incomeByCategory = incomeTransactions.reduce((acc, transaction) => {
      const categoryName = transaction.category?.name || 'Uncategorized';
      acc[categoryName] = (acc[categoryName] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    const topIncomeStreams = Object.entries(incomeByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0
      }));

    // Monthly averages (last 3 months)
    const threeMonthsAgo = startOfMonth(subMonths(now, 2));
    [...incomeTransactions, ...expenditureTransactions]
      .filter(t => new Date(t.transaction_date) >= threeMonthsAgo);

    const monthlyAverages = {
      income: currentMonthIncome > 0 ? currentMonthIncome : (totalIncome / 3),
      expenditure: currentMonthExpenditure > 0 ? currentMonthExpenditure : (totalExpenditure / 3)
    };

    return {
      currentMonth: {
        income: currentMonthIncome,
        expenditure: currentMonthExpenditure,
        profit: currentMonthIncome - currentMonthExpenditure
      },
      lastMonth: {
        income: lastMonthIncome,
        expenditure: lastMonthExpenditure,
        profit: lastMonthIncome - lastMonthExpenditure
      },
      changes: {
        income: incomeChange,
        expenditure: expenditureChange,
        profit: profitChange
      },
      totals: {
        income: totalIncome,
        expenditure: totalExpenditure,
        profit: netProfit
      },
      ratios: {
        grossProfitMargin,
        expenditureRatio
      },
      topExpenseCategories,
      topIncomeStreams,
      monthlyAverages
    };
  }, [incomeTransactions, expenditureTransactions]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Target className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = (change: number, isExpenditure = false) => {
    if (isExpenditure) {
      // For expenditure, decrease is good (green), increase is bad (red)
      if (change > 0) return 'text-red-600';
      if (change < 0) return 'text-green-600';
    } else {
      // For income, increase is good (green), decrease is bad (red)
      if (change > 0) return 'text-green-600';
      if (change < 0) return 'text-red-600';
    }
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-8 px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/reports" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Reports</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Key Performance Indicators</h1>
              <p className="text-muted-foreground">Financial metrics and performance analysis</p>
            </div>
          </div>
        </div>

        {/* Monthly Performance Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Monthly Income
                {getChangeIcon(kpiData.changes.income)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  £{kpiData.currentMonth.income.toLocaleString('en-GB')}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">vs last month:</span>
                  <span className={`text-sm font-medium ${getChangeColor(kpiData.changes.income)}`}>
                    {kpiData.changes.income > 0 ? '+' : ''}{kpiData.changes.income.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last month: £{kpiData.lastMonth.income.toLocaleString('en-GB')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Monthly Expenditure
                {getChangeIcon(kpiData.changes.expenditure)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-red-600">
                  £{kpiData.currentMonth.expenditure.toLocaleString('en-GB')}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">vs last month:</span>
                  <span className={`text-sm font-medium ${getChangeColor(kpiData.changes.expenditure, true)}`}>
                    {kpiData.changes.expenditure > 0 ? '+' : ''}{kpiData.changes.expenditure.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last month: £{kpiData.lastMonth.expenditure.toLocaleString('en-GB')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Monthly Profit
                {kpiData.changes.profit > 0 ? 
                  <TrendingUp className="h-4 w-4 text-green-600" /> : 
                  <TrendingDown className="h-4 w-4 text-red-600" />
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`text-2xl font-bold ${kpiData.currentMonth.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  £{Math.abs(kpiData.currentMonth.profit).toLocaleString('en-GB')}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">vs last month:</span>
                  <span className={`text-sm font-medium ${kpiData.changes.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {kpiData.changes.profit >= 0 ? '+' : ''}£{Math.abs(kpiData.changes.profit).toLocaleString('en-GB')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last month: £{Math.abs(kpiData.lastMonth.profit).toLocaleString('en-GB')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Ratios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Financial Ratios & Metrics</CardTitle>
            <CardDescription>Key performance indicators for business health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {kpiData.ratios.grossProfitMargin.toFixed(1)}%
                </div>
                <div className="text-sm text-blue-800 font-medium">Net Profit Margin</div>
                <div className="text-xs text-blue-600 mt-1">
                  {kpiData.ratios.grossProfitMargin >= 20 ? 'Excellent' : 
                   kpiData.ratios.grossProfitMargin >= 10 ? 'Good' : 
                   kpiData.ratios.grossProfitMargin >= 0 ? 'Fair' : 'Needs Attention'}
                </div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  £{kpiData.totals.income.toLocaleString('en-GB')}
                </div>
                <div className="text-sm text-green-800 font-medium">Total Revenue</div>
                <div className="text-xs text-green-600 mt-1">All-time income</div>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {kpiData.ratios.expenditureRatio.toFixed(1)}%
                </div>
                <div className="text-sm text-red-800 font-medium">Expenditure Ratio</div>
                <div className="text-xs text-red-600 mt-1">
                  {kpiData.ratios.expenditureRatio <= 70 ? 'Excellent' : 
                   kpiData.ratios.expenditureRatio <= 85 ? 'Good' : 
                   kpiData.ratios.expenditureRatio <= 95 ? 'Fair' : 'High'}
                </div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  £{kpiData.monthlyAverages.income.toLocaleString('en-GB')}
                </div>
                <div className="text-sm text-purple-800 font-medium">Avg Monthly Income</div>
                <div className="text-xs text-purple-600 mt-1">Recent average</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Categories Analysis */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Top Income Streams */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-green-900">Top Income Streams</CardTitle>
              <CardDescription>Highest revenue generating categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpiData.topIncomeStreams.map((stream, index) => (
                  <div key={stream.category} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-800 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-green-900">{stream.category}</div>
                        <div className="text-sm text-green-700">{stream.percentage.toFixed(1)}% of total income</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-800">£{stream.amount.toLocaleString('en-GB')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Expense Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-red-900">Top Expense Categories</CardTitle>
              <CardDescription>Highest spending categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpiData.topExpenseCategories.map((expense, index) => (
                  <div key={expense.category} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-800 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-red-900">{expense.category}</div>
                        <div className="text-sm text-red-700">{expense.percentage.toFixed(1)}% of total expenses</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-800">£{expense.amount.toLocaleString('en-GB')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <AlertCircle className="h-6 w-6 mr-2 text-amber-600" />
              Performance Insights
            </CardTitle>
            <CardDescription>Automated analysis and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Positive Indicators</h4>
                <div className="space-y-2">
                  {kpiData.ratios.grossProfitMargin > 0 && (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">Business is profitable</span>
                    </div>
                  )}
                  {kpiData.changes.income > 0 && (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">Income growing month-over-month</span>
                    </div>
                  )}
                  {kpiData.changes.expenditure < 0 && (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">Expenses decreasing</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Areas for Attention</h4>
                <div className="space-y-2">
                  {kpiData.ratios.grossProfitMargin < 0 && (
                    <div className="flex items-center p-3 bg-red-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-sm text-red-800">Business showing losses</span>
                    </div>
                  )}
                  {kpiData.changes.income < -10 && (
                    <div className="flex items-center p-3 bg-amber-50 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-amber-600 mr-2" />
                      <span className="text-sm text-amber-800">Significant income decline</span>
                    </div>
                  )}
                  {kpiData.ratios.expenditureRatio > 90 && (
                    <div className="flex items-center p-3 bg-amber-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                      <span className="text-sm text-amber-800">High expenditure ratio</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
