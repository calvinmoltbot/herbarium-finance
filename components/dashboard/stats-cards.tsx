'use client';

import { TrendingUp, TrendingDown, PoundSterling, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { useDateFilter } from '@/lib/date-filter-context';

function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
}

function formatPercentage(percentage: number): string {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}

function getChangeDisplay(change: number, hasData: boolean) {
  if (!hasData) {
    return {
      text: 'No previous data',
      color: 'text-muted-foreground',
      icon: null,
    };
  }

  if (change > 0) {
    return {
      text: `${formatPercentage(change)} from last month`,
      color: 'text-green-600',
      icon: <TrendingUp className="h-3 w-3 text-green-600 mr-1" />,
    };
  } else if (change < 0) {
    return {
      text: `${formatPercentage(change)} from last month`,
      color: 'text-red-600',
      icon: <TrendingDown className="h-3 w-3 text-red-600 mr-1" />,
    };
  } else {
    return {
      text: 'No change from last month',
      color: 'text-muted-foreground',
      icon: null,
    };
  }
}

export function StatsCards() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { dateFilter } = useDateFilter();

  // Get dynamic labels based on date filter
  const getLabels = () => {
    switch (dateFilter) {
      case 'all-time':
        return {
          income: 'Total Income',
          expenditure: 'Total Expenditure',
          balance: 'Net Balance',
          bankPosition: 'Bank Position',
        };
      case 'year-to-date':
        return {
          income: 'YTD Income',
          expenditure: 'YTD Expenditure',
          balance: 'YTD Balance',
          bankPosition: 'YTD Bank Position',
        };
      case 'this-year':
        return {
          income: 'FY Income',
          expenditure: 'FY Expenditure',
          balance: 'FY Balance',
          bankPosition: 'FY Bank Position',
        };
      case 'this-month':
        return {
          income: 'This Month\'s Income',
          expenditure: 'This Month\'s Expenditure',
          balance: 'This Month\'s Balance',
          bankPosition: 'Bank Position',
        };
      case 'last-month':
        return {
          income: 'Last Month\'s Income',
          expenditure: 'Last Month\'s Expenditure',
          balance: 'Last Month\'s Balance',
          bankPosition: 'Bank Position',
        };
      case 'last-3-months':
        return {
          income: 'Last 3 Months Income',
          expenditure: 'Last 3 Months Expenditure',
          balance: 'Last 3 Months Balance',
          bankPosition: 'Bank Position',
        };
      default:
        return {
          income: 'Income',
          expenditure: 'Expenditure',
          balance: 'Balance',
          bankPosition: 'Bank Position',
        };
    }
  };

  const labels = getLabels();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading stats: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    totalIncome = 0,
    totalExpenditure = 0,
    netBalance = 0,
    totalCapitalIn = 0,
    totalCapitalOut = 0,
    bankBalance = 0,
    currentMonthIncome = 0,
    currentMonthExpenditure = 0,
    previousMonthIncome = 0,
    previousMonthExpenditure = 0,
    incomeChange = 0,
    expenditureChange = 0,
    balanceChange = 0,
  } = stats || {};

  // Use filtered data for display, but month-over-month comparison for changes
  const displayIncome = dateFilter === 'this-month' ? currentMonthIncome : totalIncome;
  const displayExpenditure = dateFilter === 'this-month' ? currentMonthExpenditure : totalExpenditure;
  const displayBalance = dateFilter === 'this-month' ? (currentMonthIncome - currentMonthExpenditure) : netBalance;

  const incomeChangeDisplay = getChangeDisplay(incomeChange, previousMonthIncome > 0);
  const expenditureChangeDisplay = getChangeDisplay(expenditureChange, previousMonthExpenditure > 0);
  const balanceChangeDisplay = getChangeDisplay(balanceChange, previousMonthIncome > 0 || previousMonthExpenditure > 0);

  const displayBankBalance = dateFilter === 'this-month'
    ? (currentMonthIncome - currentMonthExpenditure + totalCapitalIn - totalCapitalOut)
    : bankBalance;

  const capitalSubtitle = totalCapitalIn > 0 || totalCapitalOut > 0
    ? `+${formatCurrency(totalCapitalIn)} injections / -${formatCurrency(totalCapitalOut)} drawings`
    : 'No capital movements';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labels.income}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {formatCurrency(displayIncome)}
          </div>
          <div className="flex items-center mt-2">
            {incomeChangeDisplay.icon}
            <span className={`text-xs ${incomeChangeDisplay.color}`}>
              {incomeChangeDisplay.text}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labels.expenditure}
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {formatCurrency(displayExpenditure)}
          </div>
          <div className="flex items-center mt-2">
            {expenditureChangeDisplay.icon}
            <span className={`text-xs ${expenditureChangeDisplay.color}`}>
              {expenditureChangeDisplay.text}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labels.balance}
          </CardTitle>
          <PoundSterling className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold tabular-nums ${
            displayBalance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(displayBalance)}
          </div>
          <div className="flex items-center mt-2">
            {balanceChangeDisplay.icon}
            <span className={`text-xs ${balanceChangeDisplay.color}`}>
              {balanceChangeDisplay.text}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labels.bankPosition}
          </CardTitle>
          <Landmark className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold tabular-nums ${
            displayBankBalance >= 0 ? 'text-blue-600' : 'text-red-600'
          }`}>
            {formatCurrency(displayBankBalance)}
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {capitalSubtitle}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
